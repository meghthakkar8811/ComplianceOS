package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

/**
 * A mine's monthly labor return beyond what {@link LaborDay} can derive: wages paid per
 * employment category, and technical/supervisory staff count and salary — figures the owner
 * reports as an aggregate for the month, not derivable from any per-day record this service
 * tracks. One record per (mineId, month). Not independently permissioned — reached only through
 * its mine, whose access governs it, same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "mine_labor_mine_idx", def = "{'mineId': 1}")
@Index(name = "mine_labor_mine_period_idx", def = "{'mineId': 1, 'periodStart': 1}", unique = true)
public class LaborPayroll extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_PERIOD_START = "periodStart";

  private String mineId;

  // The first day of the month this return covers.
  private long periodStart;

  // Rupees.
  private double belowGroundWages;
  private double openCastWages;
  private double aboveGroundWages;

  private int technicalStaffCount;

  // Rupees.
  private double technicalStaffSalary;

  /**
   * The deterministic id of a mine's labor return for the calendar month (UTC) {@code
   * periodStart} falls in, so a second save for the same month replaces it rather than
   * duplicating.
   */
  public static String id(final String mineId, final long periodStart) {
    final YearMonth month =
        YearMonth.from(Instant.ofEpochMilli(periodStart).atZone(ZoneOffset.UTC));
    return mineId + ":" + month.getYear() + ":" + month.getMonthValue();
  }

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public long getPeriodStart() {
    return periodStart;
  }

  public void setPeriodStart(long periodStart) {
    this.periodStart = periodStart;
  }

  public double getBelowGroundWages() {
    return belowGroundWages;
  }

  public void setBelowGroundWages(double belowGroundWages) {
    this.belowGroundWages = belowGroundWages;
  }

  public double getOpenCastWages() {
    return openCastWages;
  }

  public void setOpenCastWages(double openCastWages) {
    this.openCastWages = openCastWages;
  }

  public double getAboveGroundWages() {
    return aboveGroundWages;
  }

  public void setAboveGroundWages(double aboveGroundWages) {
    this.aboveGroundWages = aboveGroundWages;
  }

  public int getTechnicalStaffCount() {
    return technicalStaffCount;
  }

  public void setTechnicalStaffCount(int technicalStaffCount) {
    this.technicalStaffCount = technicalStaffCount;
  }

  public double getTechnicalStaffSalary() {
    return technicalStaffSalary;
  }

  public void setTechnicalStaffSalary(double technicalStaffSalary) {
    this.technicalStaffSalary = technicalStaffSalary;
  }
}
