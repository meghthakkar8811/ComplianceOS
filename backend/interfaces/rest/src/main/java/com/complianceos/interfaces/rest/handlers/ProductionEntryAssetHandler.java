package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

/**
 * Production entries are not independently permissioned — reached only through their mine — so
 * {@code MiningService} filters every result to what the caller may read, the same way a
 * {@code @Permissioned} entity's own repository would via its ACL.
 */
@Singleton
public class ProductionEntryAssetHandler implements AssetHandler<ProductionEntry> {

  private final MiningService service;

  @Inject
  public ProductionEntryAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.PRODUCTION_ENTRY;
  }

  @Override
  public PaginatedResult<ProductionEntry> findAssets(final AssetRequest request) {
    return service.findProductionEntries(request.getQuery());
  }

  @Override
  public Map<String, ProductionEntry> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getProductionEntries(request.getKeys());
  }
}
