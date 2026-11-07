package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.annotations.Permissioned;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.builder.annotations.UiAccess;
import com.agentengine.util.common.builder.annotations.UiAccessLevel;
import com.agentengine.util.common.builder.annotations.UiDate;
import com.agentengine.util.common.builder.annotations.UiField;
import com.agentengine.util.common.builder.annotations.UiSelect;
import com.agentengine.util.common.builder.annotations.UiText;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Index(name = "mine_name_idx", def = "{'name': 1}")
@Index(name = "mine_state_idx", def = "{'state': 1}")
@Index(name = "mine_is_active_idx", def = "{'active': 1}")
@Permissioned(assetClass = AssetClass.MINE)
public class Mine extends BaseEntity {

  public static final String FIELD_NAME = "name";
  public static final String FIELD_ACTIVE = "active";

  @UiField(label = "Mine Name", order = 10)
  @UiText
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotBlank
  private String name;

  @UiField(label = "Lease Number", order = 20)
  @UiText
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotBlank
  private String leaseNumber;

  @UiField(label = "GSTIN", order = 25)
  @UiText
  private String gstin;

  // Not an enum: the code never distinguishes between states, so which ones are offered is
  // reference data (mining_states.json), not a set the code itself needs to know about.
  @UiField(label = "State", order = 30)
  @UiSelect(optionsResource = "mining_states.json")
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotBlank
  private String state;

  @UiField(label = "District", order = 40)
  @UiText
  private String district;

  @UiField(label = "Mine Type", order = 60)
  @UiSelect(optionsResource = "mine_types.json")
  private String mineType;

  private boolean active = true;

  // When this mine's lease was granted — determines, among other things, which royalty rate
  // tier applies (see MiningConstants.LEASE_TIER_PRE_2015/LEASE_TIER_POST_2015).
  @UiField(label = "Lease Start Date", order = 70)
  @UiDate
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotNull
  private long leaseStartOn;

  private IBMRegistration ibmRegistration;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getLeaseNumber() {
    return leaseNumber;
  }

  public void setLeaseNumber(String leaseNumber) {
    this.leaseNumber = leaseNumber;
  }

  public String getGstin() {
    return gstin;
  }

  public void setGstin(String gstin) {
    this.gstin = gstin;
  }

  public String getState() {
    return state;
  }

  public void setState(String state) {
    this.state = state;
  }

  public String getDistrict() {
    return district;
  }

  public void setDistrict(String district) {
    this.district = district;
  }

  public String getMineType() {
    return mineType;
  }

  public void setMineType(String mineType) {
    this.mineType = mineType;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public long getLeaseStartOn() {
    return leaseStartOn;
  }

  public void setLeaseStartOn(long leaseStartOn) {
    this.leaseStartOn = leaseStartOn;
  }

  public IBMRegistration getIbmRegistration() {
    return ibmRegistration;
  }

  public void setIbmRegistration(IBMRegistration ibmRegistration) {
    this.ibmRegistration = ibmRegistration;
  }
}
