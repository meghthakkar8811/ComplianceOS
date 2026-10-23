package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * A mine's surface rent or dead rent as fixed by its lease — a term, not a payment: {@link
 * MinePayment} records what was actually paid against it. Unlike royalty, neither figure is
 * calculated from production; both are periodically revised instead, so each revision is its own
 * record, valid from {@link #validFrom} until superseded ({@link #validTill} null means still
 * current). Dead rent always goes to the state government; surface rent goes to whoever owns the
 * surface, which {@link #payee} records since it isn't always the same. Not independently
 * permissioned — reached only through its mine, whose access governs it, same as {@link
 * ProductionEntry} and {@link ComplianceRecord}.
 */
@Index(name = "mine_rent_mine_idx", def = "{'mineId': 1}")
@Index(
    name = "mine_rent_mine_type_valid_idx",
    def = "{'mineId': 1, 'type': 1, 'validTill': 1}")
public class MineRent extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_TYPE = "type";
  public static final String FIELD_VALID_TILL = "validTill";

  private String mineId;

  // A PaymentType name; parse with PaymentType.valueOfOrDefault, never typed as the enum itself
  // so a value an older/newer version doesn't recognize degrades to UNKNOWN instead of failing
  // to load. Always RENT or DEAD_RENT for this bean.
  private String type;

  // Paise.
  private long amount;

  // Who this is owed to — the state government for dead rent, but for surface rent whoever owns
  // the surface, which may be a private landowner. Reference only, not validated or calculated
  // against.
  private String payee;

  private long validFrom;

  // Null while this is the current figure; set to the superseding revision's validFrom once one
  // is saved.
  private Long validTill;

  // When this is next owed, for the compliance calendar to remind against — not derived, since
  // cadence and exact dates vary by state and lease.
  private long nextDueOn;

  /** The deterministic id of a mine's rent revision for {@code type}, effective {@code validFrom}. */
  public static String id(final String mineId, final String type, final long validFrom) {
    return mineId + ":" + PaymentType.valueOfOrDefault(type).name() + ":" + validFrom;
  }

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

  public long getAmount() {
    return amount;
  }

  public void setAmount(long amount) {
    this.amount = amount;
  }

  public String getPayee() {
    return payee;
  }

  public void setPayee(String payee) {
    this.payee = payee;
  }

  public long getValidFrom() {
    return validFrom;
  }

  public void setValidFrom(long validFrom) {
    this.validFrom = validFrom;
  }

  public Long getValidTill() {
    return validTill;
  }

  public void setValidTill(Long validTill) {
    this.validTill = validTill;
  }

  public long getNextDueOn() {
    return nextDueOn;
  }

  public void setNextDueOn(long nextDueOn) {
    this.nextDueOn = nextDueOn;
  }
}
