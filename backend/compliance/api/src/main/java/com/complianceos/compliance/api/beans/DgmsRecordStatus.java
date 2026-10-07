package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** A single {@link DgmsRecordScore}'s traffic-light standing. */
public enum DgmsRecordStatus {
  GREEN,
  AMBER,
  RED,
  UNKNOWN;

  public static DgmsRecordStatus valueOfOrDefault(final String value) {
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
