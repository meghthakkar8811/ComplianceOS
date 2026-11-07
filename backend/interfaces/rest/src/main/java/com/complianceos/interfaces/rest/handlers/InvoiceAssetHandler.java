package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.dto.AssetRequest;
import com.agentengine.interfaces.rest.handlers.catalog.AssetHandler;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.utils.CollectionUtils;
import com.agentengine.util.ms.client.MicroServiceClientProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Invoice;
import com.complianceos.compliance.api.services.InvoiceService;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.Map;

@Singleton
public class InvoiceAssetHandler implements AssetHandler<Invoice> {

  private final InvoiceService service;

  @Inject
  public InvoiceAssetHandler(final MicroServiceClientProvider provider) {
    this.service = provider.getRaw(InvoiceService.class);
  }

  @Override
  public String getAssetType() {
    return AssetClass.INVOICE;
  }

  @Override
  public PaginatedResult<Invoice> findAssets(final AssetRequest request) {
    return service.findInvoices(request.getQuery());
  }

  @Override
  public Map<String, Invoice> getAssetsByIds(final AssetRequest request) {
    if (CollectionUtils.isEmpty(request.getKeys())) {
      return Map.of();
    }
    return service.getInvoices(request.getKeys());
  }
}
