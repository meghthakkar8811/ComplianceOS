package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.beans.FileDetails;

/**
 * The GST invoice issued for one {@link Sale} — its own id is always set to that sale's id, a
 * sale being invoiced at most once. Not independently permissioned — reached only through its
 * mine, whose access governs it, same as {@link Sale}. Not user-facing — Sale is the entity
 * customers create and edit; an Invoice is generated and only ever downloaded as a PDF, so it
 * carries no {@code @UiField} annotations. {@link #cgstAmount}/{@link #sgstAmount}/{@link
 * #igstAmount} are frozen at issue — exactly one of the CGST+SGST pair or IGST is nonzero,
 * depending on {@link #interState} — and {@link #gstRateId} snapshots the {@link GstRate} used
 * so a later rate change never retroactively changes an issued invoice.
 */
@Index(name = "invoice_mine_idx", def = "{'mineId': 1}")
public class Invoice extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";

  private String mineId;
  private String buyerId;
  private String invoiceNumber;
  private boolean interState;

  // Rupees, frozen at issue.
  private double cgstAmount;
  private double sgstAmount;
  private double igstAmount;

  // Snapshot reference to the GstRate applied at issue.
  private String gstRateId;

  private FileDetails invoiceFile;

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public String getBuyerId() {
    return buyerId;
  }

  public void setBuyerId(String buyerId) {
    this.buyerId = buyerId;
  }

  public String getInvoiceNumber() {
    return invoiceNumber;
  }

  public void setInvoiceNumber(String invoiceNumber) {
    this.invoiceNumber = invoiceNumber;
  }

  public boolean isInterState() {
    return interState;
  }

  public void setInterState(boolean interState) {
    this.interState = interState;
  }

  public double getCgstAmount() {
    return cgstAmount;
  }

  public void setCgstAmount(double cgstAmount) {
    this.cgstAmount = cgstAmount;
  }

  public double getSgstAmount() {
    return sgstAmount;
  }

  public void setSgstAmount(double sgstAmount) {
    this.sgstAmount = sgstAmount;
  }

  public double getIgstAmount() {
    return igstAmount;
  }

  public void setIgstAmount(double igstAmount) {
    this.igstAmount = igstAmount;
  }

  public String getGstRateId() {
    return gstRateId;
  }

  public void setGstRateId(String gstRateId) {
    this.gstRateId = gstRateId;
  }

  public FileDetails getInvoiceFile() {
    return invoiceFile;
  }

  public void setInvoiceFile(FileDetails invoiceFile) {
    this.invoiceFile = invoiceFile;
  }
}
