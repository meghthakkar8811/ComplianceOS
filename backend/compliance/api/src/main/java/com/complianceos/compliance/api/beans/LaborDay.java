package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * One calendar day's headcount for a mine, split into IBM's three employment categories (below
 * ground, open cast, above ground) — the raw data a month's average daily employment is derived
 * from, the same way {@link Stoppage} is what {@code daysWorked} is derived from. One record per
 * (mineId, day worked). Not independently permissioned — reached only through its mine, whose
 * access governs it, same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "labor_day_mine_idx", def = "{'mineId': 1}")
@Index(name = "labor_day_mine_date_idx", def = "{'mineId': 1, 'workedOn': 1}", unique = true)
public class LaborDay extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_WORKED_ON = "workedOn";

  private String mineId;

  private long workedOn;

  private int belowGroundCount;
  private int openCastCount;
  private int aboveGroundCount;

  /**
   * The deterministic id of a mine's headcount on the calendar day (UTC) {@code workedOn} falls
   * on — built from its year/month/day rather than the raw timestamp, so two saves anywhere
   * within the same day collide into one record regardless of the exact time of day passed in.
   */
  public static String id(final String mineId, final long workedOn) {
    final LocalDate day = Instant.ofEpochMilli(workedOn).atZone(ZoneOffset.UTC).toLocalDate();
    return mineId + ":" + day.getYear() + ":" + day.getMonthValue() + ":" + day.getDayOfMonth();
  }

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public long getWorkedOn() {
    return workedOn;
  }

  public void setWorkedOn(long workedOn) {
    this.workedOn = workedOn;
  }

  public int getBelowGroundCount() {
    return belowGroundCount;
  }

  public void setBelowGroundCount(int belowGroundCount) {
    this.belowGroundCount = belowGroundCount;
  }

  public int getOpenCastCount() {
    return openCastCount;
  }

  public void setOpenCastCount(int openCastCount) {
    this.openCastCount = openCastCount;
  }

  public int getAboveGroundCount() {
    return aboveGroundCount;
  }

  public void setAboveGroundCount(int aboveGroundCount) {
    this.aboveGroundCount = aboveGroundCount;
  }
}
