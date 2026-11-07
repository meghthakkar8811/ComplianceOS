package com.complianceos.compliance.core.service;

import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.exception.UnauthorizedException;
import com.agentengine.util.common.query.Filter;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.common.utils.ResourceUtils;
import com.agentengine.util.tenancy.Permission;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.ExMineMineralPrice;
import com.complianceos.compliance.api.beans.ExMineMineralPriceSource;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.StockBalance;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.core.repository.MineralRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.ProductionEntryRepository;
import com.complianceos.compliance.core.repository.SaleRepository;
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

  // Loaded lazily, on first use, rather than eagerly at class-load time: reading and parsing a
  // resource is IO this class shouldn't pay for just to be loaded by the JVM. Each entry's
  // mineId, and each grade's openingStock/openingPricePerUnit, are absent in minerals.json and so
  // stay null — those are mine-specific, meaningless for the platform's own catalog of minerals.
  // Each entry's own id is set to its mineral name — deterministic, and the only sensible id a
  // mine-less catalog entry can have.
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
  private final ProductionEntryRepository productionEntryRepository;
  private final SaleRepository saleRepository;

  @Inject
  public MineralServiceImpl(
      final MineRepository mineRepository,
      final MineralRepository mineralRepository,
      final ProductionEntryRepository productionEntryRepository,
      final SaleRepository saleRepository) {
    this.mineRepository = mineRepository;
    this.mineralRepository = mineralRepository;
    this.productionEntryRepository = productionEntryRepository;
    this.saleRepository = saleRepository;
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

  /** {@code mineral} is a {@link Mineral} id; {@code grade} one of its own grade names. */
  @Override
  public StockBalance getStockBalance(final String mineId, final String mineral, final String grade) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new StockBalance(0, 0, 0, 0);
    }
    final double openingStock = openingStockFor(mineral, grade);
    final double production =
        productionEntryRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(ProductionEntry.FIELD_MINE_ID, mineId),
                            Filters.eq(ProductionEntry.FIELD_MINERAL, mineral),
                            Filters.eq(ProductionEntry.FIELD_GRADE, grade)))
                    .withPage(Page.UNBOUNDED))
            .getItems()
            .stream()
            .mapToDouble(ProductionEntry::getQuantity)
            .sum();
    final double dispatched =
        saleRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(Sale.FIELD_MINE_ID, mineId),
                            Filters.eq(Sale.FIELD_MINERAL, mineral),
                            Filters.eq(Sale.FIELD_GRADE, grade)))
                    .withPage(Page.UNBOUNDED))
            .getItems()
            .stream()
            .mapToDouble(Sale::getQuantity)
            .sum();
    return new StockBalance(openingStock, production, dispatched, openingStock + production - dispatched);
  }

  /** {@code mineral} is a {@link Mineral} id; {@code grade} one of its own grade names. */
  @Override
  public ExMineMineralPrice getExMineMineralPrice(final String mineId, final String mineral, final String grade) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new ExMineMineralPrice(0, ExMineMineralPriceSource.NONE.name());
    }
    final List<Sale> sales =
        saleRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(Sale.FIELD_MINE_ID, mineId),
                            Filters.eq(Sale.FIELD_MINERAL, mineral),
                            Filters.eq(Sale.FIELD_GRADE, grade)))
                    .withPage(Page.UNBOUNDED))
            .getItems();
    double totalExMineValue = 0;
    double totalQuantity = 0;
    for (final Sale sale : sales) {
      totalExMineValue += sale.getSaleValue() - sale.getDeductionPerUnit() * sale.getQuantity();
      totalQuantity += sale.getQuantity();
    }
    if (totalQuantity > 0) {
      return new ExMineMineralPrice(totalExMineValue / totalQuantity, ExMineMineralPriceSource.SALES.name());
    }
    final Double openingPrice = openingPricePerUnitFor(mineral, grade);
    return openingPrice == null
        ? new ExMineMineralPrice(0, ExMineMineralPriceSource.NONE.name())
        : new ExMineMineralPrice(openingPrice, ExMineMineralPriceSource.OVERRIDE.name());
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

  /** The grade's opening stock recorded on {@code mineral} (a {@link Mineral} id), or 0 if none is. */
  private double openingStockFor(final String mineral, final String grade) {
    final Mineral.MineralGrade mineralGrade = mineralGrade(mineral, grade);
    return mineralGrade == null || mineralGrade.getOpeningStock() == null ? 0 : mineralGrade.getOpeningStock();
  }

  /** The grade's opening ex-mine price recorded on {@code mineral} (a {@link Mineral} id), or null if none is. */
  private Double openingPricePerUnitFor(final String mineral, final String grade) {
    final Mineral.MineralGrade mineralGrade = mineralGrade(mineral, grade);
    return mineralGrade == null ? null : mineralGrade.getOpeningPricePerUnit();
  }

  private Mineral.MineralGrade mineralGrade(final String mineral, final String grade) {
    final Mineral mineralRecord = mineralRepository.findById(mineral);
    if (mineralRecord == null || mineralRecord.getGrades() == null) {
      return null;
    }
    return mineralRecord.getGrades().stream()
        .filter(mineralGrade -> grade.equals(mineralGrade.getName()))
        .findFirst()
        .orElse(null);
  }
}
