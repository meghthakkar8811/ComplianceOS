package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.beans.FileDetails;

/**
 * A mine's statutory compliance obligation: a clearance, a mandatory return/report, a statutory
 * plan, or a DGMS register — {@code recordType} distinguishes them. A clearance or plan is valid
 * from {@code issuedOn} until {@code expiry}; a return or notice has no {@code issuedOn} and uses
 * {@code expiry} as its filing deadline instead; a register has neither and is tracked by
 * {@code lastUpdatedAt} against its {@code maxDaysAllowed} window. Not independently
 * permissioned — reached only through its mine, whose access governs it.
 */
@Index(name = "compliance_record_mine_idx", def = "{'mineId': 1}")
@Index(name = "compliance_record_expiry_idx", def = "{'expiry': 1}")
@Index(
    name = "compliance_record_mine_register_idx",
    def = "{'mineId': 1, 'registerCode': 1}",
    unique = true,
    partialFilterExpression = "{'registerCode': {'$exists': true}}")
public class ComplianceRecord extends BaseEntity {

  public static final String FIELD_MINE_ID = "mineId";
  public static final String FIELD_STATUS = "status";
  public static final String FIELD_SUBMITTED_ON = "submittedOn";
  public static final String FIELD_LAST_UPDATED_AT = "lastUpdatedAt";
  public static final String FIELD_EXPIRY = "expiry";
  public static final String FIELD_REFERENCE_NUMBER = "referenceNumber";

  private String mineId;
  private String title;

  // A RecordType name; parse with RecordType.valueOfOrDefault, never typed as the enum itself so
  // a value an older/newer version doesn't recognize degrades to UNKNOWN instead of failing to load.
  private String recordType;

  // An Authority name; parse with Authority.valueOfOrDefault, same reason as recordType.
  private String authority;

  // A ComplianceStatus name; parse with ComplianceStatus.valueOfOrDefault, same reason as recordType.
  private String status;

  // Set for records with an authority-granted validity window (clearances, plans)
  private long issuedOn;

  // A clearance's lapse date, or a return/notice's filing deadline
  private long expiry;

  // Set once a RETURN/NOTICE/REPORT is filed
  private long submittedOn;

  // Set whenever a REGISTER is touched; the signal its readiness score is computed against
  private long lastUpdatedAt;

  private FileDetails attachment;
  private String notes;

  // Set once a RETURN/NOTICE/REPORT is filed: the authority's acknowledgment/receipt number
  private String referenceNumber;

  // REGISTER only: which register this is (e.g. ACCIDENT_REGISTER), used for readiness weighting
  private String registerCode;

  // REGISTER only: how many days after lastUpdatedAt the register is next due — the input that
  // recomputes expiry whenever it is touched, not an independent fact once expiry is set.
  private int maxDaysAllowed;

  public String getMineId() {
    return mineId;
  }

  public void setMineId(String mineId) {
    this.mineId = mineId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getRecordType() {
    return recordType;
  }

  public void setRecordType(String recordType) {
    this.recordType = recordType;
  }

  public String getAuthority() {
    return authority;
  }

  public void setAuthority(String authority) {
    this.authority = authority;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public long getIssuedOn() {
    return issuedOn;
  }

  public void setIssuedOn(long issuedOn) {
    this.issuedOn = issuedOn;
  }

  public long getExpiry() {
    return expiry;
  }

  public void setExpiry(long expiry) {
    this.expiry = expiry;
  }

  public long getSubmittedOn() {
    return submittedOn;
  }

  public void setSubmittedOn(long submittedOn) {
    this.submittedOn = submittedOn;
  }

  public long getLastUpdatedAt() {
    return lastUpdatedAt;
  }

  public void setLastUpdatedAt(long lastUpdatedAt) {
    this.lastUpdatedAt = lastUpdatedAt;
  }

  public FileDetails getAttachment() {
    return attachment;
  }

  public void setAttachment(FileDetails attachment) {
    this.attachment = attachment;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getReferenceNumber() {
    return referenceNumber;
  }

  public void setReferenceNumber(String referenceNumber) {
    this.referenceNumber = referenceNumber;
  }

  public String getRegisterCode() {
    return registerCode;
  }

  public void setRegisterCode(String registerCode) {
    this.registerCode = registerCode;
  }

  public int getMaxDaysAllowed() {
    return maxDaysAllowed;
  }

  public void setMaxDaysAllowed(int maxDaysAllowed) {
    this.maxDaysAllowed = maxDaysAllowed;
  }
}
