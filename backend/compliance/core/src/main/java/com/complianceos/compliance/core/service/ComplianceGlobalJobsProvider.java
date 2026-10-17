package com.complianceos.compliance.core.service;

import com.agentengine.scheduler.api.models.JobDefinition;
import com.agentengine.scheduler.api.runner.GlobalJobsProvider;
import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.utils.ResourceUtils;
import jakarta.inject.Singleton;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Keeps the royalty rate research agent's run cadence declarative rather than built in code: a
 * recurring refresh, read from {@code compliance-jobs.json}, plus a one-time kickoff shortly
 * after this environment is provisioned. The kickoff's {@code runAt} is the one piece built in
 * code rather than declared — it needs the current wall-clock time, which a static resource file
 * has no way to express. Royalty rates are environment-wide, not any one customer's data, which
 * is exactly what {@link GlobalJobsProvider} is for: these jobs run once overall, not per tenant.
 */
@Singleton
public class ComplianceGlobalJobsProvider implements GlobalJobsProvider {

  private static final String JOBS_RESOURCE = "compliance-jobs.json";
  private static final String ROYALTY_RATE_RESEARCH_AGENT_ID = "royalty_rate_research_agent";
  private static final String ROYALTY_RATE_RESEARCH_KICKOFF =
      "Research Gujarat's current mineral royalty rates and report your findings.";
  private static final long ROYALTY_RATE_RESEARCH_AGENT_KICKOFF_DELAY_MILLIS = 30_000L;

  @Override
  public List<JobDefinition> jobDefinitions() {
    final List<JobDefinition> definitions = new ArrayList<>();
    definitions.add(royaltyRateResearchAgentKickoff());
    definitions.addAll(declaredJobDefinitions());
    return definitions;
  }

  private static JobDefinition royaltyRateResearchAgentKickoff() {
    final JobDefinition definition = new JobDefinition();
    definition.setId("RoyaltyRateResearchAgentKickoff");
    definition.setJobClassName("com.agentengine.agent.jobs.InvokeAgentJob");
    definition.setRunAt(
        System.currentTimeMillis() + ROYALTY_RATE_RESEARCH_AGENT_KICKOFF_DELAY_MILLIS);
    definition.setPayload(
        Map.of("agentId", ROYALTY_RATE_RESEARCH_AGENT_ID, "message", ROYALTY_RATE_RESEARCH_KICKOFF));
    return definition;
  }

  @SuppressWarnings("unchecked")
  private static List<JobDefinition> declaredJobDefinitions() {
    final List<Map<String, Object>> raw =
        JsonUtils.fromJson(ResourceUtils.loadResourceAsString(JOBS_RESOURCE), List.class);
    return raw.stream().map(definition -> JsonUtils.fromMap(definition, JobDefinition.class)).toList();
  }
}
