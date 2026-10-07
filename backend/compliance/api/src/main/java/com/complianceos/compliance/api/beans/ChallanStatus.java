package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** A {@link Royalty}'s payment-challan state. */
public enum ChallanStatus {
  GENERATED,
  PAID,
  UNKNOWN;

  public static ChallanStatus valueOfOrDefault(final String value) {
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
