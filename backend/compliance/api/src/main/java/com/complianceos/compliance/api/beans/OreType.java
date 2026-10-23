package com.complianceos.compliance.api.beans;

import java.util.Locale;

/**
 * Which of IBM's two iron-ore categories a mine's ore body is — only meaningful when {@link
 * Mine#getMineral()} is iron ore; left {@code UNKNOWN} otherwise. The guideline allows ticking
 * both, so {@code BOTH} is a real value, not just a placeholder.
 */
public enum OreType {
  HEMATITE,
  MAGNETITE,
  BOTH,
  UNKNOWN;

  public static OreType valueOfOrDefault(final String value) {
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
