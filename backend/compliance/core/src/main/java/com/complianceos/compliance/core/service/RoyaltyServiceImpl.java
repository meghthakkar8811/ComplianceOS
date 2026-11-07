package com.complianceos.compliance.core.service;

import com.agentengine.util.common.query.AggregationFunction;
import com.agentengine.util.common.query.AggregationMetric;
import com.agentengine.util.common.query.AggregationQuery;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.query.Sort;
import com.agentengine.util.context.Context;
import com.agentengine.util.tenancy.Permission;
import com.complianceos.compliance.api.beans.DmfContribution;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.GstRate;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.MiningConstants;
import com.complianceos.compliance.api.beans.NmetContribution;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyGst;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.api.services.RoyaltyService;
import com.complianceos.compliance.core.repository.DmfRateRepository;
import com.complianceos.compliance.core.repository.GstRateRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.NmetRateRepository;
import com.complianceos.compliance.core.repository.RoyaltyRateRepository;
import com.complianceos.compliance.core.repository.SaleRepository;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Singleton
public class RoyaltyServiceImpl implements RoyaltyService {

  private static final String QUANTITY_ALIAS = "quantity";

  private final MineRepository mineRepository;
  private final SaleRepository saleRepository;
  private final MineralService mineralService;
  private final RoyaltyRateRepository royaltyRateRepository;
  private final DmfRateRepository dmfRateRepository;
  private final NmetRateRepository nmetRateRepository;
  private final GstRateRepository gstRateRepository;

  @Inject
  public RoyaltyServiceImpl(
      final MineRepository mineRepository,
      final SaleRepository saleRepository,
      final MineralService mineralService,
      final RoyaltyRateRepository royaltyRateRepository,
      final DmfRateRepository dmfRateRepository,
      final NmetRateRepository nmetRateRepository,
      final GstRateRepository gstRateRepository) {
    this.mineRepository = mineRepository;
    this.saleRepository = saleRepository;
    this.mineralService = mineralService;
    this.royaltyRateRepository = royaltyRateRepository;
    this.dmfRateRepository = dmfRateRepository;
    this.nmetRateRepository = nmetRateRepository;
    this.gstRateRepository = gstRateRepository;
  }

  @Override
  public List<Royalty> getRoyaltiesByMine(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    return periodsWithSales(mineId).stream().flatMap(period -> computeRoyalties(mineId, period).stream()).toList();
  }

  @Override
  public List<Royalty> getRoyalty(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    return computeRoyalties(mineId, periodOf(asOf));
  }

  @Override
  public List<DmfContribution> getDmfContributionsByMine(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    return periodsWithSales(mineId).stream()
        .map(period -> computeDmfContribution(mineId, period))
        .filter(Objects::nonNull)
        .toList();
  }

  @Override
  public DmfContribution getDmfContribution(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return null;
    }
    return computeDmfContribution(mineId, periodOf(asOf));
  }

  @Override
  public List<NmetContribution> getNmetContributionsByMine(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    return periodsWithSales(mineId).stream()
        .map(period -> computeNmetContribution(mineId, period))
        .filter(Objects::nonNull)
        .toList();
  }

  @Override
  public NmetContribution getNmetContribution(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return null;
    }
    return computeNmetContribution(mineId, periodOf(asOf));
  }

  @Override
  public List<RoyaltyGst> getRoyaltyGstByMine(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    return periodsWithSales(mineId).stream().flatMap(period -> computeRoyaltyGsts(mineId, period).stream()).toList();
  }

  @Override
  public List<RoyaltyGst> getRoyaltyGst(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    return computeRoyaltyGsts(mineId, periodOf(asOf));
  }

  /** Every period that has at least one {@link Sale} for {@code mineId}, most recent first. */
  private List<YearMonth> periodsWithSales(final String mineId) {
    return saleRepository
        .findByQuery(
            new Query().withFilter(Filters.eq(Sale.FIELD_MINE_ID, mineId)).withPage(Page.UNBOUNDED))
        .getItems()
        .stream()
        .map(sale -> periodOf(sale.getDispatchedOn()))
        .distinct()
        .sorted(Comparator.reverseOrder())
        .toList();
  }

  /**
   * The mine's royalty for {@code period}, one row per (mineral, grade) dispatched, computed
   * fresh from its {@link Sale} records — summed per (mineral, grade) by the database itself
   * rather than pulled raw and grouped here — and each mineral/grade's own applicable {@link
   * RoyaltyRate}; empty when the mine has no dispatches for the period at all.
   */
  private List<Royalty> royaltiesFor(final Mine mine, final YearMonth period) {
    final long periodStart = monthStartMillis(period);
    final long periodEnd = monthStartMillis(period.plusMonths(1));
    final AggregationQuery query =
        new AggregationQuery()
            .withFilter(
                Filters.and(
                    Filters.eq(Sale.FIELD_MINE_ID, mine.getId()),
                    Filters.gte(Sale.FIELD_DISPATCHED_ON, periodStart),
                    Filters.lt(Sale.FIELD_DISPATCHED_ON, periodEnd)))
            .withGroupByFields(List.of(Sale.FIELD_MINERAL, Sale.FIELD_GRADE))
            .withMetrics(List.of(new AggregationMetric(Sale.FIELD_QUANTITY, AggregationFunction.SUM, QUANTITY_ALIAS)));
    final List<Map<String, Object>> buckets = saleRepository.aggregate(query).getBuckets();
    if (buckets.isEmpty()) {
      return List.of();
    }
    final List<String> mineralIds = buckets.stream().map(bucket -> (String) bucket.get(Sale.FIELD_MINERAL)).toList();
    final Map<String, Mineral> minerals = mineralService.getMinerals(mine.getId(), mineralIds);
    final String month = period.getMonth().name();
    return buckets.stream()
        .map(
            bucket -> {
              final String mineralId = (String) bucket.get(Sale.FIELD_MINERAL);
              final String grade = (String) bucket.get(Sale.FIELD_GRADE);
              final Mineral mineralRecord = minerals.get(mineralId);
              final String mineral = mineralRecord == null ? null : mineralRecord.getMineral();
              final double quantity = ((Number) bucket.get(QUANTITY_ALIAS)).doubleValue();
              final RoyaltyRate rate = mineral == null ? null : royaltyRateFor(mine.getState(), mineral, grade, period);
              final double amount = rate == null ? 0 : quantity * rate.getRatePerTonne();
              return new Royalty(
                  Royalty.id(mine.getId(), period.getYear(), month, mineral, grade),
                  mine.getId(),
                  period.getYear(),
                  month,
                  mineral,
                  grade,
                  rate == null ? null : rate.getId(),
                  quantity,
                  amount);
            })
        .toList();
  }

  /**
   * The {@link RoyaltyRate} for {@code mineral}'s {@code grade} as of {@code period} — a
   * grade-specific rate if one was notified for this mineral, else the mineral-wide one that
   * applies across every grade.
   */
  private RoyaltyRate royaltyRateFor(
      final String state, final String mineral, final String grade, final YearMonth period) {
    // Royalty rates are environment-wide, stored under the system customer (see
    // MiningService#saveRoyaltyRate).
    return Context.asSystemCustomer()
        .get(
            () -> {
              final RoyaltyRate gradeRate =
                  royaltyRateRepository.findById(
                      RoyaltyRate.id(state, mineral, grade, period.getYear(), period.getMonth().name()));
              return gradeRate != null
                  ? gradeRate
                  : royaltyRateRepository.findById(
                      RoyaltyRate.id(state, mineral, null, period.getYear(), period.getMonth().name()));
            });
  }

  private List<Royalty> computeRoyalties(final String mineId, final YearMonth period) {
    final Mine mine = mineRepository.findById(mineId);
    return mine == null ? List.of() : royaltiesFor(mine, period);
  }

  /**
   * The mine's DMF contribution for {@code period}: the applicable {@link DmfRate} for the
   * mine's lease tier, against that period's total royalty amount across every mineral and
   * grade — null when the mine doesn't exist or has no dispatches for the period at all.
   */
  private DmfContribution computeDmfContribution(final String mineId, final YearMonth period) {
    final Mine mine = mineRepository.findById(mineId);
    if (mine == null) {
      return null;
    }
    final List<Royalty> royalties = royaltiesFor(mine, period);
    if (royalties.isEmpty()) {
      return null;
    }
    final String tier =
        mine.getLeaseStartOn() >= MiningConstants.DMF_RATE_CHANGE_CUTOFF
            ? MiningConstants.LEASE_TIER_POST_2015
            : MiningConstants.LEASE_TIER_PRE_2015;
    final DmfRate dmfRate = latestDmfRate(tier, monthStartMillis(period));
    final String month = period.getMonth().name();
    final double amount = dmfRate == null ? 0 : totalAmount(royalties) * dmfRate.getRate();
    return new DmfContribution(
        DmfContribution.id(mineId, period.getYear(), month),
        mineId,
        period.getYear(),
        month,
        dmfRate == null ? null : dmfRate.getId(),
        totalQuantity(royalties),
        amount);
  }

  /**
   * The mine's NMET contribution for {@code period}: the applicable {@link NmetRate}, against
   * that period's total royalty amount across every mineral and grade — null when the mine
   * doesn't exist or has no dispatches for the period at all.
   */
  private NmetContribution computeNmetContribution(final String mineId, final YearMonth period) {
    final Mine mine = mineRepository.findById(mineId);
    if (mine == null) {
      return null;
    }
    final List<Royalty> royalties = royaltiesFor(mine, period);
    if (royalties.isEmpty()) {
      return null;
    }
    final NmetRate nmetRate = latestNmetRate(monthStartMillis(period));
    final String month = period.getMonth().name();
    final double amount = nmetRate == null ? 0 : totalAmount(royalties) * nmetRate.getRate();
    return new NmetContribution(
        NmetContribution.id(mineId, period.getYear(), month),
        mineId,
        period.getYear(),
        month,
        nmetRate == null ? null : nmetRate.getId(),
        totalQuantity(royalties),
        amount);
  }

  /**
   * The GST owed under reverse charge on the mine's royalty for {@code period}, one row per
   * (mineral, grade) dispatched, matching {@link Royalty}'s own breakdown: each row's own royalty
   * amount against its mineral's applicable {@link GstRate} (not grade-differentiated) — empty
   * when the mine doesn't exist or has no dispatches for the period at all.
   */
  private List<RoyaltyGst> computeRoyaltyGsts(final String mineId, final YearMonth period) {
    final Mine mine = mineRepository.findById(mineId);
    if (mine == null) {
      return List.of();
    }
    final long asOf = monthStartMillis(period);
    final String month = period.getMonth().name();
    return royaltiesFor(mine, period).stream()
        .map(
            royalty -> {
              final GstRate gstRate = royalty.mineral() == null ? null : latestGstRate(royalty.mineral(), asOf);
              final double amount = gstRate == null ? 0 : royalty.amount() * gstRate.getRate();
              return new RoyaltyGst(
                  RoyaltyGst.id(mineId, period.getYear(), month, royalty.mineral(), royalty.grade()),
                  mineId,
                  period.getYear(),
                  month,
                  royalty.mineral(),
                  royalty.grade(),
                  gstRate == null ? null : gstRate.getId(),
                  amount);
            })
        .toList();
  }

  private static double totalQuantity(final List<Royalty> royalties) {
    return royalties.stream().mapToDouble(Royalty::quantity).sum();
  }

  private static double totalAmount(final List<Royalty> royalties) {
    return royalties.stream().mapToDouble(Royalty::amount).sum();
  }

  /** The {@link DmfRate} for {@code tier} effective as of {@code asOf}, or null if none is. */
  private DmfRate latestDmfRate(final String tier, final long asOf) {
    return Context.asSystemCustomer()
        .get(
            () ->
                dmfRateRepository
                    .findByQuery(
                        new Query()
                            .withFilter(
                                Filters.and(
                                    Filters.eq(DmfRate.FIELD_TIER, tier),
                                    Filters.lte(DmfRate.FIELD_EFFECTIVE_FROM, asOf)))
                            .withSort(new Sort(DmfRate.FIELD_EFFECTIVE_FROM, Sort.Order.DESC))
                            .withPage(new Page(0, 1)))
                    .getItems()
                    .stream()
                    .findFirst()
                    .orElse(null));
  }

  /** The {@link NmetRate} effective as of {@code asOf}, or null if none is. */
  private NmetRate latestNmetRate(final long asOf) {
    return Context.asSystemCustomer()
        .get(
            () ->
                nmetRateRepository
                    .findByQuery(
                        new Query()
                            .withFilter(Filters.lte(NmetRate.FIELD_EFFECTIVE_FROM, asOf))
                            .withSort(new Sort(NmetRate.FIELD_EFFECTIVE_FROM, Sort.Order.DESC))
                            .withPage(new Page(0, 1)))
                    .getItems()
                    .stream()
                    .findFirst()
                    .orElse(null));
  }

  /** The {@link GstRate} for {@code mineral} effective as of {@code asOf}, or null if none is. */
  private GstRate latestGstRate(final String mineral, final long asOf) {
    return Context.asSystemCustomer()
        .get(
            () ->
                gstRateRepository
                    .findByQuery(
                        new Query()
                            .withFilter(
                                Filters.and(
                                    Filters.eq(GstRate.FIELD_MINERAL, mineral),
                                    Filters.lte(GstRate.FIELD_EFFECTIVE_FROM, asOf)))
                            .withSort(new Sort(GstRate.FIELD_EFFECTIVE_FROM, Sort.Order.DESC))
                            .withPage(new Page(0, 1)))
                    .getItems()
                    .stream()
                    .findFirst()
                    .orElse(null));
  }

  private static YearMonth periodOf(final long entryTime) {
    return YearMonth.from(Instant.ofEpochMilli(entryTime).atZone(ZoneOffset.UTC));
  }

  private static long monthStartMillis(final YearMonth period) {
    return period.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
  }
}
