package com.complianceos.compliance.core.services;

import com.agentengine.util.common.repository.EntityChange;
import com.agentengine.util.common.repository.EntityChangeListener;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Set;

/**
 * Seeds a newly created mine's DGMS registers and compliance calendar immediately, so they're
 * visible to the user without waiting for the periodic compliance calendar job's next run — see
 * {@link MiningService#ensureComplianceRecords}, which that job also calls, as the one place this
 * logic lives. {@code ensureComplianceRecords} only needs a mine's id, so both shapes a creation
 * can arrive in — the full entity, or just its id — are handled the same way.
 */
@Singleton
public class MineChangeListener implements EntityChangeListener<Mine> {

  private final MiningService miningService;

  @Inject
  public MineChangeListener(final MiningService miningService) {
    this.miningService = miningService;
  }

  @Override
  public Class<Mine> entityClass() {
    return Mine.class;
  }

  @Override
  public void onChange(final EntityChange<Mine> change) {
    if (change.type() != EntityChange.Type.CREATED) {
      return;
    }
    final Set<String> mineIds =
        switch (change) {
          case EntityChange.Entities<Mine> entities -> entities.idVsEntity().keySet();
          case EntityChange.Ids<Mine> ids -> ids.ids();
        };
    for (final String mineId : mineIds) {
      miningService.ensureComplianceRecords(mineId);
    }
  }
}
