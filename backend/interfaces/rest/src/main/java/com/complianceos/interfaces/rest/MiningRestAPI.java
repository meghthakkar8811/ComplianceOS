package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.interfaces.rest.ResourceCatalogAPI;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.ExMinePrice;
import com.complianceos.compliance.api.beans.ExMinePriceOverride;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborSummary;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.MineLabor;
import com.complianceos.compliance.api.beans.MinePayment;
import com.complianceos.compliance.api.beans.MineRent;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.StockBalance;
import com.complianceos.compliance.api.beans.StockBaseline;
import com.complianceos.compliance.api.beans.Stoppage;
import com.complianceos.compliance.api.services.MiningService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

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
  // A mine's royalty is computed fresh from its dispatches and the applicable rates on every
  // call — there is no save endpoint, and nothing to recalculate on a write.

  @GET
  @Path("/{mineId}/royalty")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated royalty for every period with a dispatch")
  public List<Royalty> getRoyalties(@PathParam("mineId") final String mineId) {
    return service.getRoyaltiesByMine(mineId);
  }

  @GET
  @Path("/{mineId}/royalty/period")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated royalty for the month a given timestamp falls in")
  public Royalty getRoyalty(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return service.getRoyalty(mineId, asOf);
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

  // ── Rent ───────────────────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/rent")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a rent or dead rent revision")
  public MineRent saveMineRent(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MineRent rent) {
    rent.setMineId(mineId);
    return service.saveMineRent(rent, skipVersion);
  }

  // ── Payments ───────────────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/payments")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a royalty, rent, or dead rent payment")
  public MinePayment savePayment(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MinePayment payment) {
    payment.setMineId(mineId);
    return service.savePayment(payment, skipVersion);
  }

  // ── Stoppages ──────────────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/stoppages")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a day the mine didn't work, and why")
  public Stoppage saveStoppage(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final Stoppage stoppage) {
    stoppage.setMineId(mineId);
    return service.saveStoppage(stoppage, skipVersion);
  }

  @GET
  @Path("/{mineId}/days-worked")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's days worked in the month a given timestamp falls in")
  public int getDaysWorked(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return service.getDaysWorked(mineId, asOf);
  }

  // ── Labor ──────────────────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/labor-days")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a day's employment headcount by category")
  public LaborDay saveLaborDay(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final LaborDay day) {
    day.setMineId(mineId);
    return service.saveLaborDay(day, skipVersion);
  }

  @GET
  @Path("/{mineId}/labor-summary")
  @Produces(APPLICATION_JSON)
  @Operation(
      summary = "Get the mine's average daily employment by category for the month a given timestamp falls in")
  public LaborSummary getLaborSummary(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return service.getLaborSummary(mineId, asOf);
  }

  @POST
  @Path("/{mineId}/labor")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a month's wages and technical-staff labor return")
  public MineLabor saveMineLabor(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MineLabor labor) {
    labor.setMineId(mineId);
    return service.saveMineLabor(labor, skipVersion);
  }

  // ── Stock ──────────────────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/stock-baselines")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Set a grade's opening stock as of mine provisioning")
  public StockBaseline saveStockBaseline(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final StockBaseline baseline) {
    baseline.setMineId(mineId);
    return service.saveStockBaseline(baseline, skipVersion);
  }

  @GET
  @Path("/{mineId}/stock-balance")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get a grade's opening/closing stock for the month a given timestamp falls in")
  public StockBalance getStockBalance(
      @PathParam("mineId") final String mineId,
      @QueryParam("mineralGrade") final String mineralGrade,
      @QueryParam("asOf") final long asOf) {
    return service.getStockBalance(mineId, mineralGrade, asOf);
  }

  // ── Dispatches & ex-mine price ────────────────────────────────────────

  @POST
  @Path("/{mineId}/sales")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record one buyer's purchase of one grade")
  public Sale saveSale(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final Sale sale) {
    sale.setMineId(mineId);
    return service.saveSale(sale, skipVersion);
  }

  @GET
  @Path("/{mineId}/ex-mine-price")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get a grade's ex-mine price for the month a given timestamp falls in")
  public ExMinePrice getExMinePrice(
      @PathParam("mineId") final String mineId,
      @QueryParam("mineralGrade") final String mineralGrade,
      @QueryParam("asOf") final long asOf) {
    return service.getExMinePrice(mineId, mineralGrade, asOf);
  }

  @POST
  @Path("/{mineId}/ex-mine-price-overrides")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Manually set a grade's ex-mine price for a month")
  public ExMinePriceOverride saveExMinePriceOverride(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final ExMinePriceOverride override) {
    override.setMineId(mineId);
    return service.saveExMinePriceOverride(override, skipVersion);
  }
}
