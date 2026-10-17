package com.complianceos.compliance.core.service;

import com.agentengine.agent.api.model.UserMessage;
import com.agentengine.agent.api.services.RuntimeService;
import com.agentengine.catalog.api.services.AgentService;
import com.agentengine.util.agents.beans.config.BaseAgentConfig;
import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.utils.ResourceUtils;
import com.agentengine.util.context.Context;
import com.agentengine.util.infra.ServerType;
import com.agentengine.util.infra.provisioning.ProvisioningRequest;
import com.agentengine.util.infra.provisioning.ProvisioningResult;
import com.agentengine.util.infra.provisioning.ProvisioningRun;
import com.agentengine.util.mongodb.mongo.MongoClientProvisioner;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.agentengine.util.ms.client.MicroServiceProvisioner;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.services.ComplianceProvisioningService;
import com.complianceos.compliance.api.services.MiningService;
import com.fasterxml.jackson.core.type.TypeReference;
import io.quarkus.arc.Unremovable;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
@Unremovable
public class ComplianceProvisioningServiceImpl implements ComplianceProvisioningService {

  private static final Logger LOG = LoggerFactory.getLogger(ComplianceProvisioningServiceImpl.class);
  private static final String SERVICE_NAME = "compliance";
  private static final String ROYALTY_RATES_KEY = "royaltyRates";
  private static final String DMF_RATES_KEY = "dmfRates";
  private static final String NMET_RATES_KEY = "nmetRates";
  private static final String ROYALTY_RATE_RESEARCH_AGENT_RESOURCE =
      "royalty_rate_research_agent.json";
  private static final String ROYALTY_RATE_RESEARCH_KICKOFF =
      "Research Gujarat's current mineral royalty rates and report your findings.";

  private final MongoClientProvisioner mongoClientProvisioner;
  private final MicroServiceProvisioner microServiceProvisioner;
  private final MiningService miningService;
  private final MicroServiceClientProvider microServiceClientProvider;

  @Inject
  public ComplianceProvisioningServiceImpl(
      final MongoClientProvisioner mongoClientProvisioner,
      final MicroServiceProvisioner microServiceProvisioner,
      final MiningService miningService,
      final MicroServiceClientProvider microServiceClientProvider) {
    this.mongoClientProvisioner = mongoClientProvisioner;
    this.microServiceProvisioner = microServiceProvisioner;
    this.miningService = miningService;
    this.microServiceClientProvider = microServiceClientProvider;
  }

  @Override
  public ProvisioningResult provisionEnvironment(final ProvisioningRequest request) {
    final ProvisioningRun run = new ProvisioningRun();
    run.step(
        "microservice",
        () ->
            microServiceProvisioner.provision(
                Context.SYSTEM_CUSTOMER_ID,
                SERVICE_NAME,
                request.getServer(ServerType.MICROSERVICE_SERVER, SERVICE_NAME)));
    run.step("royalty-rates", () -> saveRoyaltyRates(request));
    run.step("dmf-rates", () -> saveDmfRates(request));
    run.step("nmet-rates", () -> saveNmetRates(request));
    run.step("royalty-rate-research-agent", this::triggerRoyaltyRateResearchAgent);
    return run.result();
  }

  /**
   * Seeds the royalty rate research agent under the system customer — royalty rates are
   * environment-wide, not any one customer's data, so the agent researching them is too — and
   * starts it once. It only researches and reports; nothing it finds is applied automatically.
   *
   * <p>Relies on the agent service's own environment provisioning (event-store, microservice
   * registration) having already run — guaranteed by {@link
   * com.agentengine.agent.core.services.AgentProvisioningServiceImpl#order} running ahead of
   * every other service's. A failure here is logged, not thrown, since nothing else depends on
   * this succeeding.
   */
  private void triggerRoyaltyRateResearchAgent() {
    try {
      final BaseAgentConfig agentConfig =
          JsonUtils.fromJson(
              ResourceUtils.loadResourceAsString(ROYALTY_RATE_RESEARCH_AGENT_RESOURCE),
              BaseAgentConfig.class);
      final AgentService agentService = microServiceClientProvider.getRaw(AgentService.class);
      agentService.saveAgent(agentConfig, true);
      microServiceClientProvider
          .getRaw(RuntimeService.class)
          .invoke(agentConfig.getId(), null, UserMessage.ofText(ROYALTY_RATE_RESEARCH_KICKOFF));
    } catch (final Exception exception) {
      LOG.warn("Failed to start the royalty rate research agent", exception);
    }
  }

  private void saveRoyaltyRates(final ProvisioningRequest request) {
    final List<RoyaltyRate> rates =
        ratesFrom(request, ROYALTY_RATES_KEY, new TypeReference<List<RoyaltyRate>>() {});
    for (final RoyaltyRate rate : rates) {
      miningService.saveRoyaltyRate(rate);
    }
  }

  private void saveDmfRates(final ProvisioningRequest request) {
    final List<DmfRate> rates =
        ratesFrom(request, DMF_RATES_KEY, new TypeReference<List<DmfRate>>() {});
    for (final DmfRate rate : rates) {
      miningService.saveDmfRate(rate);
    }
  }

  private void saveNmetRates(final ProvisioningRequest request) {
    final List<NmetRate> rates =
        ratesFrom(request, NMET_RATES_KEY, new TypeReference<List<NmetRate>>() {});
    for (final NmetRate rate : rates) {
      miningService.saveNmetRate(rate);
    }
  }

  private static <T> List<T> ratesFrom(
      final ProvisioningRequest request, final String key, final TypeReference<List<T>> type) {
    final Object raw = request.getAdditional().get(key);
    return raw == null ? List.of() : JsonUtils.copyMapper().convertValue(raw, type);
  }

  @Override
  public ProvisioningResult provision(final ProvisioningRequest request) {
    final String customerId = Context.requireCustomerId();
    final ProvisioningRun run = new ProvisioningRun();
    run.step(
        "mongo",
        () ->
            mongoClientProvisioner.provision(
                ComplianceDocumentStoreClientType.COMPLIANCE,
                customerId,
                request.getServer(
                    ServerType.MONGO_SERVER, ComplianceDocumentStoreClientType.COMPLIANCE.name())));
    run.step(
        "microservice",
        () ->
            microServiceProvisioner.provision(
                customerId,
                SERVICE_NAME,
                request.getServer(ServerType.MICROSERVICE_SERVER, SERVICE_NAME)));
    return run.result();
  }
}
