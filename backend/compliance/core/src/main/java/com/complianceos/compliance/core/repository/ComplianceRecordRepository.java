package com.complianceos.compliance.core.repository;

import com.agentengine.util.common.repository.AbstractRepository;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.repository.DocumentRepositorySpec;
import com.agentengine.util.common.validation.ValidationService;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import io.quarkus.runtime.Startup;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

@Singleton
@Startup
public class ComplianceRecordRepository extends AbstractRepository<ComplianceRecord> {

  @Inject
  public ComplianceRecordRepository(
      final DocumentBackend documentBackend, final ValidationService validationService) {
    super(
        documentBackend.getEntityStore(
            DocumentRepositorySpec.perCustomer(
                ComplianceDocumentStoreClientType.COMPLIANCE, ComplianceRecord.class)),
        validationService);
  }
}
