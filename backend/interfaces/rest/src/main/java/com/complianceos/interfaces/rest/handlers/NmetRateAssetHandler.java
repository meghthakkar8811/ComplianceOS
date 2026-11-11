package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

/** NMET rates are global reference data with no mine scoping. */
@Singleton
public class NmetRateAssetHandler implements AssetHandler<NmetRate> {

  private final MiningService service;

  @Inject
  public NmetRateAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.NMET_RATE;
  }

  @Override
  public PaginatedResult<NmetRate> findAssets(final AssetRequest request) {
    return service.findNmetRates(request.getQuery());
  }

  @Override
  public Map<String, NmetRate> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getNmetRates(CollectionUtils.nullSafeList(request.getKeys()));
  }
}

