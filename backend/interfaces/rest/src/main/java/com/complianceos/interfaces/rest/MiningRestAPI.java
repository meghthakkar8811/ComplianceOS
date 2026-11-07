package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.interfaces.rest.ResourceCatalogAPI;
import com.agentengine.util.cloudstorage.FileService;
import com.agentengine.util.common.beans.FileDetails;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.beans.DgmsScore;
import com.complianceos.compliance.api.beans.DmfContribution;
import com.complianceos.compliance.api.beans.ExMineMineralPrice;
import com.complianceos.compliance.api.beans.Invoice;
import com.complianceos.compliance.api.beans.LaborDay;
import com.complianceos.compliance.api.beans.LaborPayroll;
import com.complianceos.compliance.api.beans.LaborSummary;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.MinePayment;
import com.complianceos.compliance.api.beans.MineRent;
import com.complianceos.compliance.api.beans.MineStoppage;
import com.complianceos.compliance.api.beans.NmetContribution;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyGst;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.StockBalance;
import com.complianceos.compliance.api.services.InvoiceService;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.api.services.MiningService;
import com.complianceos.compliance.api.services.RoyaltyService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
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
  private final RoyaltyService royaltyService;
  private final MineralService mineralService;
  private final InvoiceService invoiceService;
  private final FileService fileService;

  @Inject
  public MiningRestAPI(
      final MicroServiceClientProvider microServiceClientProvider,
      final InvoiceService invoiceService,
      final FileService fileService) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
    this.royaltyService = microServiceClientProvider.getRaw(RoyaltyService.class);
    this.mineralService = microServiceClientProvider.getRaw(MineralService.class);
    this.invoiceService = invoiceService;
    this.fileService = fileService;
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

  // ── Royalty family ─────────────────────────────────────────────────────
  // Every royalty-family liability is computed fresh from a mine's dispatches and the applicable
  // rates on every call — there is no save endpoint, and nothing to recalculate on a write.

  @GET
  @Path("/{mineId}/royalty")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated royalty for every period with a dispatch")
  public List<Royalty> getRoyalties(@PathParam("mineId") final String mineId) {
    return royaltyService.getRoyaltiesByMine(mineId);
  }

  @GET
  @Path("/{mineId}/royalty/period")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated royalty, one row per mineral, for the month a given timestamp falls in")
  public List<Royalty> getRoyalty(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return royaltyService.getRoyalty(mineId, asOf);
  }

  @GET
  @Path("/{mineId}/dmf-contributions")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated DMF contribution for every period with a dispatch")
  public List<DmfContribution> getDmfContributions(@PathParam("mineId") final String mineId) {
    return royaltyService.getDmfContributionsByMine(mineId);
  }

  @GET
  @Path("/{mineId}/dmf-contributions/period")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated DMF contribution for the month a given timestamp falls in")
  public DmfContribution getDmfContribution(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return royaltyService.getDmfContribution(mineId, asOf);
  }

  @GET
  @Path("/{mineId}/nmet-contributions")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated NMET contribution for every period with a dispatch")
  public List<NmetContribution> getNmetContributions(@PathParam("mineId") final String mineId) {
    return royaltyService.getNmetContributionsByMine(mineId);
  }

  @GET
  @Path("/{mineId}/nmet-contributions/period")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated NMET contribution for the month a given timestamp falls in")
  public NmetContribution getNmetContribution(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return royaltyService.getNmetContribution(mineId, asOf);
  }

  @GET
  @Path("/{mineId}/royalty-gst")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated GST-on-royalty RCM liability for every period with a dispatch")
  public List<RoyaltyGst> getRoyaltyGst(@PathParam("mineId") final String mineId) {
    return royaltyService.getRoyaltyGstByMine(mineId);
  }

  @GET
  @Path("/{mineId}/royalty-gst/period")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get the mine's calculated GST-on-royalty RCM liability, one row per (mineral, grade), for the month a given timestamp falls in")
  public List<RoyaltyGst> getRoyaltyGst(
      @PathParam("mineId") final String mineId, @QueryParam("asOf") final long asOf) {
    return royaltyService.getRoyaltyGst(mineId, asOf);
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

  @DELETE
  @Path("/{mineId}/compliance-records/{recordId}")
  @Operation(summary = "Delete a compliance record")
  public void deleteComplianceRecord(
      @PathParam("mineId") final String mineId, @PathParam("recordId") final String recordId) {
    service.deleteComplianceRecord(recordId);
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
  public MineStoppage saveMineStoppage(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final MineStoppage stoppage) {
    stoppage.setMineId(mineId);
    return service.saveMineStoppage(stoppage, skipVersion);
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
  @Path("/{mineId}/labor-payroll")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Save a month's wages and technical-staff labor return")
  public LaborPayroll saveLaborPayroll(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final LaborPayroll labor) {
    labor.setMineId(mineId);
    return service.saveLaborPayroll(labor, skipVersion);
  }

  // ── Minerals & stock ───────────────────────────────────────────────────

  @POST
  @Path("/{mineId}/minerals")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Set a mineral's grades — their opening stock and ex-mine price baselines")
  public Mineral saveMineral(
      @PathParam("mineId") final String mineId,
      @QueryParam("skipVersion") @DefaultValue("false") final boolean skipVersion,
      final Mineral mineral) {
    return mineralService.saveMineral(mineId, mineral, skipVersion);
  }

  @GET
  @Path("/{mineId}/stock-balance")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get a grade's current opening/closing stock")
  public StockBalance getStockBalance(
      @PathParam("mineId") final String mineId,
      @QueryParam("mineral") final String mineral,
      @QueryParam("grade") final String grade) {
    return mineralService.getStockBalance(mineId, mineral, grade);
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
  @Operation(summary = "Get a grade's current ex-mine price")
  public ExMineMineralPrice getExMineMineralPrice(
      @PathParam("mineId") final String mineId,
      @QueryParam("mineral") final String mineral,
      @QueryParam("grade") final String grade) {
    return mineralService.getExMineMineralPrice(mineId, mineral, grade);
  }

  // ── Invoices ───────────────────────────────────────────────────────────

  /**
   * Generates the sale's invoice on first request and re-downloads the same PDF on every request
   * after. A {@code 204} means the sale's type never calls for an invoice — not an error, so
   * the caller can tell the two apart without parsing a response body.
   */
  @POST
  @Path("/{mineId}/sales/{saleId}/invoice")
  @Produces("application/pdf")
  @Operation(summary = "Generate or re-download a sale's invoice PDF")
  public Response downloadInvoice(@PathParam("saleId") final String saleId) {
    final Invoice invoice = invoiceService.getOrCreateInvoice(saleId);
    if (invoice == null) {
      return Response.noContent().build();
    }
    final FileDetails downloaded = fileService.download(invoice.getInvoiceFile());
    return Response.ok(downloaded.downloaded(), downloaded.mimeType())
        .header("Content-Disposition", "attachment; filename=\"" + downloaded.name() + "\"")
        .build();
  }
}
