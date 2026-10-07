package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * The National Mineral Exploration Trust contribution rate — a fraction of base royalty — in
 * force from {@code effectiveFrom}: reference data, shared across every customer, set by the
 * National Mineral Exploration Trust Rules, 2015. Uniform nationally — unlike {@link DmfRate},
 * does not vary by lease tier, state, or mineral, only by time. The rate applicable as of a date
 * is the one with the latest {@code effectiveFrom} not after that date. Modeled separately from
 * {@link DmfRate} because the two are set by separate, independently-amendable Rules.
 */
@Index(name = "nmet_rate_effective_from_idx", def = "{'effectiveFrom': -1}")
public class NmetRate extends BaseEntity {

  public static final String FIELD_EFFECTIVE_FROM = "effectiveFrom";

  private long effectiveFrom;

  // Fraction of base royalty, 1-based (0.02 = 2%).
  private double rate;

  private String sourceCitation;

  /** The deterministic id of the rate for {@code effectiveFrom}. */
  public static String id(final long effectiveFrom) {
    return String.valueOf(effectiveFrom);
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
