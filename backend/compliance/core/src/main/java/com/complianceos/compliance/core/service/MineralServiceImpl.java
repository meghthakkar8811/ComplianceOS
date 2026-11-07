package com.complianceos.compliance.core.service;

import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.exception.UnauthorizedException;
import com.agentengine.util.common.query.Filter;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.common.utils.ResourceUtils;
import com.agentengine.util.tenancy.Permission;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.MineralRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Singleton
public class MineralServiceImpl implements MineralService {

  private static final String MINERALS_RESOURCE = "minerals.json";

  private final LoadingCache<Boolean, List<Mineral>> mineralCatalogCache =
      CacheBuilder.newBuilder()
          .build(
              CacheLoader.from(
                  ignored -> {
                    final List<Mineral> catalog =
                        JsonUtils.fromJson(
                            ResourceUtils.loadResourceAsString(MINERALS_RESOURCE), new TypeReference<>() {});
                    catalog.forEach(entry -> entry.setId(entry.getMineral()));
                    return catalog;
                  }));

  private final MineRepository mineRepository;
  private final MineralRepository mineralRepository;

  @Inject
  public MineralServiceImpl(
      final MineRepository mineRepository,
      final MineralRepository mineralRepository) {
    this.mineRepository = mineRepository;
    this.mineralRepository = mineralRepository;
  }

  @Override
  public Mineral saveMineral(final String mineId, final Mineral mineral, final boolean skipVersion) {
    requireMineEdit(mineId);
    mineral.setMineId(mineId);
    mineral.setId(Mineral.id(mineId, mineral.getMineral()));
    return skipVersion ? mineralRepository.saveIgnoringVersion(mineral) : mineralRepository.save(mineral);
  }

  @Override
  public Map<String, Mineral> getMinerals(final String mineId, final List<String> ids) {
    if (CollectionUtils.isEmpty(ids) || !mineRepository.hasPermission(mineId, Permission.READ)) {
      return Map.of();
    }
    return mineralRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> mineId.equals(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<Mineral> findMinerals(final String mineId, final Query query) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return PaginatedResult.empty();
    }
    final Query source = query == null ? new Query() : query;
    final Filter mineFilter = Filters.eq(Mineral.FIELD_MINE_ID, mineId);
    final Filter combined =
        source.getFilter() == null ? mineFilter : Filters.and(source.getFilter(), mineFilter);
    return mineralRepository.findByQuery(new Query(source).withFilter(combined));
  }

  @Override
  public List<Mineral> getPlatformMinerals() {
    return mineralCatalogCache.getUnchecked(Boolean.TRUE);
  }

  @Override
  public List<String> getPlatformMineralGrades(final String mineral) {
    return mineralCatalogCache.getUnchecked(Boolean.TRUE).stream()
        .filter(entry -> entry.getMineral().equals(mineral))
        .findFirst()
        .map(Mineral::getGrades)
        .map(grades -> grades.stream().map(Mineral.MineralGrade::getName).toList())
        .orElse(List.of());
  }

  /**
   * Mineral is not independently permissioned: it is reached only through its mine, so every
   * write requires the caller to hold {@code EDIT} on its mine.
   */
  private void requireMineEdit(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.EDIT)) {
      throw new UnauthorizedException(AssetClass.MINE, mineId);
    }
  }
}
