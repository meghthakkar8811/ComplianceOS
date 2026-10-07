package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * The District Mineral Foundation contribution rate — a fraction of base royalty — in force from
 * {@code effectiveFrom} for one lease {@code tier}: reference data, shared across every customer,
 * set by the Mines and Minerals (Contribution to District Mineral Foundation) Rules, 2015. Unlike
 * {@link RoyaltyRate}, this does not vary by state or mineral, only by {@code tier} (see
 * {@link MiningConstants#LEASE_TIER_PRE_2015}/{@link MiningConstants#LEASE_TIER_POST_2015}) and
 * time — the rate applicable to a mine as of a date is the one with the latest
 * {@code effectiveFrom} not after that date, for that mine's tier. Modeled separately from
 * {@link NmetRate} because the two are set by separate, independently-amendable Rules.
 */
@Index(name = "dmf_rate_tier_idx", def = "{'tier': 1, 'effectiveFrom': -1}")
public class DmfRate extends BaseEntity {

  public static final String FIELD_TIER = "tier";
  public static final String FIELD_EFFECTIVE_FROM = "effectiveFrom";

  private String tier;
  private long effectiveFrom;

  // Fraction of base royalty, 1-based (0.3 = 30%).
  private double rate;

  private String sourceCitation;

  /** The deterministic id of the rate for {@code tier} and {@code effectiveFrom}. */
  public static String id(final String tier, final long effectiveFrom) {
    return tier + ":" + effectiveFrom;
  }

  public String getTier() {
    return tier;
  }

  public void setTier(String tier) {
    this.tier = tier;
  }

  public long getEffectiveFrom() {
    return effectiveFrom;
  }

  public void setEffectiveFrom(long effectiveFrom) {
    this.effectiveFrom = effectiveFrom;
  }

  public double getRate() {
    return rate;
  }

  public void setRate(double rate) {
    this.rate = rate;
  }

  public String getSourceCitation() {
    return sourceCitation;
  }

  public void setSourceCitation(String sourceCitation) {
    this.sourceCitation = sourceCitation;
  }
}
