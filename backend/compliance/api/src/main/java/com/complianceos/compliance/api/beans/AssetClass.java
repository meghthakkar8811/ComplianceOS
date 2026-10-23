package com.complianceos.compliance.api.beans;

/**
 * Asset-type identifiers. {@code MINE} is also the one {@code @Permissioned} asset class this
 * service declares; the others are plain type keys for the resource-catalog handler framework —
 * {@code ProductionEntry}, {@code Royalty}, {@code ComplianceRecord}, {@code MineRent}, {@code
 * MinePayment}, {@code Stoppage}, {@code LaborDay}, {@code MineLabor}, {@code Sale},
 * {@code StockBaseline}, and {@code ExMinePriceOverride} are not independently permissioned (see
 * their beans), so these names carry no grant/role meaning of their own.
 */
public interface AssetClass {
  String MINE = "Mine";
  String PRODUCTION_ENTRY = "ProductionEntry";
  String ROYALTY_RATE = "RoyaltyRate";
  String COMPLIANCE_RECORD = "ComplianceRecord";
  String MINE_RENT = "MineRent";
  String MINE_PAYMENT = "MinePayment";
  String STOPPAGE = "Stoppage";
  String LABOR_DAY = "LaborDay";
  String MINE_LABOR = "MineLabor";
  String SALE = "Sale";
  String STOCK_BASELINE = "StockBaseline";
  String EX_MINE_PRICE_OVERRIDE = "ExMinePriceOverride";
}
