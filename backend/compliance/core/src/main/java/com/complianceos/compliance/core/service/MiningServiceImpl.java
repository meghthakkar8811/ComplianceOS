package com.complianceos.compliance.core.service;

import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.exception.UnauthorizedException;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.query.Sort;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.common.utils.ResourceUtils;
import com.agentengine.util.common.utils.StringUtils;
import com.agentengine.util.context.Context;
import com.agentengine.util.scripts.TemplateUtils;
import com.agentengine.util.scripts.templated.Template;
import com.agentengine.util.tenancy.Permission;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsRecordScore;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.MiningConstants;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.DgmsRecordStatus;
import com.complianceos.compliance.api.beans.DgmsVerdict;
import com.complianceos.compliance.api.beans.RecordType;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.services.MiningService;
import com.complianceos.compliance.core.repository.ComplianceRecordRepository;
import com.complianceos.compliance.core.repository.DmfRateRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.NmetRateRepository;
import com.complianceos.compliance.core.repository.ProductionEntryRepository;
import com.complianceos.compliance.core.repository.RoyaltyRateRepository;
import com.complianceos.compliance.core.repository.RoyaltyRepository;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Singleton
public class MiningServiceImpl implements MiningService {

  /**
   * How much each DGMS register counts toward the overall readiness score, reflecting how
   * serious a stale entry is: a late accident register is a bigger safety risk than a late
   * employment register.
   */
  private static final Map<String, Double> DGMS_REGISTER_WEIGHTS =
      Map.of(
          "ACCIDENT_REGISTER", 1.5,
          "SAFETY_COMMITTEE", 1.0,
          "EXPLOSIVE_CONSUMPTION", 1.0,
          "SHOTFIRER_COMPETENCY", 0.8,
          "FIRST_AID", 0.8,
          "MACHINERY_REGISTER", 1.0,
          "WEIGHBRIDGE_REGISTER", 1.0,
          "EMPLOYMENT_REGISTER", 0.9);

  private static final int GREEN_THRESHOLD = 70;
  private static final int AMBER_THRESHOLD = 40;
  private static final int GOOD_THRESHOLD = 80;
  private static final int NEEDS_ATTENTION_THRESHOLD = 50;

  /** How far ahead {@link #ensureComplianceRecords} keeps each mine's calendar populated. */
  private static final int CALENDAR_WINDOW_MONTHS = 12;

  // Fixed statutory registers a mine must keep current, each scored for DGMS readiness by how
  // overdue it is against maxDaysAllowed (see DGMS_REGISTER_WEIGHTS/getDgmsReadinessScore).
  // Resolved against `mine` so a future, confirmed condition on a register (e.g. only for a
  // mineType) is a change to this resource, not to this class.
  private static final Template<List<Map<String, Object>>> DGMS_REGISTERS =
      TemplateUtils.buildTemplate(
          JsonUtils.fromJson(
              ResourceUtils.loadResourceAsString("dgms_registers.json"), List.class));

  // Recurring filing obligations every mine owes, projected on a rolling CALENDAR_WINDOW_MONTHS
  // window (see ensureComplianceRecords). Deliberately short: only obligations confirmed against
  // the current rules are here — e.g. the monthly IBM return is the current MCDR 2017 F-series
  // (due the 1st of the following month), not the superseded "Form B" (5th); the half-yearly
  // report is the EIA Notification 2006 EC compliance report owed to MoEFCC (due 1 June/1 Dec),
  // not "SPCB" (due the 31st). Adding a newly-confirmed obligation, or a condition on an existing
  // one (e.g. only for a mineType, via `mine` in context), is a resource change, not a code change.
  private static final List<Map<String, Object>> DEADLINE_TEMPLATE_METADATA =
      JsonUtils.fromJson(
          ResourceUtils.loadResourceAsString("compliance_deadline_templates.json"), List.class);

  // Each entry resolved on its own, not as one list, since `expiry` needs that entry's specific
  // period (year/month/day/daysInMonth) in context — a field only ever sees the context passed to
  // it, never a sibling field's own resolved value, so `monthsOfYear`/`dayOfMonth` are read as
  // plain data from DEADLINE_TEMPLATE_METADATA instead (see ensureComplianceRecords) rather than
  // from here.
  private static final Map<String, Template<Map<String, Object>>> DEADLINE_TEMPLATES_BY_CODE =
      DEADLINE_TEMPLATE_METADATA.stream()
          .collect(
              Collectors.toMap(
                  entry -> CollectionUtils.getStringValueFromMap(entry, "code"),
                  TemplateUtils::buildTemplate));

  private final MineRepository mineRepository;
  private final ProductionEntryRepository productionEntryRepository;
  private final RoyaltyRepository royaltyRepository;
  private final RoyaltyRateRepository royaltyRateRepository;
  private final DmfRateRepository dmfRateRepository;
  private final NmetRateRepository nmetRateRepository;
  private final ComplianceRecordRepository complianceRecordRepository;

  @Inject
  public MiningServiceImpl(
      final MineRepository mineRepository,
      final ProductionEntryRepository productionEntryRepository,
      final RoyaltyRepository royaltyRepository,
      final RoyaltyRateRepository royaltyRateRepository,
      final DmfRateRepository dmfRateRepository,
      final NmetRateRepository nmetRateRepository,
      final ComplianceRecordRepository complianceRecordRepository) {
    this.mineRepository = mineRepository;
    this.productionEntryRepository = productionEntryRepository;
    this.royaltyRepository = royaltyRepository;
    this.royaltyRateRepository = royaltyRateRepository;
    this.dmfRateRepository = dmfRateRepository;
    this.nmetRateRepository = nmetRateRepository;
    this.complianceRecordRepository = complianceRecordRepository;
  }

  @Override
  public Mine saveMine(final Mine mine, final boolean skipVersion) {
    return skipVersion ? mineRepository.saveIgnoringVersion(mine) : mineRepository.save(mine);
  }

  @Override
  public Mine getMine(final String id) {
    return mineRepository.findById(id);
  }

  @Override
  public Map<String, Mine> getMines(final List<String> ids) {
    // Mine is @Permissioned, so findByIds already filters to what the caller may read.
    return mineRepository.findByIds(ids);
  }

  @Override
  public void deleteMine(final String id) {
    if (mineRepository.deleteByIdIgnoringVersion(id)) {
      productionEntryRepository.deleteByFilterIgnoringVersion(
          Filters.eq(ProductionEntry.FIELD_MINE_ID, id));
      royaltyRepository.deleteByFilterIgnoringVersion(Filters.eq(Royalty.FIELD_MINE_ID, id));
      complianceRecordRepository.deleteByFilterIgnoringVersion(
          Filters.eq(ComplianceRecord.FIELD_MINE_ID, id));
    }
  }

  @Override
  public PaginatedResult<Mine> findMines(final Query query) {
    return mineRepository.findByQuery(query == null ? new Query() : query);
  }

  @Override
  public ProductionEntry saveProductionEntry(final ProductionEntry entry, final boolean skipVersion) {
    requireMineEdit(entry.getMineId());
    final ProductionEntry existing =
        StringUtils.isNotBlank(entry.getId()) ? productionEntryRepository.findById(entry.getId()) : null;
    final ProductionEntry saved =
        skipVersion
            ? productionEntryRepository.saveIgnoringVersion(entry)
            : productionEntryRepository.save(entry);
    if (existing != null
        && (!existing.getMineId().equals(saved.getMineId())
            || !periodOf(existing.getEntryTime()).equals(periodOf(saved.getEntryTime())))) {
      recalculateRoyalty(existing.getMineId(), periodOf(existing.getEntryTime()));
    }
    recalculateRoyalty(saved.getMineId(), periodOf(saved.getEntryTime()));
    return saved;
  }

  @Override
  public Map<String, ProductionEntry> getProductionEntries(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return productionEntryRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<ProductionEntry> findProductionEntries(final Query query) {
    final PaginatedResult<ProductionEntry> result =
        productionEntryRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(entry -> isMineReadable(entry.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public void deleteProductionEntry(final String id) {
    final ProductionEntry entry = productionEntryRepository.findById(id);
    if (entry == null) {
      return;
    }
    requireMineEdit(entry.getMineId());
    if (productionEntryRepository.deleteByIdIgnoringVersion(id)) {
      recalculateRoyalty(entry.getMineId(), periodOf(entry.getEntryTime()));
    }
  }

  @Override
  public PaginatedResult<Royalty> getRoyaltiesByMine(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return PaginatedResult.empty();
    }
    return royaltyRepository.findByQuery(
        new Query().withFilter(Filters.eq(Royalty.FIELD_MINE_ID, mineId)));
  }

  @Override
  public RoyaltyRate saveRoyaltyRate(final RoyaltyRate rate) {
    // The id is always derived from the rate's own key fields, so saving one for a combination
    // that already has a rate replaces it rather than creating a second.
    rate.setId(RoyaltyRate.id(rate.getState(), rate.getMineral(), rate.getYear(), rate.getMonth()));
    // Royalty rates are environment-wide, not this caller's own customer's data: every customer
    // reads and writes the one copy stored under the system customer.
    return Context.asSystemCustomer().get(() -> royaltyRateRepository.saveIgnoringVersion(rate));
  }

  @Override
  public PaginatedResult<RoyaltyRate> findRoyaltyRates(final Query query) {
    return Context.asSystemCustomer()
        .get(() -> royaltyRateRepository.findByQuery(query == null ? new Query() : query));
  }

  @Override
  public DmfRate saveDmfRate(final DmfRate rate) {
    rate.setId(DmfRate.id(rate.getTier(), rate.getEffectiveFrom()));
    return Context.asSystemCustomer().get(() -> dmfRateRepository.saveIgnoringVersion(rate));
  }

  @Override
  public NmetRate saveNmetRate(final NmetRate rate) {
    rate.setId(NmetRate.id(rate.getEffectiveFrom()));
    return Context.asSystemCustomer().get(() -> nmetRateRepository.saveIgnoringVersion(rate));
  }

  @Override
  public ComplianceRecord saveComplianceRecord(final ComplianceRecord record, final boolean skipVersion) {
    requireMineEdit(record.getMineId());
    return skipVersion
        ? complianceRecordRepository.saveIgnoringVersion(record)
        : complianceRecordRepository.save(record);
  }

  @Override
  public Map<String, ComplianceRecord> getComplianceRecords(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return complianceRecordRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<ComplianceRecord> findComplianceRecords(final Query query) {
    final PaginatedResult<ComplianceRecord> result =
        complianceRecordRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(record -> isMineReadable(record.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public DgmsScore getDgmsReadinessScore(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new DgmsScore(0, dgmsVerdictOf(0), List.of());
    }
    final List<ComplianceRecord> records =
        complianceRecordRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(ComplianceRecord.FIELD_MINE_ID, mineId),
                            Filters.eq("recordType", RecordType.REGISTER.name()))))
            .getItems();

    final List<DgmsRecordScore> scores = new ArrayList<>();
    double weightedSum = 0;
    double totalWeight = 0;
    final Instant now = Instant.now();

    for (final ComplianceRecord record : records) {
      final long daysSince =
          Math.max(
              0, Duration.between(Instant.ofEpochMilli(record.getLastUpdatedAt()), now).toDays());
      final int maxDays = Math.max(record.getMaxDaysAllowed(), 1);
      final int score = Math.max(0, (int) Math.round(100 - (100.0 * daysSince / maxDays)));
      final double weight = DGMS_REGISTER_WEIGHTS.getOrDefault(record.getRegisterCode(), 1.0);
      weightedSum += score * weight;
      totalWeight += weight;
      scores.add(new DgmsRecordScore(record, score, daysSince, dgmsStatusOf(score)));
    }

    final int overall = totalWeight > 0 ? (int) Math.round(weightedSum / totalWeight) : 0;
    return new DgmsScore(overall, dgmsVerdictOf(overall), scores);
  }

  @Override
  public void ensureComplianceRecords(final String mineId) {
    final Mine mine = mineRepository.findById(mineId);
    if (mine == null) {
      return;
    }
    final Map<String, Object> mineMap = JsonUtils.toMap(mine);
    final Map<String, ComplianceRecord> desired = new HashMap<>();
    for (final Map<String, Object> register : DGMS_REGISTERS.getValue(Map.of("mine", mineMap))) {
      final ComplianceRecord record = JsonUtils.fromMap(register, ComplianceRecord.class);
      record.setMineId(mineId);
      desired.put(record.getRegisterCode() + ":" + mineId, record);
    }
    final YearMonth from = YearMonth.now(ZoneOffset.UTC);
    for (final Map<String, Object> metadata : DEADLINE_TEMPLATE_METADATA) {
      final String code = CollectionUtils.getStringValueFromMap(metadata, "code");
      final Set<Integer> monthsOfYear =
          Set.copyOf(CollectionUtils.getListFromMap(metadata, "monthsOfYear"));
      final int dayOfMonth = CollectionUtils.getIntValueFromMap(metadata, "dayOfMonth", 1);
      final Template<Map<String, Object>> template = DEADLINE_TEMPLATES_BY_CODE.get(code);
      for (YearMonth period = from; period.isBefore(from.plusMonths(CALENDAR_WINDOW_MONTHS));
          period = period.plusMonths(1)) {
        if (monthsOfYear.contains(period.getMonthValue())) {
          final long periodStart =
              period.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
          // Clamping, and the day-to-millis conversion, happen here rather than in the Groovy
          // expression: a bare numeric literal inside the expression trips its sandboxed
          // SecureASTCustomizer (confirmed — "Constant expression type [int] is not allowed"
          // even though Integer.class is on its own whitelist), so the expression is kept to
          // pure addition of values already in context, no literals of its own at all.
          final int effectiveDay = Math.min(dayOfMonth, period.lengthOfMonth());
          final long dayOffsetMillis = (effectiveDay - 1) * Duration.ofDays(1).toMillis();
          final Map<String, Object> resolved =
              template.getValue(
                  Map.of(
                      "mine", mineMap,
                      "periodStart", periodStart,
                      "dayOffsetMillis", dayOffsetMillis));
          final ComplianceRecord record = JsonUtils.fromMap(resolved, ComplianceRecord.class);
          record.setMineId(mineId);
          desired.put(code + ":" + mineId + ":" + period, record);
        }
      }
    }
    final Map<String, ComplianceRecord> existing =
        complianceRecordRepository.findByIds(desired.keySet());
    final List<ComplianceRecord> missing =
        desired.entrySet().stream()
            .filter(entry -> !existing.containsKey(entry.getKey()))
            .map(
                entry -> {
                  entry.getValue().setId(entry.getKey());
                  return entry.getValue();
                })
            .toList();
    if (!missing.isEmpty()) {
      complianceRecordRepository.insertMany(missing);
    }
  }

  private static String dgmsStatusOf(final int score) {
    if (score >= GREEN_THRESHOLD) {
      return DgmsRecordStatus.GREEN.name();
    }
    return (score >= AMBER_THRESHOLD ? DgmsRecordStatus.AMBER : DgmsRecordStatus.RED).name();
  }

  private static String dgmsVerdictOf(final int overallScore) {
    if (overallScore >= GOOD_THRESHOLD) {
      return DgmsVerdict.GOOD.name();
    }
    return (overallScore >= NEEDS_ATTENTION_THRESHOLD
            ? DgmsVerdict.NEEDS_ATTENTION
            : DgmsVerdict.CRITICAL)
        .name();
  }

  /**
   * Royalty and ComplianceRecord are not independently permissioned: they are reached only
   * through their mine, so every write to one requires the caller to hold {@code permission} on
   * its mine.
   */
  private void requireMineEdit(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.EDIT)) {
      throw new UnauthorizedException(AssetClass.MINE, mineId);
    }
  }

  /**
   * Whether the caller may read {@code mineId}, cached per call so a batch of entries sharing a
   * mine checks it once — the stand-in for ACL filtering on an entity that isn't
   * independently permissioned.
   */
  private boolean isMineReadable(final String mineId, final Map<String, Boolean> mineIdVsReadable) {
    return mineIdVsReadable.computeIfAbsent(
        mineId, id -> mineRepository.hasPermission(id, Permission.READ));
  }

  private static YearMonth periodOf(final long entryTime) {
    return YearMonth.from(Instant.ofEpochMilli(entryTime).atZone(ZoneOffset.UTC));
  }

  /**
   * Recomputes the mine's royalty for {@code period} from its production entries and the
   * applicable {@link RoyaltyRate}, and upserts it under {@link Royalty#id}. Deletes the royalty
   * instead when the mine now has no production for the period at all (e.g. its last entry was
   * deleted).
   */
  private void recalculateRoyalty(final String mineId, final YearMonth period) {
    final Mine mine = mineRepository.findById(mineId);
    if (mine == null) {
      return;
    }
    final String month = period.getMonth().name();
    final String royaltyId = Royalty.id(mineId, period.getYear(), month);

    final long periodStart = period.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
    final long periodEnd =
        period.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
    final double quantity =
        productionEntryRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(ProductionEntry.FIELD_MINE_ID, mineId),
                            Filters.gte("entryTime", periodStart),
                            Filters.lt("entryTime", periodEnd)))
                    .withPage(Page.UNBOUNDED))
            .getItems()
            .stream()
            .mapToDouble(ProductionEntry::getQuantityDispatched)
            .sum();

    if (quantity <= 0) {
      royaltyRepository.deleteByIdIgnoringVersion(royaltyId);
      return;
    }

    final Royalty royalty = new Royalty();
    royalty.setId(royaltyId);
    royalty.setMineId(mineId);
    royalty.setYear(period.getYear());
    royalty.setMonth(month);
    royalty.setQuantity(quantity);

    // Royalty rates, DMF rates, and NMET rates are environment-wide, stored under the system
    // customer (see saveRoyaltyRate/saveDmfRate/saveNmetRate).
    final RoyaltyRate rate =
        Context.asSystemCustomer()
            .get(
                () ->
                    royaltyRateRepository.findById(
                        RoyaltyRate.id(mine.getState(), mine.getMineral(), period.getYear(), month)));
    if (rate != null) {
      final String tier =
          mine.getLeaseStartOn() >= MiningConstants.DMF_RATE_CHANGE_CUTOFF
              ? MiningConstants.LEASE_TIER_POST_2015
              : MiningConstants.LEASE_TIER_PRE_2015;
      final DmfRate dmfRate = latestDmfRate(tier, periodStart);
      final NmetRate nmetRate = latestNmetRate(periodStart);
      final long baseAmount = Math.round(quantity * rate.getRatePerTonne());
      final long dmfAmount = dmfRate == null ? 0 : Math.round(baseAmount * dmfRate.getRate());
      final long nmetAmount = nmetRate == null ? 0 : Math.round(baseAmount * nmetRate.getRate());
      royalty.setRoyaltyRateId(rate.getId());
      royalty.setBaseAmount(baseAmount);
      royalty.setDmfAmount(dmfAmount);
      royalty.setNmetAmount(nmetAmount);
      royalty.setGrossLiability(baseAmount + dmfAmount + nmetAmount);
    }
    royaltyRepository.saveIgnoringVersion(royalty);
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
}
