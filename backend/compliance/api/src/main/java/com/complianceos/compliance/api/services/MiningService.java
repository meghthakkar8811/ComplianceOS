package com.complianceos.compliance.api.services;

import com.agentengine.util.common.beans.FileDetails;
import com.agentengine.util.common.query.AggregationQuery;
import com.agentengine.util.common.query.AggregationResult;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.beans.ComplianceProgress;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.GstRate;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborPayroll;
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
 * own. A sale's own royalty/DMF/NMET/GST liability is computed and stored on it directly (see
 * {@link #saveSale}, {@link #recomputeSaleLiabilities}) rather than recomputed fresh on every
 * read. Mineral stock/ex-mine-price ({@link MineralService}) is a separate service, since it is
 * its own self-contained area of logic rather than another mine sub-resource this class should
 * carry.
 */
@MicroService("compliance")
public interface MiningService {

  Mine saveMine(Mine mine, boolean skipVersion);

  Map<String, Mine> getMines(List<String> ids);

  void deleteMine(String id);

  PaginatedResult<Mine> findMines(Query query);

  /** Saves a buyer — customer-scoped, not mine-scoped, unlike every other entity in this service. */
  Buyer saveBuyer(Buyer buyer, boolean skipVersion);

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

  /** Records a statutory return as filed — a RETURN record for {@code title}, submitted now under {@code referenceNumber}. */
  ComplianceRecord fileReturn(String mineId, String title, String referenceNumber);

  /** Records a clearance, statutory plan, or notice the customer has on file, with its attachment. */
  ComplianceRecord addDocument(
      String mineId,
      String authority,
      String recordType,
      String title,
      FileDetails attachment,
      Long issuedOn,
      Long expiry);

  /** Marks a DGMS register as updated today. */
  ComplianceRecord markRegisterUpdated(String mineId, String recordId);

  /** Marks an existing return or notice as filed, recording the authority's reference number against it. */
  ComplianceRecord markReturnSubmitted(String mineId, String recordId, String referenceNumber);

  /** Updates an existing clearance, statutory plan, or notice's own editable fields. */
  ComplianceRecord updateDocument(
      String mineId,
      String recordId,
      String authority,
      String recordType,
      String title,
      FileDetails attachment,
      Long issuedOn,
      Long expiry);

  void deleteComplianceRecord(String id);

  Map<String, ComplianceRecord> getComplianceRecords(List<String> ids);

  /**
   * Records matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code ComplianceRecord} is not independently permissioned, so this filtering stands in for
   * the ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<ComplianceRecord> findComplianceRecords(Query query);

  /**
   * How many of the mine's compliance actions matching {@code query} are currently up to date,
   * out of how many match — {@code query}'s filter is applied as-is, same as {@link
   * #findComplianceRecords}; a null/empty filter is every record over its whole lifetime, not
   * just one window. A register (continuously tracked) has no {@code expiry} of its own, so a
   * filter on {@code expiry} excludes every register — callers wanting registers in a windowed
   * view must say so explicitly in their own filter.
   */
  ComplianceProgress getComplianceProgress(String mineId, Query query);

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


  /** Saves the day's headcount — a second save for the same mine and day replaces it. */
  LaborDay saveLaborDay(LaborDay day, boolean skipVersion);

  Map<String, LaborDay> getLaborDays(List<String> ids);

  /**
   * Headcount days matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code LaborDay} is not independently permissioned, so this filtering stands in for the ACL
   * filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<LaborDay> findLaborDays(Query query);


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
   * Re-derives {@code mineId}'s recent sales' (dispatched within the last month — a rate
   * correction is assumed to always land within that window) royalty/DMF/NMET/GST liability from
   * whichever rate is currently in force, saving only the ones whose resolved rate actually
   * changed. Not a customer-facing write — run by the recurring job that catches a sale left
   * stale by a rate change (or anything else) that happened after it was saved.
   */
  void recomputeSaleLiabilities(String mineId);

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
