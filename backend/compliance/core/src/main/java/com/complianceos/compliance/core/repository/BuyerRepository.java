package com.complianceos.compliance.core.repository;

import com.agentengine.tenancy.AccessControlService;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.repository.DocumentRepositorySpec;
import com.agentengine.util.common.validation.ValidationService;
import com.agentengine.util.tenancy.AbstractPermissionedRepository;
import com.agentengine.util.tenancy.PermissionChecker;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import io.quarkus.runtime.Startup;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

@Singleton
@Startup
public class BuyerRepository extends AbstractPermissionedRepository<Buyer> {

  @Inject
  public BuyerRepository(
      final DocumentBackend documentBackend,
      final ValidationService validationService,
      final PermissionChecker permissionChecker,
      final AccessControlService accessControlService) {
    super(
        documentBackend.getEntityStore(
            DocumentRepositorySpec.perCustomer(ComplianceDocumentStoreClientType.COMPLIANCE, Buyer.class)),
        validationService,
        permissionChecker,
        accessControlService);
  }
}
