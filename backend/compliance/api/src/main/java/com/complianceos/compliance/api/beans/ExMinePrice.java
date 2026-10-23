package com.complianceos.compliance.api.beans;

/**
 * A grade's ex-mine price for a month: paise per unit, and where the figure came from — an
 * {@link ExMinePriceOverride}, this month's {@link Sale} records averaged out, the most
 * recent earlier month that had either, or {@code NONE} if the grade has never sold or been
 * overridden. {@code source} is an {@link ExMinePriceSource} name; parse with
 * {@code ExMinePriceSource.valueOfOrDefault}. Computed on read, never stored.
 */
public record ExMinePrice(long pricePerUnit, String source) {}
