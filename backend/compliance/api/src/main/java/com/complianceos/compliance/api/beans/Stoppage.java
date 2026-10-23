package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * One calendar day a mine didn't work, and why — IBM's monthly return needs both the day count
 * and the reason breakdown, and neither is derivable from {@link ProductionEntry}: a day with no
 * production entry could mean the mine didn't work, or just that nothing was logged for it. One
 * record per (mineId, day worked); a multi-day stoppage is one record per day, not one record
 * spanning several, so a month's days worked is simply the days in that month minus its distinct
 * stoppage days. Not independently permissioned — reached only through its mine, whose access
 * governs it, same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "stoppage_mine_idx", def = "{'mineId': 1}")
@Index(name = "stoppage_mine_day_idx", def = "{'mineId': 1, 'stoppedOn': 1}", unique = true)
public class Stoppage extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_STOPPED_ON = "stoppedOn";

  private String mineId;

  private long stoppedOn;

  // A StoppageReason name; parse with StoppageReason.valueOfOrDefault, never typed as the enum
  // itself so a value an older/newer version doesn't recognize degrades to UNKNOWN instead of
  // failing to load.
  private String reason;

  /**
   * The deterministic id of a mine's stoppage on the calendar day (UTC) {@code stoppedOn} falls
   * on — built from its year/month/day rather than the raw timestamp, so two saves anywhere
   * within the same day collide into one record regardless of the exact time of day passed in.
   */
  public static String id(final String mineId, final long stoppedOn) {
    final LocalDate day = Instant.ofEpochMilli(stoppedOn).atZone(ZoneOffset.UTC).toLocalDate();
    return mineId + ":" + day.getYear() + ":" + day.getMonthValue() + ":" + day.getDayOfMonth();
  }

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public long getStoppedOn() {
    return stoppedOn;
  }

  public void setStoppedOn(long stoppedOn) {
    this.stoppedOn = stoppedOn;
  }

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }
}
