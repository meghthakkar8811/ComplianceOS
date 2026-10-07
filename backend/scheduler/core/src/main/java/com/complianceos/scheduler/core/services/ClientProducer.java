package com.complianceos.scheduler.core.services;

import com.agentengine.catalog.api.services.AgentService;
import com.agentengine.catalog.api.services.SessionService;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import io.quarkus.arc.DefaultBean;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;

/**
 * Produces gRPC client proxies for services not locally available in this deployable. Needed
 * because {@code compliance:jobs} (bundled here so its jobs are loadable by the scheduler) pulls
 * in {@code catalog:api} transitively via {@code compliance:api}, whose own {@code CatalogCaches}
 * requires these — neither of which this deployable hosts an implementation of.
 */
@Singleton
public class ClientProducer {

  @Produces
  @Singleton
  @DefaultBean
  public AgentService agentService(final MicroServiceClientProvider provider) {
    return provider.get(AgentService.class);
  }

  @Produces
  @Singleton
  @DefaultBean
  public SessionService sessionService(final MicroServiceClientProvider provider) {
    return provider.get(SessionService.class);
  }
}
