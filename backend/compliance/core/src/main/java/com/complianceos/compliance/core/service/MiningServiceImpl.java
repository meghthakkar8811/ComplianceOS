package com.complianceos.compliance.core.service;

import com.agentengine.util.common.beans.FileDetails;
import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.exception.UnauthorizedException;
import com.agentengine.util.common.query.AggregationQuery;
import com.agentengine.util.common.query.AggregationResult;
import com.agentengine.util.common.query.Filter;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.common.utils.ResourceUtils;
import com.agentengine.util.common.utils.StringUtils;
import com.agentengine.util.context.Context;
import com.agentengine.util.scripts.TemplateUtils;
import com.agentengine.util.scripts.templated.Template;
import com.agentengine.util.tenancy.Permission;
import com.complianceos.compliance.api.beans.*;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.api.services.MiningService;
import com.complianceos.compliance.core.repository.BuyerRepository;
import com.complianceos.compliance.core.repository.ComplianceRecordRepository;
import com.complianceos.compliance.core.repository.DmfRateRepository;
import com.complianceos.compliance.core.repository.GstRateRepository;
import com.complianceos.compliance.core.repository.LaborDayRepository;
import com.complianceos.compliance.core.repository.LaborPayrollRepository;
import com.complianceos.compliance.core.repository.MineralRepository;
import com.complianceos.compliance.core.repository.MinePaymentRepository;
import com.complianceos.compliance.core.repository.MineRentRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.MineStoppageRepository;
import com.complianceos.compliance.core.repository.NmetRateRepository;
import com.complianceos.compliance.core.repository.ProductionEntryRepository;
import com.complianceos.compliance.core.repository.RoyaltyRateRepository;
import com.complianceos.compliance.core.repository.SaleRepository;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Singleton
public class MiningServiceImpl implements MiningService {

  /** How far ahead {@link #ensureComplianceRecords} keeps each mine's calendar populated. */
  private static final int CALENDAR_WINDOW_MONTHS = 12;

  /**
   * How far back {@link #recomputeSaleLiabilities} looks for sales that might need a corrected
   * rate applied. A rate correction is assumed to always land within a month of the dispatches it
   * affects, so a sale older than this is never revisited.
   */
  private static final Duration RECOMPUTE_LOOKBACK = Duration.ofDays(31);

  // Fixed statutory registers a mine must keep current, each counted up to date in
  // getComplianceProgress while its lastUpdatedAt is within maxDaysAllowed. Resolved against
  // `mine` so a future, confirmed condition on a register (e.g. only for a mineType) is a change
  // to this resource, not to this class.
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
  private final BuyerRepository buyerRepository;
  private final ProductionEntryRepository productionEntryRepository;
  private final RoyaltyRateRepository royaltyRateRepository;
  private final DmfRateRepository dmfRateRepository;
  private final NmetRateRepository nmetRateRepository;
  private final GstRateRepository gstRateRepository;
  private final ComplianceRecordRepository complianceRecordRepository;
  private final MineRentRepository mineRentRepository;
  private final MinePaymentRepository minePaymentRepository;
  private final MineStoppageRepository mineStoppageRepository;
  private final LaborDayRepository laborDayRepository;
  private final LaborPayrollRepository laborPayrollRepository;
  private final MineralRepository mineralRepository;
  private final MineralService mineralService;
  private final SaleRepository saleRepository;

  @Inject
  public MiningServiceImpl(
      final MineRepository mineRepository,
      final BuyerRepository buyerRepository,
      final ProductionEntryRepository productionEntryRepository,
      final RoyaltyRateRepository royaltyRateRepository,
      final DmfRateRepository dmfRateRepository,
      final NmetRateRepository nmetRateRepository,
      final GstRateRepository gstRateRepository,
      final ComplianceRecordRepository complianceRecordRepository,
      final MineRentRepository mineRentRepository,
      final MinePaymentRepository minePaymentRepository,
      final MineStoppageRepository mineStoppageRepository,
      final LaborDayRepository laborDayRepository,
      final LaborPayrollRepository laborPayrollRepository,
      final MineralRepository mineralRepository,
      final MineralService mineralService,
      final SaleRepository saleRepository) {
    this.mineRepository = mineRepository;
    this.buyerRepository = buyerRepository;
    this.productionEntryRepository = productionEntryRepository;
    this.royaltyRateRepository = royaltyRateRepository;
    this.dmfRateRepository = dmfRateRepository;
    this.nmetRateRepository = nmetRateRepository;
    this.gstRateRepository = gstRateRepository;
    this.complianceRecordRepository = complianceRecordRepository;
    this.mineRentRepository = mineRentRepository;
    this.minePaymentRepository = minePaymentRepository;
    this.mineStoppageRepository = mineStoppageRepository;
    this.laborDayRepository = laborDayRepository;
    this.laborPayrollRepository = laborPayrollRepository;
    this.mineralRepository = mineralRepository;
    this.mineralService = mineralService;
    this.saleRepository = saleRepository;
  }

  @Override
  public Mine saveMine(final Mine mine, final boolean skipVersion) {
    return skipVersion ? mineRepository.saveIgnoringVersion(mine) : mineRepository.save(mine);
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
      mineStoppageRepository.deleteByFilterIgnoringVersion(
          Filters.eq(MineStoppage.FIELD_MINE_ID, id));
      laborDayRepository.deleteByFilterIgnoringVersion(Filters.eq(LaborDay.FIELD_MINE_ID, id));
      laborPayrollRepository.deleteByFilterIgnoringVersion(
          Filters.eq(LaborPayroll.FIELD_MINE_ID, id));
      mineralRepository.deleteByFilterIgnoringVersion(
          Filters.eq(Mineral.FIELD_MINE_ID, id));
      saleRepository.deleteByFilterIgnoringVersion(
          Filters.eq(Sale.FIELD_MINE_ID, id));
    }
  }

  @Override
  public PaginatedResult<Mine> findMines(final Query query) {
    return mineRepository.findByQuery(query == null ? new Query() : query);
  }

  @Override
  public Buyer saveBuyer(final Buyer buyer, final boolean skipVersion) {
    return skipVersion ? buyerRepository.saveIgnoringVersion(buyer) : buyerRepository.save(buyer);
  }

  @Override
  public Map<String, Buyer> getBuyers(final List<String> ids) {
    return buyerRepository.findByIds(ids);
  }

  @Override
  public void deleteBuyer(final String id) {
    buyerRepository.deleteByIdIgnoringVersion(id);
  }

  @Override
  public PaginatedResult<Buyer> findBuyers(final Query query) {
    return buyerRepository.findByQuery(query == null ? new Query() : query);
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
    final Map<String, ProductionEntry> found = productionEntryRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(ProductionEntry::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<ProductionEntry> findProductionEntries(final Query query) {
    final PaginatedResult<ProductionEntry> result =
        productionEntryRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(ProductionEntry::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
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
  public RoyaltyRate saveRoyaltyRate(final RoyaltyRate rate) {
    // The id is always derived from the rate's own key fields, so saving one for a combination
    // that already has a rate replaces it rather than creating a second.
    rate.setId(RoyaltyRate.id(rate.getState(), rate.getMineral(), rate.getGrade(), rate.getYear(), rate.getMonth()));
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
  public GstRate saveGstRate(final GstRate rate) {
    rate.setId(GstRate.id(rate.getMineral(), rate.getEffectiveFrom()));
    return Context.asSystemCustomer().get(() -> gstRateRepository.saveIgnoringVersion(rate));
  }

  @Override
  public PaginatedResult<GstRate> findGstRates(final Query query) {
    return Context.asSystemCustomer().get(() -> gstRateRepository.findByQuery(query == null ? new Query() : query));
  }

  @Override
  public ComplianceRecord fileReturn(
      final String mineId, final String title, final String referenceNumber) {
    requireMineEdit(mineId);
    final ComplianceRecord record = new ComplianceRecord();
    record.setMineId(mineId);
    record.setAuthority(Authority.IBM.name());
    record.setRecordType(RecordType.RETURN.name());
    record.setTitle(title);
    record.setStatus(ComplianceStatus.SUBMITTED.name());
    record.setSubmittedOn(System.currentTimeMillis());
    record.setReferenceNumber(referenceNumber);
    return complianceRecordRepository.save(record);
  }

  @Override
  public ComplianceRecord addDocument(
      final String mineId,
      final String authority,
      final String recordType,
      final String title,
      final FileDetails attachment,
      final Long issuedOn,
      final Long expiry) {
    requireMineEdit(mineId);
    final ComplianceRecord record = new ComplianceRecord();
    record.setMineId(mineId);
    record.setAuthority(authority);
    record.setRecordType(recordType);
    record.setTitle(title);
    record.setAttachment(attachment);
    if (issuedOn != null) {
      record.setIssuedOn(issuedOn);
    }
    if (expiry != null) {
      record.setExpiry(expiry);
    }
    record.setStatus(
        (expiry != null && expiry < System.currentTimeMillis()
                ? ComplianceStatus.EXPIRED
                : ComplianceStatus.VALID)
            .name());
    return complianceRecordRepository.save(record);
  }

  @Override
  public ComplianceRecord markRegisterUpdated(final String mineId, final String recordId) {
    requireMineEdit(mineId);
    final ComplianceRecord record = complianceRecordRepository.findById(recordId);
    if (record == null || !mineId.equals(record.getMineId())) {
      throw new IllegalArgumentException("No register " + recordId + " for mine " + mineId);
    }
    record.setLastUpdatedAt(System.currentTimeMillis());
    record.setNotes("Updated via ComplianceOS");
    return complianceRecordRepository.save(record);
  }

  @Override
  public ComplianceRecord markReturnSubmitted(
      final String mineId, final String recordId, final String referenceNumber) {
    requireMineEdit(mineId);
    final ComplianceRecord record = complianceRecordRepository.findById(recordId);
    if (record == null || !mineId.equals(record.getMineId())) {
      throw new IllegalArgumentException("No compliance record " + recordId + " for mine " + mineId);
    }
    record.setStatus(ComplianceStatus.SUBMITTED.name());
    record.setSubmittedOn(System.currentTimeMillis());
    record.setReferenceNumber(referenceNumber);
    return complianceRecordRepository.save(record);
  }

  @Override
  public ComplianceRecord updateDocument(
      final String mineId,
      final String recordId,
      final String authority,
      final String recordType,
      final String title,
      final FileDetails attachment,
      final Long issuedOn,
      final Long expiry) {
    requireMineEdit(mineId);
    final ComplianceRecord record = complianceRecordRepository.findById(recordId);
    if (record == null || !mineId.equals(record.getMineId())) {
      throw new IllegalArgumentException("No compliance record " + recordId + " for mine " + mineId);
    }
    record.setAuthority(authority);
    record.setRecordType(recordType);
    record.setTitle(title);
    record.setAttachment(attachment);
    if (issuedOn != null) {
      record.setIssuedOn(issuedOn);
    }
    if (expiry != null) {
      record.setExpiry(expiry);
    }
    record.setStatus(
        (expiry != null && expiry < System.currentTimeMillis()
                ? ComplianceStatus.EXPIRED
                : ComplianceStatus.VALID)
            .name());
    return complianceRecordRepository.save(record);
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
    final Map<String, ComplianceRecord> found = complianceRecordRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(ComplianceRecord::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<ComplianceRecord> findComplianceRecords(final Query query) {
    final PaginatedResult<ComplianceRecord> result =
        complianceRecordRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(ComplianceRecord::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
            .toList());
    return result;
  }

  @Override
  public ComplianceProgress getComplianceProgress(final String mineId, final Query query) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return new ComplianceProgress(0, 0);
    }
    final Filter requestedFilter = query == null ? null : query.getFilter();
    final Filter filter =
        requestedFilter == null
            ? Filters.eq(ComplianceRecord.FIELD_MINE_ID, mineId)
            : Filters.and(Filters.eq(ComplianceRecord.FIELD_MINE_ID, mineId), requestedFilter);
    final List<ComplianceRecord> records =
        complianceRecordRepository
            .findByQuery(new Query().withFilter(filter).withPage(Page.UNBOUNDED))
            .getItems();

    final Instant now = Instant.now();
    int completed = 0;
    for (final ComplianceRecord record : records) {
      if (RecordType.valueOfOrDefault(record.getRecordType()) == RecordType.REGISTER) {
        final long daysSince =
            Math.max(
                0,
                Duration.between(Instant.ofEpochMilli(record.getLastUpdatedAt()), now).toDays());
        if (daysSince <= Math.max(record.getMaxDaysAllowed(), 1)) {
          completed++;
        }
      } else {
        final ComplianceStatus status = ComplianceStatus.valueOfOrDefault(record.getStatus());
        if (status == ComplianceStatus.VALID || status == ComplianceStatus.SUBMITTED) {
          completed++;
        }
      }
    }
    return new ComplianceProgress(records.size(), completed);
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
    final Map<String, MineRent> found = mineRentRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(MineRent::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<MineRent> findMineRents(final Query query) {
    final PaginatedResult<MineRent> result =
        mineRentRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(MineRent::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
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
    final Map<String, MinePayment> found = minePaymentRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(MinePayment::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<MinePayment> findPayments(final Query query) {
    final PaginatedResult<MinePayment> result =
        minePaymentRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(MinePayment::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
            .toList());
    return result;
  }

  @Override
  public MineStoppage saveMineStoppage(final MineStoppage stoppage, final boolean skipVersion) {
    requireMineEdit(stoppage.getMineId());
    stoppage.setId(MineStoppage.id(stoppage.getMineId(), stoppage.getStoppedOn()));
    return skipVersion
        ? mineStoppageRepository.saveIgnoringVersion(stoppage)
        : mineStoppageRepository.save(stoppage);
  }

  @Override
  public Map<String, MineStoppage> getMineStoppages(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, MineStoppage> found = mineStoppageRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(MineStoppage::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<MineStoppage> findMineStoppages(final Query query) {
    final PaginatedResult<MineStoppage> result =
        mineStoppageRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(MineStoppage::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
            .toList());
    return result;
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
    final Map<String, LaborDay> found = laborDayRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(LaborDay::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<LaborDay> findLaborDays(final Query query) {
    final PaginatedResult<LaborDay> result =
        laborDayRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(LaborDay::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
            .toList());
    return result;
  }

  @Override
  public LaborPayroll saveLaborPayroll(final LaborPayroll labor, final boolean skipVersion) {
    requireMineEdit(labor.getMineId());
    labor.setId(LaborPayroll.id(labor.getMineId(), labor.getPeriodStart()));
    return skipVersion
        ? laborPayrollRepository.saveIgnoringVersion(labor)
        : laborPayrollRepository.save(labor);
  }

  @Override
  public Map<String, LaborPayroll> getLaborPayrolls(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, LaborPayroll> found = laborPayrollRepository.findByIds(ids);
    final Set<String> mineIds =
        found.values().stream().map(LaborPayroll::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<LaborPayroll> findLaborPayrolls(final Query query) {
    final PaginatedResult<LaborPayroll> result =
        laborPayrollRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(LaborPayroll::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
            .toList());
    return result;
  }

  @Override
  public Sale saveSale(final Sale sale, final boolean skipVersion) {
    requireMineEdit(sale.getMineId());
    applyLiabilities(sale);
    return skipVersion
        ? saleRepository.saveIgnoringVersion(sale)
        : saleRepository.save(sale);
  }

  @Override
  public void recomputeSaleLiabilities(final String mineId) {
    final long recomputeSince = Instant.now().minus(RECOMPUTE_LOOKBACK).toEpochMilli();
    final PaginatedResult<Sale> sales =
        saleRepository.findByQuery(
            new Query()
                .withFilter(
                    Filters.and(
                        Filters.eq(Sale.FIELD_MINE_ID, mineId),
                        Filters.gte(Sale.FIELD_DISPATCHED_ON, recomputeSince)))
                .withPage(Page.UNBOUNDED));
    for (final Sale sale : sales.getItems()) {
      final SaleLiability previousLiability = sale.getLiability();
      applyLiabilities(sale);
      if (!Objects.equals(previousLiability, sale.getLiability())) {
        saleRepository.saveIgnoringVersion(sale);
      }
    }
  }

  /** Recomputes {@code sale}'s liability fields from whichever rate is currently in force. */
  private void applyLiabilities(final Sale sale) {
    final LiabilityCalculator calculator = new LiabilityCalculator(
            sale,
            mineRepository,
            mineralService,
            royaltyRateRepository,
            dmfRateRepository,
            nmetRateRepository,
            gstRateRepository);
    sale.setLiability(calculator.calculate());
  }

  @Override
  public Map<String, Sale> getSales(final List<String> ids) {
    if (CollectionUtils.isEmpty(ids)) {
      return Map.of();
    }
    final Map<String, Sale> found = saleRepository.findByIds(ids);
    final Set<String> mineIds = found.values().stream().map(Sale::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    return found.entrySet().stream()
        .filter(entry -> accessibleMines.containsKey(entry.getValue().getMineId()))
        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  @Override
  public PaginatedResult<Sale> findSales(final Query query) {
    final PaginatedResult<Sale> result =
        saleRepository.findByQuery(query == null ? new Query() : query);
    final Set<String> mineIds =
        result.getItems().stream().map(Sale::getMineId).collect(Collectors.toSet());
    final Map<String, Mine> accessibleMines = mineRepository.findByIds(mineIds);
    result.setItems(
        result.getItems().stream()
            .filter(entry -> accessibleMines.containsKey(entry.getMineId()))
            .toList());
    return result;
  }

  @Override
  public AggregationResult aggregateSales(final String mineId, final AggregationQuery query) {
    if (!mineRepository.hasPermission(mineId, Permission.READ)) {
      return AggregationResult.create(List.of());
    }
    final AggregationQuery source = query == null ? new AggregationQuery() : query;
    final AggregationQuery scoped = new AggregationQuery(source);
    final Filter mineFilter = Filters.eq(Sale.FIELD_MINE_ID, mineId);
    scoped.setFilter(source.getFilter() == null ? mineFilter : Filters.and(source.getFilter(), mineFilter));
    return saleRepository.aggregate(scoped);
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

  /**
   * Sale and ComplianceRecord are not independently permissioned: they are reached only through
   * their mine, so every write to one requires the caller to hold {@code permission} on its mine.
   */
  private void requireMineEdit(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.EDIT)) {
      throw new UnauthorizedException(AssetClass.MINE, mineId);
    }
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
}
