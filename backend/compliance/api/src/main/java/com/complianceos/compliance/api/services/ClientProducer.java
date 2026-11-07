package com.complianceos.compliance.api.services;

import com.agentengine.util.ms.client.MicroServiceClientProvider;
import io.quarkus.arc.DefaultBean;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

@Singleton
public class ClientProducer {

  @Produces
  @Singleton
  @DefaultBean
  public MiningService miningService(final MicroServiceClientProvider provider) {
    return provider.get(MiningService.class);
  }

  @Produces
  @Singleton
  @DefaultBean
  public MineralService mineralService(final MicroServiceClientProvider provider) {
    return provider.get(MineralService.class);
  }

  @Produces
  @Singleton
  @DefaultBean
  public RoyaltyService royaltyService(final MicroServiceClientProvider provider) {
    return provider.get(RoyaltyService.class);
  }

  @Produces
  @Singleton
  @DefaultBean
  public InvoiceService invoiceService(final MicroServiceClientProvider provider) {
    return provider.get(InvoiceService.class);
  }

  @Produces
  @Singleton
  @DefaultBean
  public ComplianceProvisioningService complianceProvisioningService(final MicroServiceClientProvider provider) {
    return provider.get(ComplianceProvisioningService.class);
  }
}
