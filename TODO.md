# ComplianceOS TODO

## Pending Backend Features

- [ ] **CGST Rule 28 Open-Market Valuation for Inter-GSTIN `CONSUMPTION` Invoices**
  - **Where:** [`InvoiceServiceImpl.createInvoice`](backend/compliance/core/src/main/java/com/complianceos/compliance/core/service/InvoiceServiceImpl.java#L142-L148) / [`InvoiceService`](backend/compliance/api/src/main/java/com/complianceos/compliance/api/services/InvoiceService.java#L26-L31)
  - **Details:** Internal `CONSUMPTION` dispatches between registrations with the same GSTIN do not require a tax invoice (`requiresInvoice` returns `false`). However, when the mine and recipient/buyer have **different GSTINs**, GST law treats the transfer as a *"deemed supply"* whose taxable value must be determined via Open Market Valuation (or cost + 10% / Rule 28 fallback valuation hierarchy under CGST Rules, 2017) rather than `saleValue`. Currently `createInvoice` throws `UnsupportedOperationException`.

