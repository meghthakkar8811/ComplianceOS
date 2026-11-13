# ComplianceOS — Remaining Implementation Items

> **Scope:** Unimplemented items remaining from [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md) and [`TODO.md`](./TODO.md), excluding the anti-theft system and components intentionally removed/refactored in commit `9dc9adf`.

---

## Summary Matrix

| # | Item | Category | Target Area | Status |
| :-: | :--- | :--- | :--- | :---: |
| 1 | **CGST Rule 28 Open-Market Valuation (`CONSUMPTION`)** | Backend / Invoicing | `InvoiceServiceImpl.java` | **Completed** |
| 2 | **Form F-2 Monthly Return (Non-Metallic Minerals)** | Statutory Forms | `FormsView.jsx` / `FormF2Modal.jsx` | **Completed** |
| 3 | **Geological, Explosives & Fleet Tracking** | Domain Data | Backend Beans + `FormAModal.jsx` / `FormBModal.jsx` | Pending |
| 4 | **Live Government Portal Bridges (`ibmts.gov.in` / DMG)** | External Integration | Backend REST / Adapters | Post-MoU (Requires Govt. API) |
| 5 | **Weighbridge Load-Cell & DGPS Hardware Ingestion** | Hardware / IoT | Ingestion API / Edge Adapter | Post-Pilot (Site Hardware) |

---

## Detailed Breakdown

### 1. CGST Rule 28 Open-Market Valuation for Inter-GSTIN `CONSUMPTION` Invoices (COMPLETED)
- **Source:** [`TODO.md`](./TODO.md#L5-L7)
- **Status:** **Implemented** in [`InvoiceServiceImpl.java`](./backend/compliance/core/src/main/java/com/complianceos/compliance/core/service/InvoiceServiceImpl.java).
- **Solution:** Evaluates deemed supply between distinct registrations (different GSTINs). In accordance with the second proviso to Rule 28, positive declared values are treated as open market value; when zero, it falls back to the baseline grade price per unit multiplied by quantity. Tax invoice and PDF generation now execute without throwing an `UnsupportedOperationException`.

---

### 2. Form F-2 Monthly Return for Non-Metallic Minerals (COMPLETED)
- **Source:** [`IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md`](./IBM_MOU_FINAL_IMPLEMENTATION_PLAN.md#L94) (MCDR 2017 — Rule 45)
- **Status:** **Implemented** in [`FormsView.jsx`](./frontend_react/src/views/FormsView.jsx) and [`FormF2Modal.jsx`](./frontend_react/src/components/modals/FormF2Modal.jsx).
- **Solution:** Dedicated Form F-2 modal with:
  - Part I Mine & Lessee particulars.
  - Part II Monthly ROM production & dispatch ledger figures.
  - Part III Consuming industry end-use allocation (Cement, Iron & Steel, Chemical/Fertilizer, Glass & Ceramics, Captive Plant/Other).
  - Part IV IBM MTS filing acknowledgement logging.

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

