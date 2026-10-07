package com.complianceos.compliance.core.repository;

import com.agentengine.util.common.repository.AbstractRepository;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.repository.DocumentRepositorySpec;
import com.agentengine.util.common.validation.ValidationService;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import com.complianceos.compliance.api.beans.NmetRate;
import io.quarkus.runtime.Startup;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

@Singleton
@Startup
public class NmetRateRepository extends AbstractRepository<NmetRate> {

  @Inject
  public NmetRateRepository(
      final DocumentBackend documentBackend, final ValidationService validationService) {
    super(
        documentBackend.getEntityStore(
            DocumentRepositorySpec.global(
                ComplianceDocumentStoreClientType.COMPLIANCE, NmetRate.class)),
        validationService);
  }
}
