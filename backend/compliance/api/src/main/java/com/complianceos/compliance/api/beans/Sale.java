package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.builder.annotations.UiDate;
import com.agentengine.util.common.builder.annotations.UiField;
import com.agentengine.util.common.builder.annotations.UiLookup;
import com.agentengine.util.common.builder.annotations.UiLookupOption;
import com.agentengine.util.common.builder.annotations.UiNumber;
import com.agentengine.util.common.builder.annotations.UiSelect;

/**
 * One buyer's purchase of one grade's ore from a mine — IBM's §5 wants the buyer, quantity, and
 * sale value broken out per grade and per buyer, and this is also the ledger a grade's monthly
 * dispatched quantity and ex-mine price are derived from. {@link #deductionPerUnit} is only set
 * when the sale happened beyond mine-head (FOB, FOR, CIF, etc.) — the freight/loading/transport
 * cost incurred past the mine-head, in rupees per unit, that's subtracted out to get back to an
 * ex-mine price. Not independently permissioned — reached only through its mine, whose access
 * governs it, same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "sale_mine_idx", def = "{'mineId': 1}")
@Index(name = "sale_mine_mineral_grade_time_idx", def = "{'mineId': 1, 'mineral': 1, 'grade': 1, 'dispatchedOn': 1}")
public class Sale extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_MINERAL = "mineral";
  public static final String FIELD_GRADE = "grade";
  public static final String FIELD_DISPATCHED_ON = "dispatchedOn";
  public static final String FIELD_QUANTITY = "quantity";

  private String mineId;

  // The id of the mine's own Mineral record for whichever mineral this dispatch is of.
  @UiField(label = "Mineral", order = 15)
  @UiLookup(assetType = AssetClass.MINERAL, options = {@UiLookupOption(key = "mineId", expr = "$.mineId")})
  private String mineral;

  // One of the grades Mineral.mineral (above) lists.
  @UiField(label = "Grade", order = 20)
  @UiLookup(
      assetType = AssetClass.MINERAL_GRADE,
      options = {
        @UiLookupOption(key = "mineId", expr = "$.mineId"),
        @UiLookupOption(key = "mineral", expr = "$.mineral")
      })
  private String grade;

  @UiField(label = "Dispatched On", order = 10)
  @UiDate
  private long dispatchedOn;

  // A SaleType name; parse with SaleType.valueOfOrDefault, never typed as the enum
  // itself so a value an older/newer version doesn't recognize degrades to UNKNOWN instead of
  // failing to load.
  @UiField(label = "Type", order = 30)
  @UiSelect(enumType = SaleType.class)
  private String type;

  // The Buyer this dispatch went to.
  @UiField(label = "Buyer", order = 40)
  @UiLookup(assetType = AssetClass.BUYER)
  private String buyerId;

  @UiField(label = "Quantity", order = 50)
  @UiNumber
  private double quantity;

  // The total sale/FOB value for this dispatch, in rupees — not a unit price.
  @UiField(label = "Sale Value", order = 60)
  @UiNumber
  private double saleValue;

  // Rupees per unit; 0 when the sale didn't go beyond mine-head.
  @UiField(label = "Deduction Per Unit", order = 70)
  @UiNumber
  private double deductionPerUnit;

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

  public String getGrade() {
    return grade;
  }

  public void setGrade(String grade) {
    this.grade = grade;
  }

  public long getDispatchedOn() {
    return dispatchedOn;
  }

  public void setDispatchedOn(long dispatchedOn) {
    this.dispatchedOn = dispatchedOn;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getBuyerId() {
    return buyerId;
  }

  public void setBuyerId(String buyerId) {
    this.buyerId = buyerId;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
  }

  public double getSaleValue() {
    return saleValue;
  }

  public void setSaleValue(double saleValue) {
    this.saleValue = saleValue;
  }

  public double getDeductionPerUnit() {
    return deductionPerUnit;
  }

  public void setDeductionPerUnit(double deductionPerUnit) {
    this.deductionPerUnit = deductionPerUnit;
  }
}
