package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** A {@link ProductionEntry}'s verification state. */
public enum ProductionStatus {
  PENDING,
  VERIFIED,
  UNKNOWN;

  public static ProductionStatus valueOfOrDefault(final String value) {
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
