package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** A mine's overall {@link DgmsScore} verdict. */
public enum DgmsVerdict {
  GOOD,
  NEEDS_ATTENTION,
  CRITICAL,
  UNKNOWN;

  public static DgmsVerdict valueOfOrDefault(final String value) {
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
