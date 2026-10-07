package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * A mine's production/dispatch entry for one shift. Not independently permissioned — reached
 * only through its mine, whose access governs it, same as {@link Royalty} and
 * {@link ComplianceRecord}.
 */
@Index(name = "production_mine_idx", def = "{'mineId': 1}")
@Index(name = "production_time_idx", def = "{'entryTime': 1}")
public class ProductionEntry extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";

  private String mineId;
  private long entryTime;

  // A Shift name; parse with Shift.valueOfOrDefault, never typed as the enum itself so a value
  // an older/newer version doesn't recognize degrades to UNKNOWN instead of failing to load.
  private String shift;

  private String pitSection;
  private String mineralGrade;
  private double quantityProduced;
  private double quantityDispatched;
  private String supervisorName;
  private String remarks;

  // A ProductionStatus name; parse with ProductionStatus.valueOfOrDefault, never typed as the
  // enum itself so a value an older/newer version doesn't recognize degrades to UNKNOWN instead
  // of failing to load.
  private String status = ProductionStatus.PENDING.name();

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public long getEntryTime() {
    return entryTime;
  }

  public void setEntryTime(long entryTime) {
    this.entryTime = entryTime;
  }

  public String getShift() {
    return shift;
  }

  public void setShift(String shift) {
    this.shift = shift;
  }

  public String getPitSection() {
    return pitSection;
  }

  public void setPitSection(String pitSection) {
    this.pitSection = pitSection;
  }

  public String getMineralGrade() {
    return mineralGrade;
  }

  public void setMineralGrade(String mineralGrade) {
    this.mineralGrade = mineralGrade;
  }

  public double getQuantityProduced() {
    return quantityProduced;
  }

  public void setQuantityProduced(double quantityProduced) {
    this.quantityProduced = quantityProduced;
  }

  public double getQuantityDispatched() {
    return quantityDispatched;
  }

  public void setQuantityDispatched(double quantityDispatched) {
    this.quantityDispatched = quantityDispatched;
  }

  public String getSupervisorName() {
    return supervisorName;
  }

  public void setSupervisorName(String supervisorName) {
    this.supervisorName = supervisorName;
  }

  public String getRemarks() {
    return remarks;
  }

  public void setRemarks(String remarks) {
    this.remarks = remarks;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
