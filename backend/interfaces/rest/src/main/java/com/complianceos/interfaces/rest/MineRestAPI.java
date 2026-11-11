package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.interfaces.rest.ResourceCatalogAPI;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborPayroll;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.MinePayment;
import com.complianceos.compliance.api.beans.MineRent;
import com.complianceos.compliance.api.beans.MineStoppage;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.services.MineralService;
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
  private final MineralService mineralService;

  @Inject
  public MineRestAPI(final MicroServiceClientProvider microServiceClientProvider) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
    this.mineralService = microServiceClientProvider.getRaw(MineralService.class);
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
    service.deleteProductionEntry(mineId, entryId);
  }

  @POST
  @Path("/{mineId}/minerals")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a mineral and its grades/opening stock for a mine")
  public Mineral saveMineral(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final Mineral mineral) {
    return mineralService.saveMineral(mineId, mineral, skipVersion);
  }

  @POST
  @Path("/{mineId}/rents")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a surface rent or dead rent revision for a mine")
  public MineRent saveMineRent(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MineRent rent) {
    rent.setMineId(mineId);
    return service.saveMineRent(rent, skipVersion);
  }

  @POST
  @Path("/{mineId}/payments")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a statutory payment for a mine")
  public MinePayment savePayment(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MinePayment payment) {
    payment.setMineId(mineId);
    return service.savePayment(payment, skipVersion);
  }

  @POST
  @Path("/{mineId}/stoppages")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a mine stoppage day")
  public MineStoppage saveMineStoppage(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MineStoppage stoppage) {
    stoppage.setMineId(mineId);
    return service.saveMineStoppage(stoppage, skipVersion);
  }

  @POST
  @Path("/{mineId}/labor-days")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a daily labor headcount entry for a mine")
  public LaborDay saveLaborDay(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final LaborDay day) {
    day.setMineId(mineId);
    return service.saveLaborDay(day, skipVersion);
  }

  @POST
  @Path("/{mineId}/labor-payrolls")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a monthly labor payroll return for a mine")
  public LaborPayroll saveLaborPayroll(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final LaborPayroll payroll) {
    payroll.setMineId(mineId);
    return service.saveLaborPayroll(payroll, skipVersion);
  }
}
