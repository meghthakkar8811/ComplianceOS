package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * A mine's royalty calculation for one period — derived entirely from its production entries and
 * the applicable {@link RoyaltyRate}, never written directly: {@code MiningServiceImpl}
 * recalculates and upserts it whenever a {@link ProductionEntry} for the period changes. Exactly
 * one exists per (mineId, year, month): its id is deterministic ({@link #id}). Not independently
 * permissioned — reached only through its mine, whose access governs it, same as
 * {@link ComplianceRecord}. Payment tracking (what's been paid, what's still due) is deliberately
 * not modeled here; it belongs on a separate payment entity against this one.
 */
@Index(name = "royalty_mine_idx", def = "{'mineId': 1}")
@Index(name = "royalty_period_idx", def = "{'year': 1, 'month': 1}")
public class Royalty extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";

  private String mineId;
  private int year;

  // A Month name; parse with Month.valueOfOrDefault, never typed as the enum itself so a value
  // an older/newer version doesn't recognize degrades to UNKNOWN instead of failing to load.
  private String month;

  // The RoyaltyRate this was calculated against — fetch it for the rates applied, rather than
  // snapshotting them here, since this doc already holds the amounts they produced.
  private String royaltyRateId;

  // Sum of quantityDispatched across every ProductionEntry for this mine and period.
  private double quantity;

  // Paise. quantity * royaltyRate.ratePerTonne
  private long baseAmount;

  // Paise. baseAmount * royaltyRate.dmfRate
  private long dmfAmount;

  // Paise. baseAmount * royaltyRate.nmetRate
  private long nmetAmount;

  // Paise. baseAmount + dmfAmount + nmetAmount
  private long grossLiability;

  /** The deterministic id of the royalty for {@code mineId}, {@code year}, {@code month}. */
  public static String id(final String mineId, final int year, final String month) {
    return mineId + ":" + year + ":" + Month.valueOfOrDefault(month).name();
  }

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public int getYear() {
    return year;
  }

  public void setYear(int year) {
    this.year = year;
  }

  public String getMonth() {
    return month;
  }

  public void setMonth(String month) {
    this.month = month;
  }

  public String getRoyaltyRateId() {
    return royaltyRateId;
  }

  public void setRoyaltyRateId(String royaltyRateId) {
    this.royaltyRateId = royaltyRateId;
  }

  public double getQuantity() {
    return quantity;
  }

  public void setQuantity(double quantity) {
    this.quantity = quantity;
  }

  public long getBaseAmount() {
    return baseAmount;
  }

  public void setBaseAmount(long baseAmount) {
    this.baseAmount = baseAmount;
  }

  public long getDmfAmount() {
    return dmfAmount;
  }

  public void setDmfAmount(long dmfAmount) {
    this.dmfAmount = dmfAmount;
  }

  public long getNmetAmount() {
    return nmetAmount;
  }

  public void setNmetAmount(long nmetAmount) {
    this.nmetAmount = nmetAmount;
  }

  public long getGrossLiability() {
    return grossLiability;
  }

  public void setGrossLiability(long grossLiability) {
    this.grossLiability = grossLiability;
  }
}
