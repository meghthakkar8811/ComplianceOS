package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.builder.annotations.UiAccess;
import com.agentengine.util.common.builder.annotations.UiAccessLevel;
import com.agentengine.util.common.builder.annotations.UiField;
import com.agentengine.util.common.builder.annotations.UiLookup;
import com.agentengine.util.common.builder.annotations.UiLookupOption;
import com.agentengine.util.common.builder.annotations.UiNumber;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

/**
 * One mineral's grades for a mine, each with the opening stock and opening ex-mine price it
 * started with at the point this mine began being tracked on the platform — captured once, during
 * mine provisioning, so every later stock figure can be derived purely from {@link
 * ProductionEntry} and {@link Sale} without ever storing a running balance, and every later
 * ex-mine price falls back to the opening one only once no sale exists to average instead. One
 * record per (mineId, mineral); re-saving replaces it, it is not a revision history. Not
 * independently permissioned — reached only through its mine, whose access governs it, same as
 * {@link ProductionEntry} and {@link ComplianceRecord}. This same class also deserializes the
 * platform's static mineral catalog ({@code minerals.json}) — those entries simply have no
 * {@code mineId} and no grade carries opening stock/price, since neither is meaningful outside a
 * specific mine (see {@code MineralServiceImpl}).
 */
@Index(name = "mine_mineral_mine_idx", def = "{'mineId': 1}")
public class Mineral extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";

  private String mineId;

  @UiField(label = "Mineral", order = 10)
  @UiLookup(assetType = AssetClass.MINERAL)
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotBlank
  private String mineral;

  @UiField(label = "Grades", order = 20)
  private List<MineralGrade> grades;

  /** The deterministic id of the mine's one record for {@code mineral}. */
  public static String id(final String mineId, final String mineral) {
    return mineId + ":" + mineral;
  }

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public String getMineral() {
    return mineral;
  }

  public void setMineral(String mineral) {
    this.mineral = mineral;
  }

  public List<MineralGrade> getGrades() {
    return grades;
  }

  public void setGrades(List<MineralGrade> grades) {
    this.grades = grades;
  }

  /**
   * One grade's opening stock and opening ex-mine price as of the point this mine started being
   * tracked — either may be unset when that grade had nothing to carry forward.
   */
  public static class MineralGrade {

    // One of the standard grades the platform's mineral catalog (minerals.json) lists for the
    // enclosing Mineral's own mineral.
    @UiField(label = "Grade", order = 10)
    @UiLookup(assetType = AssetClass.MINERAL_GRADE, options = {@UiLookupOption(key = "mineral", expr = "$.mineral")})
    @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
    @NotBlank
    private String name;

    @UiField(label = "Opening Stock", order = 20)
    @UiNumber
    private Double openingStock;

    // Rupees per unit.
    @UiField(label = "Opening Price Per Unit", order = 30)
    @UiNumber
    private Double openingPricePerUnit;

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public Double getOpeningStock() {
      return openingStock;
    }

    public void setOpeningStock(Double openingStock) {
      this.openingStock = openingStock;
    }

    public Double getOpeningPricePerUnit() {
      return openingPricePerUnit;
    }

    public void setOpeningPricePerUnit(Double openingPricePerUnit) {
      this.openingPricePerUnit = openingPricePerUnit;
    }
  }
}
