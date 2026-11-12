# ComplianceOS — Remaining Implementation Items

> **Scope:** Unimplemented items remaining from [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md) and [`TODO.md`](./TODO.md), excluding the anti-theft system and components intentionally removed/refactored in commit `9dc9adf`.

---

## Summary Matrix

| # | Item | Category | Target Area | Priority |
| :-: | :--- | :--- | :--- | :---: |
| 1 | **CGST Rule 28 Open-Market Valuation (`CONSUMPTION`)** | Backend / Invoicing | `InvoiceServiceImpl.java` | High |
| 2 | **Form F-2 Monthly Return (Non-Metallic Minerals)** | Statutory Forms | `FormsView.jsx` / New `FormF2Modal.jsx` | Medium |
| 3 | **Geological, Explosives & Fleet Tracking** | Domain Data | Backend Beans + `FormAModal.jsx` / `FormBModal.jsx` | Medium |
| 4 | **Live Government Portal Bridges (`ibmts.gov.in` / DMG)** | External Integration | Backend REST / Adapters | Low (Requires MoU/Credentials) |
| 5 | **Weighbridge Load-Cell & DGPS Hardware Ingestion** | Hardware / IoT | Ingestion API / Edge Adapter | Low (Site Hardware) |

---

## Detailed Breakdown

### 1. CGST Rule 28 Open-Market Valuation for Inter-GSTIN `CONSUMPTION` Invoices
- **Source:** [`TODO.md`](./TODO.md#L5-L7)
- **Current State:** [`InvoiceServiceImpl.createInvoice`](./backend/compliance/core/src/main/java/com/complianceos/compliance/core/service/InvoiceServiceImpl.java#L142-L149) currently throws `UnsupportedOperationException` when a `Sale` of type `CONSUMPTION` occurs between a mine and buyer with **different GSTINs**.
- **Requirement:**
  - Implement Rule 28 (CGST Rules, 2017) valuation hierarchy (Open Market Value → Value of like kind/quality → Cost + 10% fallback) for deemed-supply captive transfers.
  - Compute CGST/SGST/IGST against the Rule 28 taxable value and persist the generated invoice + PDF.

---

### 2. Form F-2 Monthly Return (Non-Metallic Minerals)
- **Source:** [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md#L94) (MCDR 2017 — Rule 45)
- **Current State:** [`FormBModal.jsx`](./frontend_react/src/components/modals/FormBModal.jsx) covers **Form F-1** (Metallic Minerals) ledger preview and acknowledgement logging.
- **Requirement:**
  - Support **Form F-2** layout and fields for non-metallic / industrial minerals (e.g., Limestone, Gypsum, Silica, Dolomite) with grade/use-wise dispatch breakouts (Cement, Chemical, Steel, etc.) alongside Form F-1 in [`FormsView.jsx`](./frontend_react/src/views/FormsView.jsx).

---

### 3. Untracked Mining Technical Fields (Form A & Form F-1)
- **Source:** [`FormAModal.jsx`](./frontend_react/src/components/modals/FormAModal.jsx#L131-L133) & [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md#L99)
- **Current State:** Explicitly noted in `FormAModal.jsx` as not tracked in ComplianceOS.
- **Requirement:**
  - Add backend entities/fields and UI logging for:
    - **Geological Reserves & Resources** (Proved / Probable / Remaining)
    - **Overburden / Waste Rock Volume** (Cu.m / MT)
    - **Ore Purity / Chemical Grade %** (e.g., Fe%, CaO%, SiO2%)
    - **Machinery & HEMM Fleet Counts** (Excavators, Dumpers, Drills, Crushers)
    - **Explosives Consumption** (Detonators, Slurry/Emulsion, ANFO)

---

### 4. Live Government Portal Bridges (`ibmts.gov.in` & State DMG e-Permit)
- **Source:** [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md#L38)
- **Current State:** Statutory return modals (`FormAModal`, `FormBModal`, `FormCModal`, `FormJModal`) record manual filing acknowledgement reference numbers.
- **Requirement:**
  - Build authenticated API/webhook connectors for direct submission to **IBM Mining Tenement System (`ibmts.gov.in`)** and **State DMG e-Permit / Royalty** portals once official API credentials and MoU sandbox access are provisioned.

---

### 5. Weighbridge Load-Cell & DGPS Boundary Hardware Ingestion
- **Source:** [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md#L21)
- **Current State:** Production and dispatch entries are logged via the web UI/API.
- **Requirement:**
  - Add an ingestion endpoint/agent to capture automated weightment slips from site **electronic weighbridges** (RS-232/TCP-IP) and **DGPS boundary pillar coordinates** for automated pit-head verification.

