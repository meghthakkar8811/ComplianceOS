package com.complianceos.compliance.api.beans;

/** How many of a mine's {@link ComplianceRecord}s are currently up to date, out of how many it has. */
public record ComplianceProgress(int totalActions, int completedActions) {}
