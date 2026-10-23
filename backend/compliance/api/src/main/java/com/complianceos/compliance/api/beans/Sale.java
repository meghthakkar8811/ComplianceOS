package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * One buyer's purchase of one grade's ore from a mine — IBM's §5 wants the buyer, quantity, and
 * sale value broken out per grade and per buyer, and this is also the ledger a grade's monthly
 * dispatched quantity and ex-mine price are derived from. {@link #deductionPerUnit} is only set
 * when the sale happened beyond mine-head (FOB, FOR, CIF, etc.) — the freight/loading/transport
 * cost incurred past the mine-head, in paise per unit, that's subtracted out to get back to an
 * ex-mine price. Not independently permissioned — reached only through its mine, whose access
 * governs it, same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "sale_mine_idx", def = "{'mineId': 1}")
@Index(name = "sale_mine_grade_time_idx", def = "{'mineId': 1, 'mineralGrade': 1, 'dispatchedOn': 1}")
public class Sale extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_MINERAL_GRADE = "mineralGrade";
  public static final String FIELD_DISPATCHED_ON = "dispatchedOn";

  private String mineId;
  private String mineralGrade;
  private long dispatchedOn;

  // A SaleType name; parse with SaleType.valueOfOrDefault, never typed as the enum
  // itself so a value an older/newer version doesn't recognize degrades to UNKNOWN instead of
  // failing to load.
  private String nature;

  private String buyerName;
  private String buyerRegistrationNumber;
  private double quantity;

  // The total sale/FOB value for this dispatch, in paise — not a unit price.
  private long saleValue;

  // Paise per unit; 0 when the sale didn't go beyond mine-head.
  private long deductionPerUnit;

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

  public long getDispatchedOn() {
    return dispatchedOn;
  }

  public void setDispatchedOn(long dispatchedOn) {
    this.dispatchedOn = dispatchedOn;
  }

  public String getNature() {
    return nature;
  }

  public void setNature(String nature) {
    this.nature = nature;
  }

  public String getBuyerName() {
    return buyerName;
  }

  public void setBuyerName(String buyerName) {
    this.buyerName = buyerName;
  }

  public String getBuyerRegistrationNumber() {
    return buyerRegistrationNumber;
  }

  public void setBuyerRegistrationNumber(String buyerRegistrationNumber) {
    this.buyerRegistrationNumber = buyerRegistrationNumber;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
  }

  public long getSaleValue() {
    return saleValue;
  }

  public void setSaleValue(long saleValue) {
    this.saleValue = saleValue;
  }

  public long getDeductionPerUnit() {
    return deductionPerUnit;
  }

  public void setDeductionPerUnit(long deductionPerUnit) {
    this.deductionPerUnit = deductionPerUnit;
  }
}
