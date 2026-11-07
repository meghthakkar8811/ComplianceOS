package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

@Singleton
public class BuyerAssetHandler implements AssetHandler<Buyer> {

  private final MiningService service;

  @Inject
  public BuyerAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.BUYER;
  }

  @Override
  public PaginatedResult<Buyer> findAssets(final AssetRequest request) {
    return service.findBuyers(request.getQuery());
  }

  @Override
  public Map<String, Buyer> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getBuyers(request.getKeys());
  }
}
