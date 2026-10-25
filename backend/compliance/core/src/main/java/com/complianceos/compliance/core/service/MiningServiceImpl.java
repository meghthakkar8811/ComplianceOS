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
import com.complianceos.compliance.api.beans.Authority;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.ComplianceStatus;
import com.complianceos.compliance.api.beans.DgmsRecordScore;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.ExMinePrice;
import com.complianceos.compliance.api.beans.ExMinePriceOverride;
import com.complianceos.compliance.api.beans.ExMinePriceSource;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborSummary;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.MineLabor;
import com.complianceos.compliance.api.beans.MinePayment;
import com.complianceos.compliance.api.beans.MineRent;
import com.complianceos.compliance.api.beans.MiningConstants;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.PaymentType;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.DgmsRecordStatus;
import com.complianceos.compliance.api.beans.DgmsVerdict;
import com.complianceos.compliance.api.beans.RecordType;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.StockBalance;
import com.complianceos.compliance.api.beans.StockBaseline;
import com.complianceos.compliance.api.beans.Stoppage;
import com.complianceos.compliance.api.services.MiningService;
import com.complianceos.compliance.core.repository.ComplianceRecordRepository;
import com.complianceos.compliance.core.repository.DmfRateRepository;
import com.complianceos.compliance.core.repository.ExMinePriceOverrideRepository;
import com.complianceos.compliance.core.repository.LaborDayRepository;
import com.complianceos.compliance.core.repository.MineLaborRepository;
import com.complianceos.compliance.core.repository.MinePaymentRepository;
import com.complianceos.compliance.core.repository.MineRentRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.NmetRateRepository;
import com.complianceos.compliance.core.repository.ProductionEntryRepository;
import com.complianceos.compliance.core.repository.RoyaltyRateRepository;
import com.complianceos.compliance.core.repository.SaleRepository;
import com.complianceos.compliance.core.repository.StockBaselineRepository;
import com.complianceos.compliance.core.repository.StoppageRepository;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.ToDoubleFunction;
import java.util.function.ToLongFunction;
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
  private final RoyaltyRateRepository royaltyRateRepository;
  private final DmfRateRepository dmfRateRepository;
  private final NmetRateRepository nmetRateRepository;
  private final ComplianceRecordRepository complianceRecordRepository;
  private final MineRentRepository mineRentRepository;
  private final MinePaymentRepository minePaymentRepository;
  private final StoppageRepository stoppageRepository;
  private final LaborDayRepository laborDayRepository;
  private final MineLaborRepository mineLaborRepository;
  private final StockBaselineRepository stockBaselineRepository;
  private final SaleRepository saleRepository;
  private final ExMinePriceOverrideRepository exMinePriceOverrideRepository;

  @Inject
  public MiningServiceImpl(
      final MineRepository mineRepository,
      final ProductionEntryRepository productionEntryRepository,
      final RoyaltyRateRepository royaltyRateRepository,
      final DmfRateRepository dmfRateRepository,
      final NmetRateRepository nmetRateRepository,
      final ComplianceRecordRepository complianceRecordRepository,
      final MineRentRepository mineRentRepository,
      final MinePaymentRepository minePaymentRepository,
      final StoppageRepository stoppageRepository,
      final LaborDayRepository laborDayRepository,
      final MineLaborRepository mineLaborRepository,
      final StockBaselineRepository stockBaselineRepository,
      final SaleRepository saleRepository,
      final ExMinePriceOverrideRepository exMinePriceOverrideRepository) {
    this.mineRepository = mineRepository;
    this.productionEntryRepository = productionEntryRepository;
    this.royaltyRateRepository = royaltyRateRepository;
    this.dmfRateRepository = dmfRateRepository;
    this.nmetRateRepository = nmetRateRepository;
    this.complianceRecordRepository = complianceRecordRepository;
    this.mineRentRepository = mineRentRepository;
    this.minePaymentRepository = minePaymentRepository;
    this.stoppageRepository = stoppageRepository;
    this.laborDayRepository = laborDayRepository;
    this.mineLaborRepository = mineLaborRepository;
    this.stockBaselineRepository = stockBaselineRepository;
    this.saleRepository = saleRepository;
    this.exMinePriceOverrideRepository = exMinePriceOverrideRepository;
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
      complianceRecordRepository.deleteByFilterIgnoringVersion(
          Filters.eq(ComplianceRecord.FIELD_MINE_ID, id));
      mineRentRepository.deleteByFilterIgnoringVersion(Filters.eq(MineRent.FIELD_MINE_ID, id));
      minePaymentRepository.deleteByFilterIgnoringVersion(
          Filters.eq(MinePayment.FIELD_MINE_ID, id));
      stoppageRepository.deleteByFilterIgnoringVersion(Filters.eq(Stoppage.FIELD_MINE_ID, id));
      laborDayRepository.deleteByFilterIgnoringVersion(Filters.eq(LaborDay.FIELD_MINE_ID, id));
      mineLaborRepository.deleteByFilterIgnoringVersion(Filters.eq(MineLabor.FIELD_MINE_ID, id));
      stockBaselineRepository.deleteByFilterIgnoringVersion(
          Filters.eq(StockBaseline.FIELD_MINE_ID, id));
      saleRepository.deleteByFilterIgnoringVersion(
          Filters.eq(Sale.FIELD_MINE_ID, id));
      exMinePriceOverrideRepository.deleteByFilterIgnoringVersion(
          Filters.eq(ExMinePriceOverride.FIELD_MINE_ID, id));
    }
  }

  @Override
  public PaginatedResult<Mine> findMines(final Query query) {
    return mineRepository.findByQuery(query == null ? new Query() : query);
  }

  @Override
  public ProductionEntry saveProductionEntry(final ProductionEntry entry, final boolean skipVersion) {
    requireMineEdit(entry.getMineId());
    return skipVersion
        ? productionEntryRepository.saveIgnoringVersion(entry)
        : productionEntryRepository.save(entry);
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
    productionEntryRepository.deleteByIdIgnoringVersion(id);
  }

  @Override
  public List<Royalty> getRoyaltiesByMine(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return List.of();
    }
    final List<Sale> sales =
        saleRepository
            .findByQuery(
                new Query()
                    .withFilter(Filters.eq(Sale.FIELD_MINE_ID, mineId))
                    .withPage(Page.UNBOUNDED))
            .getItems();
      return sales.stream()
          .map(sale -> periodOf(sale.getDispatchedOn()))
          .distinct()
          .sorted(Comparator.reverseOrder())
          .map(period -> computeRoyalty(mineId, period))
          .filter(Objects::nonNull)
          .toList();
  }

  @Override
  public Royalty getRoyalty(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return null;
    }
    return computeRoyalty(mineId, periodOf(asOf));
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
  public void deleteComplianceRecord(final String id) {
    final ComplianceRecord record = complianceRecordRepository.findById(id);
    if (record == null) {
      return;
    }
    requireMineEdit(record.getMineId());
    complianceRecordRepository.deleteByIdIgnoringVersion(id);
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
  public MineRent saveMineRent(final MineRent rent, final boolean skipVersion) {
    requireMineEdit(rent.getMineId());
    if (PaymentType.valueOfOrDefault(rent.getType()) == PaymentType.DEAD_RENT) {
      // Dead rent always goes to the state government, by law — not a per-lease choice like
      // surface rent's payee is, so this isn't a default: it overrides whatever was passed in.
      final Mine mine = mineRepository.findById(rent.getMineId());
      if (mine != null) {
        rent.setPayee("Government of " + mine.getState());
      }
    }
    rent.setId(MineRent.id(rent.getMineId(), rent.getType(), rent.getValidFrom()));
    final MineRent current = currentMineRent(rent.getMineId(), rent.getType());
    if (current != null
        && !current.getId().equals(rent.getId())
        && current.getValidFrom() < rent.getValidFrom()) {
      current.setValidTill(rent.getValidFrom());
      mineRentRepository.saveIgnoringVersion(current);
    }
    return skipVersion ? mineRentRepository.saveIgnoringVersion(rent) : mineRentRepository.save(rent);
  }

  @Override
  public Map<String, MineRent> getMineRents(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return mineRentRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<MineRent> findMineRents(final Query query) {
    final PaginatedResult<MineRent> result =
        mineRentRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(rent -> isMineReadable(rent.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public MinePayment savePayment(final MinePayment payment, final boolean skipVersion) {
    requireMineEdit(payment.getMineId());
    return skipVersion
        ? minePaymentRepository.saveIgnoringVersion(payment)
        : minePaymentRepository.save(payment);
  }

  @Override
  public Map<String, MinePayment> getPayments(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return minePaymentRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<MinePayment> findPayments(final Query query) {
    final PaginatedResult<MinePayment> result =
        minePaymentRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(payment -> isMineReadable(payment.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public Stoppage saveStoppage(final Stoppage stoppage, final boolean skipVersion) {
    requireMineEdit(stoppage.getMineId());
    stoppage.setId(Stoppage.id(stoppage.getMineId(), stoppage.getStoppedOn()));
    return skipVersion
        ? stoppageRepository.saveIgnoringVersion(stoppage)
        : stoppageRepository.save(stoppage);
  }

  @Override
  public Map<String, Stoppage> getStoppages(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return stoppageRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<Stoppage> findStoppages(final Query query) {
    final PaginatedResult<Stoppage> result =
        stoppageRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(stoppage -> isMineReadable(stoppage.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public int getDaysWorked(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return 0;
    }
    final YearMonth period = periodOf(asOf);
    final long periodStart = monthStartMillis(period);
    final long periodEnd = monthStartMillis(period.plusMonths(1));
    final PaginatedResult<Stoppage> stoppages =
        stoppageRepository.findByQuery(
            new Query()
                .withFilter(
                    Filters.and(
                        Filters.eq(Stoppage.FIELD_MINE_ID, mineId),
                        Filters.gte(Stoppage.FIELD_STOPPED_ON, periodStart),
                        Filters.lt(Stoppage.FIELD_STOPPED_ON, periodEnd)))
                .withPage(Page.UNBOUNDED));
    return period.lengthOfMonth() - stoppages.getItems().size();
  }

  @Override
  public LaborDay saveLaborDay(final LaborDay day, final boolean skipVersion) {
    requireMineEdit(day.getMineId());
    day.setId(LaborDay.id(day.getMineId(), day.getWorkedOn()));
    return skipVersion
        ? laborDayRepository.saveIgnoringVersion(day)
        : laborDayRepository.save(day);
  }

  @Override
  public Map<String, LaborDay> getLaborDays(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return laborDayRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<LaborDay> findLaborDays(final Query query) {
    final PaginatedResult<LaborDay> result =
        laborDayRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(day -> isMineReadable(day.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public LaborSummary getLaborSummary(final String mineId, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new LaborSummary(0, 0, 0);
    }
    final int daysWorked = getDaysWorked(mineId, asOf);
    if (daysWorked == 0) {
      return new LaborSummary(0, 0, 0);
    }
    final YearMonth period = periodOf(asOf);
    final long periodStart = monthStartMillis(period);
    final long periodEnd = monthStartMillis(period.plusMonths(1));
    final PaginatedResult<LaborDay> laborDays =
        laborDayRepository.findByQuery(
            new Query()
                .withFilter(
                    Filters.and(
                        Filters.eq(LaborDay.FIELD_MINE_ID, mineId),
                        Filters.gte(LaborDay.FIELD_WORKED_ON, periodStart),
                        Filters.lt(LaborDay.FIELD_WORKED_ON, periodEnd)))
                .withPage(Page.UNBOUNDED));
    long belowGroundManDays = 0;
    long openCastManDays = 0;
    long aboveGroundManDays = 0;
    for (final LaborDay day : laborDays.getItems()) {
      belowGroundManDays += day.getBelowGroundCount();
      openCastManDays += day.getOpenCastCount();
      aboveGroundManDays += day.getAboveGroundCount();
    }
    return new LaborSummary(
        (double) belowGroundManDays / daysWorked,
        (double) openCastManDays / daysWorked,
        (double) aboveGroundManDays / daysWorked);
  }

  @Override
  public MineLabor saveMineLabor(final MineLabor labor, final boolean skipVersion) {
    requireMineEdit(labor.getMineId());
    labor.setId(MineLabor.id(labor.getMineId(), labor.getPeriodStart()));
    return skipVersion
        ? mineLaborRepository.saveIgnoringVersion(labor)
        : mineLaborRepository.save(labor);
  }

  @Override
  public Map<String, MineLabor> getMineLabors(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return mineLaborRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<MineLabor> findMineLabors(final Query query) {
    final PaginatedResult<MineLabor> result =
        mineLaborRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(labor -> isMineReadable(labor.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public StockBaseline saveStockBaseline(final StockBaseline baseline, final boolean skipVersion) {
    requireMineEdit(baseline.getMineId());
    baseline.setId(StockBaseline.id(baseline.getMineId(), baseline.getMineralGrade()));
    return skipVersion
        ? stockBaselineRepository.saveIgnoringVersion(baseline)
        : stockBaselineRepository.save(baseline);
  }

  @Override
  public Map<String, StockBaseline> getStockBaselines(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return stockBaselineRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<StockBaseline> findStockBaselines(final Query query) {
    final PaginatedResult<StockBaseline> result =
        stockBaselineRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(baseline -> isMineReadable(baseline.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public StockBalance getStockBalance(final String mineId, final String mineralGrade, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new StockBalance(0, 0, 0, 0);
    }
    final StockBaseline baseline =
        stockBaselineRepository.findById(StockBaseline.id(mineId, mineralGrade));
    final double baselineStock = baseline == null ? 0 : baseline.getOpeningStock();
    final long baselineAsOf = baseline == null ? 0 : baseline.getAsOf();

    final YearMonth period = periodOf(asOf);
    final long periodStart = monthStartMillis(period);
    final long periodEnd = monthStartMillis(period.plusMonths(1));

    final double[] productionSplit =
        splitSum(
            productionEntryRepository
                .findByQuery(
                    new Query()
                        .withFilter(
                            Filters.and(
                                Filters.eq(ProductionEntry.FIELD_MINE_ID, mineId),
                                Filters.eq(ProductionEntry.FIELD_MINERAL_GRADE, mineralGrade),
                                Filters.gte(ProductionEntry.FIELD_ENTRY_TIME, baselineAsOf),
                                Filters.lt(ProductionEntry.FIELD_ENTRY_TIME, periodEnd)))
                        .withPage(Page.UNBOUNDED))
                .getItems(),
            ProductionEntry::getEntryTime,
            ProductionEntry::getQuantity,
            periodStart);
    final double[] dispatchSplit =
        splitSum(
            saleRepository
                .findByQuery(
                    new Query()
                        .withFilter(
                            Filters.and(
                                Filters.eq(Sale.FIELD_MINE_ID, mineId),
                                Filters.eq(Sale.FIELD_MINERAL_GRADE, mineralGrade),
                                Filters.gte(Sale.FIELD_DISPATCHED_ON, baselineAsOf),
                                Filters.lt(Sale.FIELD_DISPATCHED_ON, periodEnd)))
                        .withPage(Page.UNBOUNDED))
                .getItems(),
            Sale::getDispatchedOn,
            Sale::getQuantity,
            periodStart);

    final double openingStock = baselineStock + productionSplit[0] - dispatchSplit[0];
    final double production = productionSplit[1];
    final double dispatched = dispatchSplit[1];
    return new StockBalance(openingStock, production, dispatched, openingStock + production - dispatched);
  }

  @Override
  public Sale saveSale(final Sale sale, final boolean skipVersion) {
    requireMineEdit(sale.getMineId());
    return skipVersion
        ? saleRepository.saveIgnoringVersion(sale)
        : saleRepository.save(sale);
  }

  @Override
  public Map<String, Sale> getSales(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return saleRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<Sale> findSales(final Query query) {
    final PaginatedResult<Sale> result =
        saleRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(sale -> isMineReadable(sale.getMineId(), mineIdVsReadable))
            .toList());
    return result;
  }

  @Override
  public ExMinePrice getExMinePrice(final String mineId, final String mineralGrade, final long asOf) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new ExMinePrice(0, ExMinePriceSource.NONE.name());
    }
    return exMinePriceAsOf(mineId, mineralGrade, monthStartMillis(periodOf(asOf).plusMonths(1)));
  }

  @Override
  public ExMinePriceOverride saveExMinePriceOverride(
      final ExMinePriceOverride override, final boolean skipVersion) {
    requireMineEdit(override.getMineId());
    override.setId(
        ExMinePriceOverride.id(
            override.getMineId(), override.getMineralGrade(), override.getPeriodStart()));
    return skipVersion
        ? exMinePriceOverrideRepository.saveIgnoringVersion(override)
        : exMinePriceOverrideRepository.save(override);
  }

  @Override
  public Map<String, ExMinePriceOverride> getExMinePriceOverrides(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    return exMinePriceOverrideRepository.findByIds(ids).entrySet().stream()
        .filter(entry -> isMineReadable(entry.getValue().getMineId(), mineIdVsReadable))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<ExMinePriceOverride> findExMinePriceOverrides(final Query query) {
    final PaginatedResult<ExMinePriceOverride> result =
        exMinePriceOverrideRepository.findByQuery(query == null ? new Query() : query);
    final Map<String, Boolean> mineIdVsReadable = new HashMap<>();
    result.setItems(
        result.getItems().stream()
            .filter(override -> isMineReadable(override.getMineId(), mineIdVsReadable))
            .toList());
    return result;
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
    for (final MineRent rent :
        mineRentRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(MineRent.FIELD_MINE_ID, mineId),
                            Filters.notExists(MineRent.FIELD_VALID_TILL)))
                    .withPage(Page.UNBOUNDED))
            .getItems()) {
      final ComplianceRecord record = new ComplianceRecord();
      record.setMineId(mineId);
      record.setRecordType(RecordType.RETURN.name());
      record.setAuthority(
          StringUtils.isNotBlank(rent.getPayee()) ? rent.getPayee() : Authority.UNKNOWN.name());
      record.setStatus(ComplianceStatus.PENDING_SUBMISSION.name());
      record.setTitle(rentReminderTitle(rent));
      record.setExpiry(rent.getNextDueOn());
      desired.put("RENT_DUE:" + rent.getId() + ":" + rent.getNextDueOn(), record);
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

  private static long monthStartMillis(final YearMonth period) {
    return period.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
  }

  /**
   * Splits one fetch's worth of items into the sum of {@code quantity} for those whose
   * {@code timestamp} falls before {@code splitPoint} (index 0) and at or after it (index 1) —
   * one query covering both halves of a range, rather than a separate query per half.
   */
  private static <T> double[] splitSum(
      final List<T> items,
      final ToLongFunction<T> timestamp,
      final ToDoubleFunction<T> quantity,
      final long splitPoint) {
    double before = 0;
    double fromSplit = 0;
    for (final T item : items) {
      if (timestamp.applyAsLong(item) < splitPoint) {
        before += quantity.applyAsDouble(item);
      } else {
        fromSplit += quantity.applyAsDouble(item);
      }
    }
    return new double[] {before, fromSplit};
  }

  /**
   * The grade's ex-mine price as of the most recent month strictly before {@code beforeMillis}
   * that has either an {@link ExMinePriceOverride} or a {@link Sale} — whichever of the
   * two is more recent wins; a tie favors the override. {@code NONE} if neither ever existed.
   */
  private ExMinePrice exMinePriceAsOf(
      final String mineId, final String mineralGrade, final long beforeMillis) {
    final ExMinePriceOverride latestOverride =
        exMinePriceOverrideRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(ExMinePriceOverride.FIELD_MINE_ID, mineId),
                            Filters.eq(ExMinePriceOverride.FIELD_MINERAL_GRADE, mineralGrade),
                            Filters.lt(ExMinePriceOverride.FIELD_PERIOD_START, beforeMillis)))
                    .withSort(new Sort(ExMinePriceOverride.FIELD_PERIOD_START, Sort.Order.DESC))
                    .withPage(new Page(0, 1)))
            .getItems()
            .stream()
            .findFirst()
            .orElse(null);

    final Sale latestSale =
        saleRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(Sale.FIELD_MINE_ID, mineId),
                            Filters.eq(Sale.FIELD_MINERAL_GRADE, mineralGrade),
                            Filters.lt(Sale.FIELD_DISPATCHED_ON, beforeMillis)))
                    .withSort(new Sort(Sale.FIELD_DISPATCHED_ON, Sort.Order.DESC))
                    .withPage(new Page(0, 1)))
            .getItems()
            .stream()
            .findFirst()
            .orElse(null);

    final long overrideMonthStart = latestOverride == null ? -1 : latestOverride.getPeriodStart();
    final long saleMonthStart =
        latestSale == null ? -1 : monthStartMillis(periodOf(latestSale.getDispatchedOn()));

    if (overrideMonthStart < 0 && saleMonthStart < 0) {
      return new ExMinePrice(0, ExMinePriceSource.NONE.name());
    }
    if (overrideMonthStart >= saleMonthStart) {
      return new ExMinePrice(latestOverride.getPricePerUnit(), ExMinePriceSource.OVERRIDE.name());
    }

    final YearMonth saleMonth = periodOf(latestSale.getDispatchedOn());
    final long periodStart = monthStartMillis(saleMonth);
    final long periodEnd = monthStartMillis(saleMonth.plusMonths(1));
    final List<Sale> monthSales =
        saleRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(Sale.FIELD_MINE_ID, mineId),
                            Filters.eq(Sale.FIELD_MINERAL_GRADE, mineralGrade),
                            Filters.gte(Sale.FIELD_DISPATCHED_ON, periodStart),
                            Filters.lt(Sale.FIELD_DISPATCHED_ON, periodEnd)))
                    .withPage(Page.UNBOUNDED))
            .getItems();
    double totalExMineValue = 0;
    double totalQuantity = 0;
    for (final Sale sale : monthSales) {
      totalExMineValue += sale.getSaleValue() - (double) sale.getDeductionPerUnit() * sale.getQuantity();
      totalQuantity += sale.getQuantity();
    }
    final String source =
        periodEnd == beforeMillis
            ? ExMinePriceSource.SALES.name()
            : ExMinePriceSource.CARRIED_FORWARD.name();
    return new ExMinePrice(totalQuantity <= 0 ? 0 : Math.round(totalExMineValue / totalQuantity), source);
  }

  /** The mine's current (not yet superseded) {@link MineRent} of {@code type}, or null if none is. */
  private MineRent currentMineRent(final String mineId, final String type) {
    return mineRentRepository
        .findByQuery(
            new Query()
                .withFilter(
                    Filters.and(
                        Filters.eq(MineRent.FIELD_MINE_ID, mineId),
                        Filters.eq(MineRent.FIELD_TYPE, PaymentType.valueOfOrDefault(type).name()),
                        Filters.notExists(MineRent.FIELD_VALID_TILL))))
        .getItems()
        .stream()
        .findFirst()
        .orElse(null);
  }

  private static String rentReminderTitle(final MineRent rent) {
    return switch (PaymentType.valueOfOrDefault(rent.getType())) {
      case DEAD_RENT -> "Dead Rent Payment Due";
      case RENT -> "Surface Rent Payment Due";
      default -> "Rent Payment Due";
    };
  }

  /**
   * The mine's royalty for {@code period}, computed fresh from its {@link Sale} records
   * and the applicable {@link RoyaltyRate}/{@code DmfRate}/{@code NmetRate} — null when the mine
   * doesn't exist or has no dispatches for the period at all.
   */
  private Royalty computeRoyalty(final String mineId, final YearMonth period) {
    final Mine mine = mineRepository.findById(mineId);
    if (mine == null) {
      return null;
    }
    final String month = period.getMonth().name();

    final long periodStart = monthStartMillis(period);
    final long periodEnd = monthStartMillis(period.plusMonths(1));
    final double quantity =
        saleRepository
            .findByQuery(
                new Query()
                    .withFilter(
                        Filters.and(
                            Filters.eq(Sale.FIELD_MINE_ID, mineId),
                            Filters.gte(Sale.FIELD_DISPATCHED_ON, periodStart),
                            Filters.lt(Sale.FIELD_DISPATCHED_ON, periodEnd)))
                    .withPage(Page.UNBOUNDED))
            .getItems()
            .stream()
            .mapToDouble(Sale::getQuantity)
            .sum();

    if (quantity <= 0) {
      return null;
    }

    // Royalty rates, DMF rates, and NMET rates are environment-wide, stored under the system
    // customer (see saveRoyaltyRate/saveDmfRate/saveNmetRate).
    final RoyaltyRate rate =
        Context.asSystemCustomer()
            .get(
                () ->
                    royaltyRateRepository.findById(
                        RoyaltyRate.id(mine.getState(), mine.getMineral(), period.getYear(), month)));
    if (rate == null) {
      return new Royalty(
          Royalty.id(mineId, period.getYear(), month), mineId, period.getYear(), month, null,
          quantity, 0, 0, 0, 0);
    }
    final String tier =
        mine.getLeaseStartOn() >= MiningConstants.DMF_RATE_CHANGE_CUTOFF
            ? MiningConstants.LEASE_TIER_POST_2015
            : MiningConstants.LEASE_TIER_PRE_2015;
    final DmfRate dmfRate = latestDmfRate(tier, periodStart);
    final NmetRate nmetRate = latestNmetRate(periodStart);
    final long baseAmount = Math.round(quantity * rate.getRatePerTonne());
    final long dmfAmount = dmfRate == null ? 0 : Math.round(baseAmount * dmfRate.getRate());
    final long nmetAmount = nmetRate == null ? 0 : Math.round(baseAmount * nmetRate.getRate());
    return new Royalty(
        Royalty.id(mineId, period.getYear(), month),
        mineId,
        period.getYear(),
        month,
        rate.getId(),
        quantity,
        baseAmount,
        dmfAmount,
        nmetAmount,
        baseAmount + dmfAmount + nmetAmount);
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
