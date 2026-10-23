package com.complianceos.compliance.api.beans;

import java.util.Locale;

/** How a {@link Sale} left the mine, per IBM's monthly-return categories. */
public enum SaleType {
  DOMESTIC_SALE,
  EXPORT,
  DOMESTIC_TRANSFER,
  CAPTIVE_CONSUMPTION,
  UNKNOWN;

  public static SaleType valueOfOrDefault(final String value) {
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
