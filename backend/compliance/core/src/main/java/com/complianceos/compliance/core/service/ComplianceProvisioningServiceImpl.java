package com.complianceos.compliance.core.service;

import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.context.Context;
import com.agentengine.util.infra.ServerType;
import com.agentengine.util.infra.provisioning.ProvisioningRequest;
import com.agentengine.util.infra.provisioning.ProvisioningResult;
import com.agentengine.util.infra.provisioning.ProvisioningRun;
import com.agentengine.util.mongodb.mongo.MongoClientProvisioner;
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

@Singleton
@Unremovable
public class ComplianceProvisioningServiceImpl implements ComplianceProvisioningService {

  private static final String SERVICE_NAME = "compliance";
  private static final String ROYALTY_RATES_KEY = "royaltyRates";
  private static final String DMF_RATES_KEY = "dmfRates";
  private static final String NMET_RATES_KEY = "nmetRates";

  private final MongoClientProvisioner mongoClientProvisioner;
  private final MicroServiceProvisioner microServiceProvisioner;
  private final MiningService miningService;

  @Inject
  public ComplianceProvisioningServiceImpl(
      final MongoClientProvisioner mongoClientProvisioner,
      final MicroServiceProvisioner microServiceProvisioner,
      final MiningService miningService) {
    this.mongoClientProvisioner = mongoClientProvisioner;
    this.microServiceProvisioner = microServiceProvisioner;
    this.miningService = miningService;
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
    return run.result();
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
