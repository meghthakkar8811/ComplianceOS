package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.services.MiningService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * Saving and deleting a {@link Buyer} — customer-scoped, not mine-scoped, unlike every other
 * entity this module's mine-scoped REST resources (e.g. {@link MineRestAPI}) address. Listing/
 * searching buyers goes through agent-engine's {@code ResourceCatalogAPI} instead, via
 * {@code BuyerAssetHandler}.
 */
@Path("/v1/buyers")
@Tag(name = "Buyers", description = "Buyer master data")
@ContextAware
@RunOnVirtualThread
public class BuyerRestAPI {

  private final MiningService service;

  @Inject
  public BuyerRestAPI(final MicroServiceClientProvider microServiceClientProvider) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
  }

  @POST
  @Path("/")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Create or update a buyer")
  public Buyer saveBuyer(
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final Buyer buyer) {
    return service.saveBuyer(buyer, skipVersion);
  }

  @DELETE
  @Path("/{buyerId}")
  @Operation(summary = "Delete a buyer")
  public void deleteBuyer(@PathParam("buyerId") final String buyerId) {
    service.deleteBuyer(buyerId);
  }
}
