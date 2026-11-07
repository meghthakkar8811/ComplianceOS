package com.complianceos.compliance.api.services;

import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.GstRate;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborPayroll;
import com.complianceos.compliance.api.beans.LaborSummary;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.MinePayment;
import com.complianceos.compliance.api.beans.MineRent;
import com.complianceos.compliance.api.beans.MineStoppage;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.beans.Sale;
import java.util.List;
import java.util.Map;

/**
 * Everything a mine and its statutory compliance involve: production, rent, payments, labor,
 * sales, and DGMS register tracking are all sub-resources of a mine, never addressed on their
 * own. Royalty-family computation ({@link RoyaltyService}) and mineral stock/ex-mine-price
 * ({@link MineralService}) are separate services, since they are each their own self-contained
 * area of logic rather than another mine sub-resource this class should carry.
 */
@MicroService("compliance")
public interface MiningService {

  Mine saveMine(Mine mine, boolean skipVersion);

  Mine getMine(String id);

  Map<String, Mine> getMines(List<String> ids);

  void deleteMine(String id);

  PaginatedResult<Mine> findMines(Query query);

  /** Saves a buyer — customer-scoped, not mine-scoped, unlike every other entity in this service. */
  Buyer saveBuyer(Buyer buyer, boolean skipVersion);

  Buyer getBuyer(String id);

  Map<String, Buyer> getBuyers(List<String> ids);

  void deleteBuyer(String id);

  PaginatedResult<Buyer> findBuyers(Query query);

  ProductionEntry saveProductionEntry(ProductionEntry entry, boolean skipVersion);

  Map<String, ProductionEntry> getProductionEntries(List<String> ids);

  /**
   * Entries matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code ProductionEntry} is not independently permissioned, so this filtering stands in for
   * the ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<ProductionEntry> findProductionEntries(Query query);

  void deleteProductionEntry(String id);

  RoyaltyRate saveRoyaltyRate(RoyaltyRate rate);

  PaginatedResult<RoyaltyRate> findRoyaltyRates(Query query);

  DmfRate saveDmfRate(DmfRate rate);

  NmetRate saveNmetRate(NmetRate rate);

  GstRate saveGstRate(GstRate rate);

  PaginatedResult<GstRate> findGstRates(Query query);

  ComplianceRecord saveComplianceRecord(ComplianceRecord record, boolean skipVersion);

  void deleteComplianceRecord(String id);

  Map<String, ComplianceRecord> getComplianceRecords(List<String> ids);

  /**
   * Records matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code ComplianceRecord} is not independently permissioned, so this filtering stands in for
   * the ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<ComplianceRecord> findComplianceRecords(Query query);

  /** The mine's current DGMS inspection readiness: a weighted score over its REGISTER records. */
  DgmsScore getDgmsReadinessScore(String mineId);

  /**
   * Saves a rent revision. When it's the first non-closed revision for its mine and {@code type}
   * at a later {@link MineRent#getValidFrom()}, the previously current revision is closed
   * (its {@code validTill} set to this one's {@code validFrom}) as part of the same save.
   */
  MineRent saveMineRent(MineRent rent, boolean skipVersion);

  Map<String, MineRent> getMineRents(List<String> ids);

  /**
   * Rent revisions matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code MineRent} is not independently permissioned, so this filtering stands in for the ACL
   * filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<MineRent> findMineRents(Query query);

  MinePayment savePayment(MinePayment payment, boolean skipVersion);

  Map<String, MinePayment> getPayments(List<String> ids);

  /**
   * Payments matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code MinePayment} is not independently permissioned, so this filtering stands in for the
   * ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<MinePayment> findPayments(Query query);

  /** Saves the stoppage for its day — a second save for the same mine and day replaces it. */
  MineStoppage saveMineStoppage(MineStoppage stoppage, boolean skipVersion);

  Map<String, MineStoppage> getMineStoppages(List<String> ids);

  /**
   * Stoppages matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code MineStoppage} is not independently permissioned, so this filtering stands in for the
   * ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<MineStoppage> findMineStoppages(Query query);

  /**
   * The mine's days worked in the month {@code asOf} falls in: the days in that month minus its
   * distinct {@link MineStoppage} days — never stored, since it's always derivable from them.
   */
  int getDaysWorked(String mineId, long asOf);

  /** Saves the day's headcount — a second save for the same mine and day replaces it. */
  LaborDay saveLaborDay(LaborDay day, boolean skipVersion);

  Map<String, LaborDay> getLaborDays(List<String> ids);

  /**
   * Headcount days matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code LaborDay} is not independently permissioned, so this filtering stands in for the ACL
   * filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<LaborDay> findLaborDays(Query query);

  /**
   * The mine's average daily employment per category for the month {@code asOf} falls in,
   * derived from its {@link LaborDay} records and {@link #getDaysWorked} — never stored.
   */
  LaborSummary getLaborSummary(String mineId, long asOf);

  /** Saves a month's labor return — a second save for the same mine and month replaces it. */
  LaborPayroll saveLaborPayroll(LaborPayroll labor, boolean skipVersion);

  Map<String, LaborPayroll> getLaborPayrolls(List<String> ids);

  /**
   * Labor returns matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code LaborPayroll} is not independently permissioned, so this filtering stands in for the
   * ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<LaborPayroll> findLaborPayrolls(Query query);

  /** Saves one buyer's purchase of one grade from the mine. */
  Sale saveSale(Sale sale, boolean skipVersion);

  Map<String, Sale> getSales(List<String> ids);

  /**
   * Sales matching {@code query}, filtered to the ones whose mine the caller may read — {@code
   * Sale} is not independently permissioned, so this filtering stands in for the ACL
   * filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<Sale> findSales(Query query);

  /**
   * The group-by/metrics buckets {@code query} asks for over {@code mineId}'s own {@link Sale}s
   * — empty if the caller may not read that mine. Always scoped to one mine explicitly, the same
   * way every other {@code Sale} operation is, rather than computing which mines the caller can
   * read and filtering buckets after the fact: a bucket can mix rows from several mines, so
   * filtering it post-aggregation can't undo an unscoped read the way filtering a list of rows
   * can.
   */
  AggregationResult aggregateSales(String mineId, AggregationQuery query);

  /**
   * Creates whatever of the mine's fixed DGMS registers and rolling-12-month recurring filing
   * deadlines don't exist yet — never touches a record that already exists, so a register or
   * deadline a user has already acted on is never reset. Called both when the mine is created
   * (see {@code MineChangeListener}) and periodically thereafter (see the compliance calendar
   * job), so the same mine's calendar keeps extending forward as time passes without either
   * caller duplicating this logic.
   */
  void ensureComplianceRecords(String mineId);
}
