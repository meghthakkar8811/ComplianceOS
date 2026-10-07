package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** What kind of compliance obligation a {@link ComplianceRecord} is. */
public enum RecordType {
  CLEARANCE,
  RETURN,
  STATUTORY_PLAN,
  NOTICE,
  REPORT,
  REGISTER,
  UNKNOWN;

  public static RecordType valueOfOrDefault(final String value) {
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
