package com.complianceos.compliance.core.repository;

import com.agentengine.util.common.repository.AbstractRepository;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.repository.DocumentRepositorySpec;
import com.agentengine.util.common.validation.ValidationService;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import com.complianceos.compliance.api.beans.Invoice;
import io.quarkus.runtime.Startup;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

@Singleton
@Startup
public class InvoiceRepository extends AbstractRepository<Invoice> {

  @Inject
  public InvoiceRepository(
      final DocumentBackend documentBackend, final ValidationService validationService) {
    super(
        documentBackend.getEntityStore(
            DocumentRepositorySpec.perCustomer(
                ComplianceDocumentStoreClientType.COMPLIANCE, Invoice.class)),
        validationService);
  }
}
