package com.complianceos.interfaces.rest;

import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;

import com.agentengine.interfaces.rest.ResourceCatalogAPI;
import com.agentengine.util.common.beans.FileDetails;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.context.ContextAware;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.ComplianceProgress;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.services.MiningService;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 * A mine's statutory compliance obligations — registers, returns, clearances, plans — and its
 * overall progress against them. Listing/searching compliance records goes through
 * agent-engine's {@link ResourceCatalogAPI} instead — see this service's registered
 * {@code AssetHandler}s under {@code handlers}.
 */
@Path("/v1/mines/{mineId}/compliance")
@Tag(name = "Compliance", description = "A mine's compliance records and progress")
@ContextAware
@RunOnVirtualThread
public class ComplianceRestAPI {

  private final MiningService service;

  @Inject
  public ComplianceRestAPI(final MicroServiceClientProvider microServiceClientProvider) {
    this.service = microServiceClientProvider.getRaw(MiningService.class);
  }

  @POST
  @Path("/records/returns")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Record a statutory return as filed")
  public ComplianceRecord fileReturn(
      @PathParam("mineId") final String mineId, final FileReturnRequest request) {
    return service.fileReturn(mineId, request.title(), request.referenceNumber());
  }

  @POST
  @Path("/records/documents")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Attach a clearance, statutory plan, or notice the mine holds")
  public ComplianceRecord addDocument(
      @PathParam("mineId") final String mineId, final AddDocumentRequest request) {
    return service.addDocument(
        mineId,
        request.authority(),
        request.recordType(),
        request.title(),
        request.attachment(),
        request.issuedOn(),
        request.expiry());
  }

  @POST
  @Path("/records/{recordId}/mark-updated")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Mark a DGMS register as updated today")
  public ComplianceRecord markRegisterUpdated(
      @PathParam("mineId") final String mineId, @PathParam("recordId") final String recordId) {
    return service.markRegisterUpdated(mineId, recordId);
  }

  @POST
  @Path("/records/{recordId}/mark-submitted")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Mark an existing return or notice as filed")
  public ComplianceRecord markReturnSubmitted(
      @PathParam("mineId") final String mineId,
      @PathParam("recordId") final String recordId,
      final MarkSubmittedRequest request) {
    return service.markReturnSubmitted(mineId, recordId, request.referenceNumber());
  }

  @POST
  @Path("/records/{recordId}/documents")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Update an existing clearance, statutory plan, or notice")
  public ComplianceRecord updateDocument(
      @PathParam("mineId") final String mineId,
      @PathParam("recordId") final String recordId,
      final AddDocumentRequest request) {
    return service.updateDocument(
        mineId,
        recordId,
        request.authority(),
        request.recordType(),
        request.title(),
        request.attachment(),
        request.issuedOn(),
        request.expiry());
  }

  @DELETE
  @Path("/records/{recordId}")
  @Operation(summary = "Delete a compliance record")
  public void deleteComplianceRecord(
      @PathParam("mineId") final String mineId, @PathParam("recordId") final String recordId) {
    service.deleteComplianceRecord(recordId);
  }

  @POST
  @Path("/progress")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get how many of the mine's compliance actions matching a query are currently up to date, out of how many match")
  public ComplianceProgress getComplianceProgress(
      @PathParam("mineId") final String mineId, final Query query) {
    return service.getComplianceProgress(mineId, query);
  }

  /** What filing a statutory return actually requires from the caller — nothing else about the record is theirs to set. */
  public record FileReturnRequest(String title, String referenceNumber) {}

  /** What marking an existing return as filed actually requires from the caller. */
  public record MarkSubmittedRequest(String referenceNumber) {}

  /** What attaching a clearance, statutory plan, or notice actually requires from the caller. */
  public record AddDocumentRequest(
      String authority, String recordType, String title, FileDetails attachment, Long issuedOn, Long expiry) {}
}
