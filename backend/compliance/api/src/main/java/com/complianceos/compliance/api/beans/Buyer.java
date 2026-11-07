package com.complianceos.compliance.api.beans;

import com.agentengine.util.common.annotations.Index;
import com.agentengine.util.common.annotations.Permissioned;
import com.agentengine.util.common.beans.BaseEntity;
import com.agentengine.util.common.builder.annotations.UiAccess;
import com.agentengine.util.common.builder.annotations.UiAccessLevel;
import com.agentengine.util.common.builder.annotations.UiField;
import com.agentengine.util.common.builder.annotations.UiSelect;
import com.agentengine.util.common.builder.annotations.UiText;
import jakarta.validation.constraints.NotBlank;

/**
 * A buyer a mine dispatches ore to — the first customer-scoped (not mine-scoped) entity in this
 * service: a buyer is shared across every mine the customer owns, not tied to one of them, so
 * access to it is governed by its own grants rather than by a mine's.
 */
@Index(name = "buyer_name_idx", def = "{'name': 1}")
@Permissioned(assetClass = AssetClass.BUYER)
public class Buyer extends BaseEntity {

  @UiField(label = "Buyer Name", order = 10)
  @UiText
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotBlank
  private String name;

  @UiField(label = "GSTIN", order = 20)
  @UiText
  private String gstin;

  @UiField(label = "IBM Registration Number", order = 30)
  @UiText
  private String ibmRegistrationNumber;

  @UiField(label = "Address", order = 40)
  @UiText
  private String address;

  // Not an enum: the code never distinguishes between states, so which ones are offered is
  // reference data (mining_states.json), not a set the code itself needs to know about.
  @UiField(label = "State", order = 50)
  @UiSelect(optionsResource = "mining_states.json")
  @UiAccess(create = UiAccessLevel.REQUIRED, edit = UiAccessLevel.REQUIRED)
  @NotBlank
  private String state;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getGstin() {
    return gstin;
  }

  public void setGstin(String gstin) {
    this.gstin = gstin;
  }

  public String getIbmRegistrationNumber() {
    return ibmRegistrationNumber;
  }

  public void setIbmRegistrationNumber(String ibmRegistrationNumber) {
    this.ibmRegistrationNumber = ibmRegistrationNumber;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public String getState() {
    return state;
  }

  public void setState(String state) {
    this.state = state;
  }
}
