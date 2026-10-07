package com.complianceos.compliance.core.repository;

import com.agentengine.tenancy.AccessControlService;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.repository.DocumentRepositorySpec;
import com.agentengine.util.common.validation.ValidationService;
import com.agentengine.util.tenancy.AbstractPermissionedRepository;
import com.agentengine.util.tenancy.PermissionChecker;
import com.complianceos.compliance.api.beans.ComplianceDocumentStoreClientType;
import com.complianceos.compliance.api.beans.Mine;
import io.quarkus.runtime.Startup;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;

@Singleton
@Startup
public class MineRepository extends AbstractPermissionedRepository<Mine> {

  @Inject
  public MineRepository(
      final DocumentBackend documentBackend,
      final ValidationService validationService,
      final PermissionChecker permissionChecker,
      final AccessControlService accessControlService) {
    super(
        documentBackend.getEntityStore(
            DocumentRepositorySpec.perCustomer(ComplianceDocumentStoreClientType.COMPLIANCE, Mine.class)),
        validationService,
        permissionChecker,
        accessControlService);
  }
}
