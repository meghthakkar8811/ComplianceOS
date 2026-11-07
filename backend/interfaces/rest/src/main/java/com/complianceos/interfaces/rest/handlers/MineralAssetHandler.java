package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.utils.CollectionUtils;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.services.MineralService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * {@code mineral}'s lookup: when {@code mineId} (an option, not a query filter — see {@link
 * AssetRequest#getOptions()}) is present, the mine's own {@link Mineral} records (not
 * independently permissioned — reached only through their mine, so {@code MineralService}
 * filters to what the caller may read); otherwise the platform's full mineral catalog, for
 * picking which mineral a brand-new {@link Mineral} record should track.
 */
@Singleton
public class MineralAssetHandler implements AssetHandler<Mineral> {

  private final MineralService service;

  @Inject
  public MineralAssetHandler(final MineralService service) {
    this.service = service;
  }

  @Override
  public String getAssetType() {
    return AssetClass.MINERAL;
  }

  @Override
  public PaginatedResult<Mineral> findAssets(final AssetRequest request) {
    final String mineId = CollectionUtils.getStringValueFromMap(request.getOptions(), "mineId");
    if (mineId != null) {
      return service.findMinerals(mineId, request.getQuery());
    }
    final List<Mineral> catalog = service.getPlatformMinerals();
    final Query query = request.getQuery();
    return PaginatedResult.create(catalog, query == null ? Page.UNBOUNDED : query.getPage(), (long) catalog.size());
  }

  @Override
  public Map<String, Mineral> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    final String mineId = CollectionUtils.getStringValueFromMap(request.getOptions(), "mineId");
    if (mineId != null) {
      return service.getMinerals(mineId, request.getKeys());
    }
    final Map<String, Mineral> catalogById =
        service.getPlatformMinerals().stream().collect(Collectors.toMap(Mineral::getId, mineral -> mineral));
    return request.getKeys().stream()
        .filter(catalogById::containsKey)
        .collect(Collectors.toMap(id -> id, catalogById::get));
  }
}
