package com.complianceos.compliance.api.beans;

public class IBMRegistration {

  private String registrationNumber;
  private double leaseArea;
  private double capacity;

  public double getCapacity() {
    return capacity;
  }

  public void setCapacity(double capacity) {
    this.capacity = capacity;
  }

  public double getLeaseArea() {
    return leaseArea;
  }

  public void setLeaseArea(double leaseArea) {
    this.leaseArea = leaseArea;
  }

  public String getRegistrationNumber() {
    return registrationNumber;
  }

  public void setRegistrationNumber(String registrationNumber) {
    this.registrationNumber = registrationNumber;
  }
}
