package com.complianceos.compliance.api.beans;

import java.util.Objects;

/**
 * A {@link Sale}'s royalty, DMF, NMET, and GST-on-royalty liability — each computed and stored at
 * save time against whichever rate was in force then (see {@code LiabilityCalculator}), never
 * recomputed fresh on every read.
 */
public class SaleLiability {
  private String royaltyRateId;
  private double royaltyAmount;
  private String dmfRateId;
  private double dmfAmount;
  private String nmetRateId;
  private double nmetAmount;
  private String gstRateId;
  private double gstAmount;

  public String getRoyaltyRateId() {
    return royaltyRateId;
  }

  public void setRoyaltyRateId(String royaltyRateId) {
    this.royaltyRateId = royaltyRateId;
  }

  public double getRoyaltyAmount() {
    return royaltyAmount;
  }

  public void setRoyaltyAmount(double royaltyAmount) {
    this.royaltyAmount = royaltyAmount;
  }

  public String getDmfRateId() {
    return dmfRateId;
  }

  public void setDmfRateId(String dmfRateId) {
    this.dmfRateId = dmfRateId;
  }

  public double getDmfAmount() {
    return dmfAmount;
  }

  public void setDmfAmount(double dmfAmount) {
    this.dmfAmount = dmfAmount;
  }

  public String getNmetRateId() {
    return nmetRateId;
  }

  public void setNmetRateId(String nmetRateId) {
    this.nmetRateId = nmetRateId;
  }

  public double getNmetAmount() {
    return nmetAmount;
  }

  public void setNmetAmount(double nmetAmount) {
    this.nmetAmount = nmetAmount;
  }

  public String getGstRateId() {
    return gstRateId;
  }

  public void setGstRateId(String gstRateId) {
    this.gstRateId = gstRateId;
  }

  public double getGstAmount() {
    return gstAmount;
  }

  public void setGstAmount(double gstAmount) {
    this.gstAmount = gstAmount;
  }

  @Override
  public boolean equals(Object o) {
    if (o == null || getClass() != o.getClass()) return false;
    SaleLiability that = (SaleLiability) o;
    return Double.compare(royaltyAmount, that.royaltyAmount) == 0 && Double.compare(dmfAmount, that.dmfAmount) == 0 && Double.compare(nmetAmount, that.nmetAmount) == 0 && Double.compare(gstAmount, that.gstAmount) == 0 && Objects.equals(royaltyRateId, that.royaltyRateId) && Objects.equals(dmfRateId, that.dmfRateId) && Objects.equals(nmetRateId, that.nmetRateId) && Objects.equals(gstRateId, that.gstRateId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(royaltyRateId, royaltyAmount, dmfRateId, dmfAmount, nmetRateId, nmetAmount, gstRateId, gstAmount);
  }
}
