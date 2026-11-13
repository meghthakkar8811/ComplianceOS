# ComplianceOS TODO

## Pending Backend Features

- [x] **CGST Rule 28 Open-Market Valuation for Inter-GSTIN `CONSUMPTION` Invoices**
  - **Where:** [`InvoiceServiceImpl.createInvoice`](backend/compliance/core/src/main/java/com/complianceos/compliance/core/service/InvoiceServiceImpl.java#L142-L162) / [`InvoiceService`](backend/compliance/api/src/main/java/com/complianceos/compliance/api/services/InvoiceService.java#L26-L31)
  - **Details:** Resolved. Inter-GSTIN captive transfers between distinct registrations now apply Rule 28 valuation hierarchy (using declared invoice value under the full-ITC second proviso when positive, or falling back to grade baseline price per unit * quantity) to generate the tax invoice without throwing `UnsupportedOperationException`.

