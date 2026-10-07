package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** The regulator a {@link ComplianceRecord} is owed to. */
public enum Authority {
  IBM,
  DGMS,
  MOEFCC,
  SPCB,
  STATE_GOVT,
  UNKNOWN;

  public static Authority valueOfOrDefault(final String value) {
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
