package com.complianceos.compliance.api.beans;

/**
 * A grade's opening and closing stock for a month — derived from its {@link StockBaseline} plus
 * every {@link ProductionEntry} and {@link Sale} since, never stored as a running
 * balance. Computed on read.
 */
public record StockBalance(double openingStock, double production, double dispatched, double closingStock) {}
