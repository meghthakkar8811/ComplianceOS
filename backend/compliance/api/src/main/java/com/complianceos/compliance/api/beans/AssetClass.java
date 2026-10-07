package com.complianceos.compliance.api.beans;

/**
 * Asset-type identifiers. {@code MINE} is also the one {@code @Permissioned} asset class this
 * service declares; the others are plain type keys for the resource-catalog handler framework —
 * {@code ProductionEntry}, {@code Royalty}, and {@code ComplianceRecord} are not independently
 * permissioned (see their beans), so these names carry no grant/role meaning of their own.
 */
public interface AssetClass {
  String MINE = "Mine";
  String PRODUCTION_ENTRY = "ProductionEntry";
  String ROYALTY_RATE = "RoyaltyRate";
  String COMPLIANCE_RECORD = "ComplianceRecord";
}
