package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * The ROM/processed-ore stock a grade already had, as of {@link #asOf}, at the point this mine
 * started being tracked on the platform — captured once, during mine provisioning, so every
 * month's opening/closing stock after it can be derived purely from {@link ProductionEntry} and
 * {@link Sale} without ever storing a running balance. One baseline per (mineId,
 * mineralGrade); re-saving replaces it, it is not a revision history. Not independently
 * permissioned — reached only through its mine, whose access governs it, same as {@link
 * ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "stock_baseline_mine_idx", def = "{'mineId': 1}")
@Index(name = "stock_baseline_mine_grade_idx", def = "{'mineId': 1, 'mineralGrade': 1}", unique = true)
public class StockBaseline extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_MINERAL_GRADE = "mineralGrade";

  private String mineId;
  private String mineralGrade;
  private double openingStock;
  private long asOf;

  /** The deterministic id of the mine's one baseline for {@code mineralGrade}. */
  public static String id(final String mineId, final String mineralGrade) {
    return mineId + ":" + mineralGrade;
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

  public double getOpeningStock() {
    return openingStock;
  }

  public void setOpeningStock(double openingStock) {
    this.openingStock = openingStock;
  }

  public long getAsOf() {
    return asOf;
  }

  public void setAsOf(long asOf) {
    this.asOf = asOf;
  }
}
