package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.ExMinePriceOverride;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

/**
 * Ex-mine price overrides are not independently permissioned — reached only through their mine —
 * so {@code MiningService} filters every result to what the caller may read, the same way a
 * {@code @Permissioned} entity's own repository would via its ACL.
 */
@Singleton
public class ExMinePriceOverrideAssetHandler implements AssetHandler<ExMinePriceOverride> {

  private final MiningService service;

  @Inject
  public ExMinePriceOverrideAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.EX_MINE_PRICE_OVERRIDE;
  }

  @Override
  public PaginatedResult<ExMinePriceOverride> findAssets(final AssetRequest request) {
    return service.findExMinePriceOverrides(request.getQuery());
  }

  @Override
  public Map<String, ExMinePriceOverride> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getExMinePriceOverrides(request.getKeys());
  }
}
