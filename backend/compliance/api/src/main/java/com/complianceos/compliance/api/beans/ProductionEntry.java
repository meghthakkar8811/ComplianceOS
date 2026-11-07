package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.builder.annotations.UiField;
import com.agentengine.util.common.builder.annotations.UiLookup;
import com.agentengine.util.common.builder.annotations.UiLookupOption;

/**
 * A mine's production entry for one shift, one pit section, one grade. What it dispatches is
 * tracked separately, per buyer, by {@link Sale} — not independently permissioned —
 * reached only through its mine, whose access governs it, same as {@link Sale} and
 * {@link ComplianceRecord}.
 */
@Index(name = "production_mine_idx", def = "{'mineId': 1}")
@Index(name = "production_time_idx", def = "{'entryTime': 1}")
public class ProductionEntry extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_ENTRY_TIME = "entryTime";
  public static final String FIELD_MINERAL = "mineral";
  public static final String FIELD_GRADE = "grade";

  private String mineId;
  private long entryTime;

  // A Shift name; parse with Shift.valueOfOrDefault, never typed as the enum itself so a value
  // an older/newer version doesn't recognize degrades to UNKNOWN instead of failing to load.
  private String shift;

  private String pitSection;

  // The id of the mine's own Mineral record for whichever mineral this entry is of.
  @UiField(label = "Mineral", order = 15)
  @UiLookup(assetType = AssetClass.MINERAL, options = {@UiLookupOption(key = "mineId", expr = "$.mineId")})
  private String mineral;

  // One of the grades that Mineral lists.
  @UiField(label = "Grade", order = 20)
  @UiLookup(
      assetType = AssetClass.MINERAL_GRADE,
      options = {
        @UiLookupOption(key = "mineId", expr = "$.mineId"),
        @UiLookupOption(key = "mineral", expr = "$.mineral")
      })
  private String grade;

  private double quantity;
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

  public String getMineral() {
    return mineral;
  }

  public void setMineral(String mineral) {
    this.mineral = mineral;
  }

  public String getGrade() {
    return grade;
  }

  public void setGrade(String grade) {
    this.grade = grade;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
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
