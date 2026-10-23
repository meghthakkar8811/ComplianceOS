package com.complianceos.compliance.api.services;

import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.ExMinePrice;
import com.complianceos.compliance.api.beans.ExMinePriceOverride;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborSummary;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.MineLabor;
import com.complianceos.compliance.api.beans.MinePayment;
import com.complianceos.compliance.api.beans.MineRent;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.StockBalance;
import com.complianceos.compliance.api.beans.StockBaseline;
import com.complianceos.compliance.api.beans.Stoppage;
import java.util.List;
import java.util.Map;

/**
 * Everything a mine and its statutory compliance involve: production, royalty, filings, and DGMS
 * register tracking are all sub-resources of a mine, never addressed on their own.
 */
@MicroService("compliance")
public interface MiningService {

  Mine saveMine(Mine mine, boolean skipVersion);

  Mine getMine(String id);

  Map<String, Mine> getMines(List<String> ids);

  void deleteMine(String id);

  PaginatedResult<Mine> findMines(Query query);

  ProductionEntry saveProductionEntry(ProductionEntry entry, boolean skipVersion);

  Map<String, ProductionEntry> getProductionEntries(List<String> ids);

  /**
   * Entries matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code ProductionEntry} is not independently permissioned, so this filtering stands in for
   * the ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<ProductionEntry> findProductionEntries(Query query);

  void deleteProductionEntry(String id);

  /**
   * The mine's royalty for every period that has a {@link Sale} — computed fresh from
   * its dispatches and the applicable rates on every call, never stored.
   */
  List<Royalty> getRoyaltiesByMine(String mineId);

  /** The mine's royalty for the month {@code asOf} falls in, or null if it had no dispatches then. */
  Royalty getRoyalty(String mineId, long asOf);

  RoyaltyRate saveRoyaltyRate(RoyaltyRate rate);

  PaginatedResult<RoyaltyRate> findRoyaltyRates(Query query);

  DmfRate saveDmfRate(DmfRate rate);

  NmetRate saveNmetRate(NmetRate rate);

  ComplianceRecord saveComplianceRecord(ComplianceRecord record, boolean skipVersion);

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
  Stoppage saveStoppage(Stoppage stoppage, boolean skipVersion);

  Map<String, Stoppage> getStoppages(List<String> ids);

  /**
   * Stoppages matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code Stoppage} is not independently permissioned, so this filtering stands in for the ACL
   * filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<Stoppage> findStoppages(Query query);

  /**
   * The mine's days worked in the month {@code asOf} falls in: the days in that month minus its
   * distinct {@link Stoppage} days — never stored, since it's always derivable from them.
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
  MineLabor saveMineLabor(MineLabor labor, boolean skipVersion);

  Map<String, MineLabor> getMineLabors(List<String> ids);

  /**
   * Labor returns matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code MineLabor} is not independently permissioned, so this filtering stands in for the ACL
   * filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<MineLabor> findMineLabors(Query query);

  /** The grade's opening stock at the point this mine started being tracked on the platform. */
  StockBaseline saveStockBaseline(StockBaseline baseline, boolean skipVersion);

  Map<String, StockBaseline> getStockBaselines(List<String> ids);

  /**
   * Baselines matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code StockBaseline} is not independently permissioned, so this filtering stands in for the
   * ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<StockBaseline> findStockBaselines(Query query);

  /**
   * The mine's opening/closing stock of {@code mineralGrade} for the month {@code asOf} falls
   * in: derived from the grade's {@link StockBaseline} plus every {@link ProductionEntry} and
   * {@link Sale} between it and the end of that month — never stored.
   */
  StockBalance getStockBalance(String mineId, String mineralGrade, long asOf);

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
   * The grade's ex-mine price for the month {@code asOf} falls in: an {@link
   * ExMinePriceOverride} for that month if one exists, else that month's {@link Sale} records
   * averaged out, else the most recent earlier month that had either.
   */
  ExMinePrice getExMinePrice(String mineId, String mineralGrade, long asOf);

  /** Saves a month's manually set ex-mine price for a grade. */
  ExMinePriceOverride saveExMinePriceOverride(ExMinePriceOverride override, boolean skipVersion);

  Map<String, ExMinePriceOverride> getExMinePriceOverrides(List<String> ids);

  /**
   * Overrides matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code ExMinePriceOverride} is not independently permissioned, so this filtering stands in
   * for the ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<ExMinePriceOverride> findExMinePriceOverrides(Query query);

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
