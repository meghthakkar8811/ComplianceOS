package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.GstRate;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** GST rates are global reference data with no mine scoping, so this needs no access check. */
@Singleton
public class GstRateAssetHandler implements AssetHandler<GstRate> {

  private final MiningService service;

  @Inject
  public GstRateAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.GST_RATE;
  }

  @Override
  public PaginatedResult<GstRate> findAssets(final AssetRequest request) {
    return service.findGstRates(request.getQuery());
  }

  @Override
  public Map<String, GstRate> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    final Set<String> keys = new HashSet<>(request.getKeys());
    return service.findGstRates(null).getItems().stream()
        .filter(rate -> keys.contains(rate.getId()))
        .collect(Collectors.toMap(GstRate::getId, Function.identity()));
  }
}
