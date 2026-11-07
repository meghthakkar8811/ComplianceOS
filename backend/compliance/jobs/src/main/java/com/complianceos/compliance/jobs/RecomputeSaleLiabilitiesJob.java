package com.complianceos.compliance.jobs;

import com.agentengine.scheduler.api.runner.Job;
import com.agentengine.scheduler.api.runner.JobContext;
import com.agentengine.scheduler.api.runner.JobResult;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.Query;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.services.MiningService;

/**
 * Catches a recent sale left with a stale royalty/DMF/NMET/GST liability — by a rate change, a
 * crash partway through one, or anything else — regardless of what caused it: re-derives every
 * active mine's recent sales (see {@link MiningService#recomputeSaleLiabilities}) from whichever
 * rate is currently in force and fixes any mismatch. Self-healing by design, so nothing elsewhere
 * needs to reliably notice a rate change for this to stay correct. Scheduled for every customer
 * when it is provisioned.
 */
public final class RecomputeSaleLiabilitiesJob extends Job {

  public RecomputeSaleLiabilitiesJob(final JobContext context) {
    super(context);
  }

  @Override
  public JobResult run() {
    final MiningService miningService = service(MiningService.class);
    miningService
        .findMines(new Query().withFilter(Filters.eq(Mine.FIELD_ACTIVE, true)).withPage(Page.UNBOUNDED))
        .getItems()
        .forEach(mine -> miningService.recomputeSaleLiabilities(mine.getId()));
    return JobResult.empty();
  }
}
