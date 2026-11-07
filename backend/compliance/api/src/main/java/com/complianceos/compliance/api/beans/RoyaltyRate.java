package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;

/**
 * The base ad-valorem royalty rate in force for one state, mineral, and month — reference data,
 * shared across every customer, notified by the state government under the MMDR Act Second
 * Schedule. {@code grade} is set only for minerals whose Schedule entry is itself
 * grade-differentiated (e.g. limestone's LD vs. other grades, bauxite's metallurgical vs.
 * non-metallurgical grades) — left unset for a mineral whose Schedule rate applies uniformly
 * across every grade (e.g. iron ore, a flat percentage of IBM's own grade-specific average sale
 * price). Exactly one rate exists per (state, mineral, grade, year, month): its id is
 * deterministic ({@link #id}), so saving one for a combination that already has a rate replaces
 * it rather than creating a second. The DMF and NMET contributions owed on top of this rate are
 * deliberately not modeled here — see {@link DmfRate} and {@link NmetRate} — since both are set
 * by separate, independently-amendable central-government Rules notifications, not by this one.
 */
@Index(name = "royalty_rate_state_mineral_grade_idx", def = "{'state': 1, 'mineral': 1, 'grade': 1}")
public class RoyaltyRate extends BaseEntity {

  private String state;
  private String mineral;

  // One of the mineral's own grades (see Mineral), when the Schedule rate for this mineral
  // is itself grade-differentiated; null when it applies uniformly across every grade.
  private String grade;

  private int year;

  // A Month name; parse with Month.valueOfOrDefault, never typed as the enum itself so a value
  // an older/newer version doesn't recognize degrades to UNKNOWN instead of failing to load.
  private String month;

  // Rupees per tonne.
  private double ratePerTonne;

  private String sourceCitation;

  /**
   * The deterministic id of the rate for {@code state}, {@code mineral}, {@code grade}, {@code
   * year}, {@code month} — {@code grade} may be null, for a rate that applies across every grade
   * of the mineral.
   */
  public static String id(
      final String state, final String mineral, final String grade, final int year, final String month) {
    return state + ":" + mineral + ":" + grade + ":" + year + ":" + Month.valueOfOrDefault(month).name();
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

  public String getGrade() {
    return grade;
  }

  public void setGrade(String grade) {
    this.grade = grade;
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

  public double getRatePerTonne() {
    return ratePerTonne;
  }

  public void setRatePerTonne(double ratePerTonne) {
    this.ratePerTonne = ratePerTonne;
  }

  public String getSourceCitation() {
    return sourceCitation;
  }

  public void setSourceCitation(String sourceCitation) {
    this.sourceCitation = sourceCitation;
  }
}
