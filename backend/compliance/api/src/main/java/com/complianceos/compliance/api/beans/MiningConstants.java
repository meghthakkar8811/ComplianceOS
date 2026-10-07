package com.complianceos.compliance.api.beans;

import java.time.Instant;

/** Domain constants shared across the mining model, not specific to any one entity. */
public final class MiningConstants {

  /**
   * The District Mineral Foundation contribution rate dropped from 30% to 10% of royalty for
   * leases granted on or after this date (Mines and Minerals (Contribution to District Mineral
   * Foundation) Rules, 2015). A {@link RoyaltyRate}'s {@code tier} distinguishes the two.
   */
  public static final long DMF_RATE_CHANGE_CUTOFF = Instant.parse("2015-01-12T00:00:00Z").toEpochMilli();

  public static final String LEASE_TIER_PRE_2015 = "RegisteredBefore12Jan2015";
  public static final String LEASE_TIER_POST_2015 = "RegisteredAfter12Jan2015";

  private MiningConstants() {}
}
