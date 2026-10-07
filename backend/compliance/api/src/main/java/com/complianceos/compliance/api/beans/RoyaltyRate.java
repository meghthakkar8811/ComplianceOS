package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * The base ad-valorem royalty rate in force for one state, mineral, and month — reference data,
 * shared across every customer, notified by the state government under the MMDR Act Second
 * Schedule. Exactly one exists per (state, mineral, year, month): its id is deterministic
 * ({@link #id}), so saving one for a combination that already has a rate replaces it rather than
 * creating a second. The DMF and NMET contributions owed on top of this rate are deliberately not
 * modeled here — see {@link DmfRate} and {@link NmetRate} — since both are set by separate,
 * independently-amendable central-government Rules notifications, not by this one.
 */
@Index(name = "royalty_rate_state_mineral_idx", def = "{'state': 1, 'mineral': 1}")
public class RoyaltyRate extends BaseEntity {

  private String state;
  private String mineral;
  private int year;

  // A Month name; parse with Month.valueOfOrDefault, never typed as the enum itself so a value
  // an older/newer version doesn't recognize degrades to UNKNOWN instead of failing to load.
  private String month;

  // Paise per tonne.
  private long ratePerTonne;

  private String sourceCitation;

  /** The deterministic id of the rate for {@code state}, {@code mineral}, {@code year}, {@code month}. */
  public static String id(final String state, final String mineral, final int year, final String month) {
    return state + ":" + mineral + ":" + year + ":" + Month.valueOfOrDefault(month).name();
  }

  public String getState() {
    return state;
  }

  public void setState(String state) {
    this.state = state;
  }

  public String getMineral() {
    return mineral;
  }

  public void setMineral(String mineral) {
    this.mineral = mineral;
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

  public long getRatePerTonne() {
    return ratePerTonne;
  }

  public void setRatePerTonne(long ratePerTonne) {
    this.ratePerTonne = ratePerTonne;
  }

  public String getSourceCitation() {
    return sourceCitation;
  }

  public void setSourceCitation(String sourceCitation) {
    this.sourceCitation = sourceCitation;
  }
}
