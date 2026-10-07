package com.complianceos.compliance.api.beans;

import java.util.List;

/**
 * A mine's overall DGMS inspection readiness: the weighted average of its records' scores.
 * {@code verdict} is a {@link DgmsVerdict} name; parse with
 * {@code DgmsVerdict.valueOfOrDefault}.
 */
public record DgmsScore(int overallScore, String verdict, List<DgmsRecordScore> scores) {}
