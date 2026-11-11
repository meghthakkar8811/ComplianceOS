package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AggregationRequest;
import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.AggregationResult;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.ComplianceRecord;
import com.complianceos.compliance.api.services.MiningService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

/**
 * Compliance records are not independently permissioned — reached only through their mine — so
 * {@code MiningService} filters every result to what the caller may read, the same way a
 * {@code @Permissioned} entity's own repository would via its ACL.
 */
@Singleton
public class ComplianceRecordAssetHandler implements AssetHandler<ComplianceRecord> {

  private final MiningService service;

  @Inject
  public ComplianceRecordAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(MiningService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.COMPLIANCE_RECORD;
  }

  @Override
  public PaginatedResult<ComplianceRecord> findAssets(final AssetRequest request) {
    return service.findComplianceRecords(request.getQuery());
  }

  @Override
  public Map<String, ComplianceRecord> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getComplianceRecords(request.getKeys());
  }

  /** {@code mineId} (an option, not a query filter) is required: compliance records are always aggregated one mine at a time. */
  @Override
  public AggregationResult aggregate(final AggregationRequest request) {
    final String mineId = CollectionUtils.getStringValueFromMap(request.getOptions(), "mineId");
    if (mineId == null) {
      throw new IllegalArgumentException("mineId option is required to aggregate compliance records");
    }
    return service.aggregateComplianceRecords(mineId, request.getQuery());
  }
}
