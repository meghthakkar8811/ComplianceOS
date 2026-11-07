package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.util.cloudstorage.FileService;
import com.agentengine.util.common.beans.FileDetails;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.Invoice;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.services.InvoiceService;
import com.complianceos.compliance.api.services.MiningService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/** A mine's dispatches and the invoice a sale generates — reached through the sale's own id, so both stay together. */
@Path("/v1/mines/{mineId}/sales")
@Tag(name = "Sales", description = "A mine's dispatches and sale invoices")
@ContextAware
@RunOnVirtualThread
public class SalesRestAPI {

  private final MiningService service;
  private final InvoiceService invoiceService;
  private final FileService fileService;

  @Inject
  public SalesRestAPI(
      final MicroServiceClientProvider microServiceClientProvider,
      final InvoiceService invoiceService,
      final FileService fileService) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
    this.invoiceService = invoiceService;
    this.fileService = fileService;
  }

  @POST
  @Path("/")
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

  /**
   * Generates the sale's invoice on first request and re-downloads the same PDF on every request
   * after. A {@code 204} means the sale's type never calls for an invoice — not an error, so
   * the caller can tell the two apart without parsing a response body.
   */
  @POST
  @Path("/{saleId}/invoice")
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
