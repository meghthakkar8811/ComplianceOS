package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.MineStoppage;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

/**
 * Stoppages are not independently permissioned — reached only through their mine — so {@code
 * MiningService} filters every result to what the caller may read, the same way a {@code
 * @Permissioned} entity's own repository would via its ACL.
 */
@Singleton
public class MineStoppageAssetHandler implements AssetHandler<MineStoppage> {

  private final MiningService service;

  @Inject
  public MineStoppageAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.MINE_STOPPAGE;
  }

  @Override
  public PaginatedResult<MineStoppage> findAssets(final AssetRequest request) {
    return service.findMineStoppages(request.getQuery());
  }

  @Override
  public Map<String, MineStoppage> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getMineStoppages(request.getKeys());
  }
}
