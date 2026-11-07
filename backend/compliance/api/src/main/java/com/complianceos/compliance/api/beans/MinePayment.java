package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * A payment a mine actually made against a statutory liability: royalty, a DMF or NMET
 * contribution, GST on royalty under reverse charge, rent, or dead rent. Royalty and the
 * DMF/NMET/GST-on-royalty liabilities are each computed and stored directly on the {@link Sale}
 * they're owed against (see {@code MiningService#saveSale}), so a payment against one of them
 * links {@link #referenceId} to that sale's own id; rent and dead rent are fixed lease terms
 * ({@link MineRent}), never computed by this service, so their payments carry no such link.
 * Several payments may settle one sale's liability over time (partial payments), and {@link
 * #receiptNumber} is what lets the mine owner prove to an inspector that a payment happened at
 * all. Not independently permissioned — reached only through its mine, whose access governs it,
 * same as {@link ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "mine_payment_mine_idx", def = "{'mineId': 1}")
@Index(name = "mine_payment_reference_idx", def = "{'referenceId': 1}")
public class MinePayment extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_PAID_ON = "paidOn";

  private String mineId;

  // A PaymentType name; parse with PaymentType.valueOfOrDefault, never typed as the enum itself
  // so a value an older/newer version doesn't recognize degrades to UNKNOWN instead of failing
  // to load.
  private String type;

  // Set only when type is ROYALTY, DMF_CONTRIBUTION, NMET_CONTRIBUTION, or GST_ON_ROYALTY_RCM:
  // the id of the Sale whose liability this payment settles, in part or in full.
  private String referenceId;

  // Rupees.
  private double amount;

  private long paidOn;

  // The authority's acknowledgment/challan/receipt number — proof the payment happened.
  private String receiptNumber;

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getReferenceId() {
    return referenceId;
  }

  public void setReferenceId(String referenceId) {
    this.referenceId = referenceId;
  }

  public double getAmount() {
    return amount;
  }

  public void setAmount(double amount) {
    this.amount = amount;
  }

  public long getPaidOn() {
    return paidOn;
  }

  public void setPaidOn(long paidOn) {
    this.paidOn = paidOn;
  }

  public String getReceiptNumber() {
    return receiptNumber;
  }

  public void setReceiptNumber(String receiptNumber) {
    this.receiptNumber = receiptNumber;
  }
}
