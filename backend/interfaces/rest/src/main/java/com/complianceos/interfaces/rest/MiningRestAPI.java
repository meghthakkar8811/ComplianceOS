package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.interfaces.rest.ResourceCatalogAPI;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.services.MiningService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * Everything mine-related that a mine's own id addresses directly: saving/deleting a mine,
 * saving a production entry or compliance record, and reading a mine's calculated royalty or
 * DGMS readiness. Listing/searching mines, production entries, royalty rates, and compliance
 * records goes through agent-engine's {@link ResourceCatalogAPI} instead — see this service's
 * registered {@code AssetHandler}s under {@code handlers}. There is no save endpoint for a
 * royalty rate or a royalty: a royalty rate is system-provisioned, and a royalty is calculated,
 * never written directly.
 */
@Path("/v1/mines")
@Tag(name = "Mining", description = "Mines and their production, royalty, compliance and DGMS data")
@ContextAware
@RunOnVirtualThread
public class MiningRestAPI {

  private final MiningService service;

  @Inject
  public MiningRestAPI(final MicroServiceClientProvider microServiceClientProvider) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
  }

  // ── Mines ──────────────────────────────────────────────────────────────

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

  @GET
  @Path("/{mineId}")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get a mine by ID")
  public Mine getMine(@PathParam("mineId") final String mineId) {
    return service.getMine(mineId);
  }

  @DELETE
  @Path("/{mineId}")
  @Operation(summary = "Delete a mine")
  public void deleteMine(@PathParam("mineId") final String mineId) {
    service.deleteMine(mineId);
  }

  // ── Production ─────────────────────────────────────────────────────────

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

  // ── Royalty ────────────────────────────────────────────────────────────
  // A mine's royalty is calculated from its production entries and the applicable royalty rate —
  // there is no save endpoint; it is recalculated automatically whenever production changes.

  @GET
  @Path("/{mineId}/royalty")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated royalty for every period")
  public PaginatedResult<Royalty> getRoyalties(@PathParam("mineId") final String mineId) {
    return service.getRoyaltiesByMine(mineId);
  }

  // ── Compliance records ────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/compliance-records")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a compliance record")
  public ComplianceRecord saveComplianceRecord(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final ComplianceRecord record) {
    record.setMineId(mineId);
    return service.saveComplianceRecord(record, skipVersion);
  }

  // ── DGMS ───────────────────────────────────────────────────────────────

  @GET
  @Path("/{mineId}/dgms-readiness")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's DGMS inspection readiness score")
  public DgmsScore getDgmsReadiness(@PathParam("mineId") final String mineId) {
    return service.getDgmsReadinessScore(mineId);
  }
}
