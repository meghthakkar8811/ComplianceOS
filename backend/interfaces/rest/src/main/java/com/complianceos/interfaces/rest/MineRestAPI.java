package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.interfaces.rest.ResourceCatalogAPI;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.services.MiningService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * A mine's own lifecycle and its production entries. Listing/searching mines and production
 * entries goes through agent-engine's {@link ResourceCatalogAPI} instead — see this service's
 * registered {@code AssetHandler}s under {@code handlers}.
 */
@Path("/v1/mines")
@Tag(name = "Mines", description = "Mine lifecycle and production entries")
@ContextAware
@RunOnVirtualThread
public class MineRestAPI {

  private final MiningService service;

  @Inject
  public MineRestAPI(final MicroServiceClientProvider microServiceClientProvider) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
  }

  @POST
  @Path("/")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Create or update a mine")
  public Mine saveMine(
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final Mine mine) {
    return service.saveMine(mine, skipVersion);
  }

  @DELETE
  @Path("/{mineId}")
  @Operation(summary = "Delete a mine")
  public void deleteMine(@PathParam("mineId") final String mineId) {
    service.deleteMine(mineId);
  }

  @POST
  @Path("/{mineId}/production")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a production entry")
  public ProductionEntry saveProductionEntry(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final ProductionEntry entry) {
    entry.setMineId(mineId);
    return service.saveProductionEntry(entry, skipVersion);
  }

  @DELETE
  @Path("/{mineId}/production/{entryId}")
  @Operation(summary = "Delete a production entry")
  public void deleteProductionEntry(
      @PathParam("mineId") final String mineId, @PathParam("entryId") final String entryId) {
    service.deleteProductionEntry(entryId);
  }
}
