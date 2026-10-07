package com.complianceos.compliance.core.repository;

import com.agentengine.util.common.repository.AbstractRepository;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.repository.DocumentRepositorySpec;
import com.agentengine.util.common.validation.ValidationService;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import io.quarkus.runtime.Startup;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

@Singleton
@Startup
public class RoyaltyRateRepository extends AbstractRepository<RoyaltyRate> {

  @Inject
  public RoyaltyRateRepository(
      final DocumentBackend documentBackend, final ValidationService validationService) {
    super(
        documentBackend.getEntityStore(
            DocumentRepositorySpec.global(
                ComplianceDocumentStoreClientType.COMPLIANCE, RoyaltyRate.class)),
        validationService);
  }
}
