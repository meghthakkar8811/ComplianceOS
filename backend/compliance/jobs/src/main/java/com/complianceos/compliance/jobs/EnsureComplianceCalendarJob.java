package com.complianceos.compliance.jobs;

import com.agentengine.scheduler.api.runner.Job;
import com.agentengine.scheduler.api.runner.JobContext;
import com.agentengine.scheduler.api.runner.JobResult;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.Query;
import com.complianceos.compliance.api.services.MiningService;

/**
 * Keeps every active mine's DGMS registers and rolling compliance calendar topped up as time
 * passes — the recurring half of what {@code MineChangeListener} also seeds immediately on mine
 * creation; both call {@link MiningService#ensureComplianceRecords} so neither duplicates the
 * seeding logic. Scheduled for every customer when it is provisioned.
 */
public final class EnsureComplianceCalendarJob extends Job {

  public EnsureComplianceCalendarJob(final JobContext context) {
    super(context);
  }

  @Override
  public JobResult run() {
    final MiningService miningService = service(MiningService.class);
    miningService
        .findMines(new Query().withFilter(Filters.eq("isActive", true)).withPage(Page.UNBOUNDED))
        .getItems()
        .forEach(mine -> miningService.ensureComplianceRecords(mine.getId()));
    return JobResult.empty();
  }
}
