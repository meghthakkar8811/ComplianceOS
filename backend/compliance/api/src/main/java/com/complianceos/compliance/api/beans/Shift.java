package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** Which shift a {@link ProductionEntry} was logged for. */
public enum Shift {
  DAY,
  NIGHT,
  GENERAL,
  UNKNOWN;

  public static Shift valueOfOrDefault(final String value) {
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
