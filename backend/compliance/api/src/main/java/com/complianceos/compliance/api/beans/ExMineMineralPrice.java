package com.complianceos.compliance.api.beans;

/**
 * A grade's ex-mine price: rupees per unit, and where the figure came from — every {@link Sale}
 * ever recorded for the grade averaged out, else its {@link
 * Mineral.MineralGrade#getOpeningPricePerUnit()}, else {@code NONE} if neither exists. {@code
 * source} is an {@link ExMineMineralPriceSource} name; parse with {@code
 * ExMineMineralPriceSource.valueOfOrDefault}. Computed on read, never stored.
 */
public record ExMineMineralPrice(double pricePerUnit, String source) {}
