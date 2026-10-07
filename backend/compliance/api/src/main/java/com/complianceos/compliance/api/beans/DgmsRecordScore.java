package com.complianceos.compliance.api.beans;

/**
 * A REGISTER record's readiness score as of now: how many days overdue it is against its
 * allowance. {@code status} is a {@link DgmsRecordStatus} name; parse with
 * {@code DgmsRecordStatus.valueOfOrDefault}.
 */
public record DgmsRecordScore(
    ComplianceRecord register, int score, long daysSinceUpdate, String status) {}
