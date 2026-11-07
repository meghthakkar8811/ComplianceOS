package com.complianceos.compliance.api.beans;

/**
 * A grade's opening and closing stock — its {@link MineMineral.Grade#getOpeningStock()} plus
 * every {@link ProductionEntry} and {@link Sale} ever recorded for it, never stored as a running
 * balance. Computed on read.
 */
public record StockBalance(double openingStock, double production, double dispatched, double closingStock) {}
