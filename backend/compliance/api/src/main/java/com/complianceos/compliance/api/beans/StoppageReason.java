package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** Why a mine stopped working for some days in a month, as IBM's monthly return enumerates them. */
public enum StoppageReason {
  STRIKE,
  LOCKOUT,
  HEAVY_RAIN,
  LABOUR_SHORTAGE,
  TRANSPORT_BOTTLENECK,
  LACK_OF_DEMAND,
  UNECONOMIC_OPERATIONS,
  OTHER,
  UNKNOWN;

  public static StoppageReason valueOfOrDefault(final String value) {
    if (value == null) {
      return UNKNOWN;
    }
    try {
      return valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (final IllegalArgumentException ex) {
      return UNKNOWN;
    }
  }
}
