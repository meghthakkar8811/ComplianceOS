package com.complianceos.compliance.api.beans;

/**
 * A mine's average daily employment per employment category for a month — each category's total
 * man-days across its {@link LaborDay} records, divided by the days the mine worked that month,
 * matching how IBM's monthly return defines the figure. Computed on read, never persisted.
 */
public record LaborSummary(
    double belowGroundAvgEmployment, double openCastAvgEmployment, double aboveGroundAvgEmployment) {}
