package com.complianceos.compliance.api.beans;

import java.util.Locale;

/**
 * What a {@link MinePayment} settles: a calculated royalty, DMF contribution, NMET contribution,
 * or GST-on-royalty RCM liability, or a fixed lease term from {@link MineRent}.
 */
public enum PaymentType {
  ROYALTY,
  DMF_CONTRIBUTION,
  NMET_CONTRIBUTION,
  GST_ON_ROYALTY_RCM,
  RENT,
  DEAD_RENT,
  UNKNOWN;

  public static PaymentType valueOfOrDefault(final String value) {
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
