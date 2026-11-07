package com.complianceos.compliance.api.services;

import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.Invoice;
import com.complianceos.compliance.api.beans.Sale;
import java.util.List;
import java.util.Map;

/**
 * GST invoicing for a {@link Sale}: whether its type requires one at all, and the lazy
 * generate-or-refetch flow a download request drives — kept out of {@code MiningService} as its
 * own self-contained area of logic, same reasoning as {@link RoyaltyService} and {@link
 * MineralService}.
 */
@MicroService("compliance")
public interface InvoiceService {

  Map<String, Invoice> getInvoices(List<String> ids);

  PaginatedResult<Invoice> findInvoices(Query query);

  /**
   * The sale's invoice, generated and uploaded on the first request and left untouched on every
   * request after — never regenerates. Its {@code invoiceFile} is always set on return. Null when
   * the sale's type doesn't call for an invoice at all: every type except {@code CONSUMPTION}
   * always does; a {@code CONSUMPTION} sale only does when the mine and buyer hold different
   * GSTINs (otherwise it's just moving the mine's own ore between its own registrations).
   *
   * @throws UnsupportedOperationException for a {@code CONSUMPTION} sale between differing GSTINs
   *     — Rule 28 open-market valuation, not yet implemented
   */
  Invoice getOrCreateInvoice(String saleId);
}
