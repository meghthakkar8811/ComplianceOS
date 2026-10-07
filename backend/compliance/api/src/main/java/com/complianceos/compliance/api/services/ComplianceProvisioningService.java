package com.complianceos.compliance.api.services;

import com.agentengine.util.infra.provisioning.ProvisioningService;
import com.agentengine.util.ms.client.MicroService;

/** Provisions the compliance service's own mongo client and microservice registration. */
@MicroService("compliance")
public interface ComplianceProvisioningService extends ProvisioningService {}
