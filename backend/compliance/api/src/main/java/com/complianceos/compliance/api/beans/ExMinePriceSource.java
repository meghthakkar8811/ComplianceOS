package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** Where a month's {@link ExMinePrice} came from, cheapest/most-authoritative first. */
public enum ExMinePriceSource {
  OVERRIDE,
  SALES,
  CARRIED_FORWARD,
  NONE,
  UNKNOWN;

  public static ExMinePriceSource valueOfOrDefault(final String value) {
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
