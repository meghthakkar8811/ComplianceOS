package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.annotations.Permissioned;
import com.agentengine.util.common.beans.BaseEntity;

@Index(name = "mine_name_idx", def = "{'name': 1}")
@Index(name = "mine_state_idx", def = "{'state': 1}")
@Index(name = "mine_is_active_idx", def = "{'active': 1}")
@Permissioned(assetClass = AssetClass.MINE)
public class Mine extends BaseEntity {

  private String name;
  private String leaseNumber;
  private String state;
  private String district;
  private String mineral;
  private String mineType;
  private boolean active = true;

  // When this mine's lease was granted — determines, among other things, which royalty rate
  // tier applies (see MiningConstants.LEASE_TIER_PRE_2015/LEASE_TIER_POST_2015).
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

  public String getMineral() {
    return mineral;
  }

  public void setMineral(String mineral) {
    this.mineral = mineral;
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
