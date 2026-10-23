package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

/**
 * A manually set ex-mine price for one grade in one month, overriding what {@link Sale}
 * would otherwise derive — for the case IBM's guidelines call out explicitly: no sale that month,
 * and no prior month's price to carry forward either, so the owner reports IBM's own published
 * price for that grade instead. One override per (mineId, mineralGrade, month); re-saving
 * replaces it. Not independently permissioned — reached only through its mine, whose access
 * governs it, same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "ex_mine_price_override_mine_idx", def = "{'mineId': 1}")
@Index(
    name = "ex_mine_price_override_mine_grade_period_idx",
    def = "{'mineId': 1, 'mineralGrade': 1, 'periodStart': 1}",
    unique = true)
public class ExMinePriceOverride extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_MINERAL_GRADE = "mineralGrade";
  public static final String FIELD_PERIOD_START = "periodStart";

  private String mineId;
  private String mineralGrade;

  // The first day of the month this override applies to.
  private long periodStart;

  // Paise per unit.
  private long pricePerUnit;

  /**
   * The deterministic id of the mine's override for {@code mineralGrade} in the calendar month
   * (UTC) {@code periodStart} falls in, so a second save for the same month replaces it.
   */
  public static String id(final String mineId, final String mineralGrade, final long periodStart) {
    final YearMonth month =
        YearMonth.from(Instant.ofEpochMilli(periodStart).atZone(ZoneOffset.UTC));
    return mineId + ":" + mineralGrade + ":" + month.getYear() + ":" + month.getMonthValue();
  }

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public String getMineralGrade() {
    return mineralGrade;
  }

  public void setMineralGrade(String mineralGrade) {
    this.mineralGrade = mineralGrade;
  }

  public long getPeriodStart() {
    return periodStart;
  }

  public void setPeriodStart(long periodStart) {
    this.periodStart = periodStart;
  }

  public long getPricePerUnit() {
    return pricePerUnit;
  }

  public void setPricePerUnit(long pricePerUnit) {
    this.pricePerUnit = pricePerUnit;
  }
}
