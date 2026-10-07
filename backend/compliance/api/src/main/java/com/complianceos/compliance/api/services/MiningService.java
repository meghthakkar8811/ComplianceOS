package com.complianceos.compliance.api.services;

import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyRate;
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

  /** Saves the entry and recalculates its mine's royalty for the entry's period. */
  ProductionEntry saveProductionEntry(ProductionEntry entry, boolean skipVersion);

  Map<String, ProductionEntry> getProductionEntries(List<String> ids);

  /**
   * Entries matching {@code query}, filtered to the ones whose mine the caller may read —
   * {@code ProductionEntry} is not independently permissioned, so this filtering stands in for
   * the ACL filtering a {@code @Permissioned} entity's own repository would otherwise apply.
   */
  PaginatedResult<ProductionEntry> findProductionEntries(Query query);

  /** Deletes the entry and recalculates its mine's royalty for the entry's period. */
  void deleteProductionEntry(String id);

  /** A mine's royalty, calculated from its production entries — never written directly. */
  PaginatedResult<Royalty> getRoyaltiesByMine(String mineId);

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
   * Creates whatever of the mine's fixed DGMS registers and rolling-12-month recurring filing
   * deadlines don't exist yet — never touches a record that already exists, so a register or
   * deadline a user has already acted on is never reset. Called both when the mine is created
   * (see {@code MineChangeListener}) and periodically thereafter (see the compliance calendar
   * job), so the same mine's calendar keeps extending forward as time passes without either
   * caller duplicating this logic.
   */
  void ensureComplianceRecords(String mineId);
}
