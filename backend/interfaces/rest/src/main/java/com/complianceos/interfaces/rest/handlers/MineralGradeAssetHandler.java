package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.beans.NamedEntity;
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
 * The grades {@code mineral} (an option, not a query filter — see {@link
 * AssetRequest#getOptions()}) offers: when {@code mineId} is also present, {@code mineral} is a
 * specific mine's {@link Mineral} record id (its own {@code Mineral.mineral}'s lookup scopes it
 * that way), so the grades are that record's own; otherwise {@code mineral} is a bare platform
 * mineral name (the platform catalog's own {@code Mineral.MineralGrade.name} lookup scopes it
 * that way), so the grades are the platform's standard ones for it.
 */
@Singleton
public class MineralGradeAssetHandler implements AssetHandler<NamedEntity> {

  private final MineralService service;

  @Inject
  public MineralGradeAssetHandler(final MineralService service) {
    this.service = service;
  }

  @Override
  public String getAssetType() {
    return AssetClass.MINERAL_GRADE;
  }

  @Override
  public PaginatedResult<NamedEntity> findAssets(final AssetRequest request) {
    final String mineId = CollectionUtils.getStringValueFromMap(request.getOptions(), "mineId");
    final String mineral = CollectionUtils.getStringValueFromMap(request.getOptions(), "mineral");
    if (mineral == null) {
      return PaginatedResult.create(List.of());
    }
    final List<String> gradeNames = mineId == null ? service.getPlatformMineralGrades(mineral) : mineGradeNames(mineId, mineral);
    final List<NamedEntity> grades = gradeNames.stream().map(name -> new NamedEntity(name, name)).toList();
    final Query query = request.getQuery();
    return PaginatedResult.create(grades, query == null ? Page.UNBOUNDED : query.getPage(), (long) grades.size());
  }

  @Override
  public Map<String, NamedEntity> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return request.getKeys().stream().collect(Collectors.toMap(id -> id, id -> new NamedEntity(id, id)));
  }

  private List<String> mineGradeNames(final String mineId, final String mineralId) {
    final Mineral mineral = service.getMinerals(mineId, List.of(mineralId)).get(mineralId);
    return mineral == null || mineral.getGrades() == null
        ? List.of()
        : mineral.getGrades().stream().map(Mineral.MineralGrade::getName).toList();
  }
}
