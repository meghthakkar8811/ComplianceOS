package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** A {@link ComplianceRecord}'s current standing. */
public enum ComplianceStatus {
  VALID,
  EXPIRED,
  PENDING_SUBMISSION,
  SUBMITTED,
  UNKNOWN;

  public static ComplianceStatus valueOfOrDefault(final String value) {
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
