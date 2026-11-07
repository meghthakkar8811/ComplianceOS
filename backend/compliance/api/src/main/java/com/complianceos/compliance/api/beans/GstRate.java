package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * The GST rate owed on royalty under reverse charge — a fraction of the royalty amount — in force
 * from {@code effectiveFrom} for one mineral: reference data, shared across every customer, set
 * nationally by HSN-code GST notification. Unlike {@link RoyaltyRate}, this does not vary by
 * state, only by mineral and time — the rate applicable to a mine as of a date is the one with
 * the latest {@code effectiveFrom} not after that date, for that mineral.
 */
@Index(name = "gst_rate_mineral_idx", def = "{'mineral': 1, 'effectiveFrom': -1}")
public class GstRate extends BaseEntity {

  public static final String FIELD_MINERAL = "mineral";
  public static final String FIELD_EFFECTIVE_FROM = "effectiveFrom";

  private String mineral;
  private long effectiveFrom;

  // Fraction, 1-based (0.18 = 18%).
  private double rate;

  private String sourceCitation;

  /** The deterministic id of the rate for {@code mineral} and {@code effectiveFrom}. */
  public static String id(final String mineral, final long effectiveFrom) {
    return mineral + ":" + effectiveFrom;
  }

  public String getMineral() {
    return mineral;
  }

  public void setMineral(String mineral) {
    this.mineral = mineral;
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
