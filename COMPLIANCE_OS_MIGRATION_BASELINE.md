# COMPLIANCE_OS_MIGRATION_BASELINE.md
**Document Version:** 1.0  
**Date:** 2026-11-06  
**Scope:** Complete Baseline Inventory of ComplianceOS Frontend for Zero-Regression React Migration

---

## 1. Inventory of Existing Files

| File Path | Purpose | Technology | Migration Target | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/dashboard.html` | Core operational portal (SPA with 8 sub-views) | HTML5 / CSS3 / Vanilla JS | `src/pages/Dashboard.jsx` + sub-modules | High (Complex canvas/SVG charts & DOM state) |
| `frontend/login.html` | User authentication & session initialization | HTML5 / CSS3 / Vanilla JS | `src/pages/Login.jsx` | Low |
| `frontend/signup.html` | Account registration & initial mine setup | HTML5 / CSS3 / Vanilla JS | `src/pages/Signup.jsx` | Low |
| `frontend/verify.html` | 6-digit OTP email verification | HTML5 / CSS3 / Vanilla JS | `src/pages/Verify.jsx` | Low |
| `frontend/forgot.html` | Password recovery workflow | HTML5 / CSS3 / Vanilla JS | `src/pages/Forgot.jsx` | Low |
| `frontend/css/dashboard.css` | All styles for dashboard, modals, charts, grids | CSS3 (Native custom properties) | `src/styles/dashboard.css` | Medium (Preserve all classes & variables) |
| `frontend/css/auth.css` | Styling for auth flows (login, signup, verify) | CSS3 (Native custom properties) | `src/styles/auth.css` | Low |
| `frontend/js/api.js` | REST client, cookie handling, catalogSearch | Vanilla JS ES6+ | `src/services/api.js` | Critical (Must preserve cookie auth & endpoints) |
| `frontend/js/env.local.js` | Environment override for remote backend | Vanilla JS | `src/config/env.js` / Vite env | Low |
| `frontend/js/theme.js` | Dark/Light theme switching & localStorage | Vanilla JS | `src/context/ThemeContext.jsx` | Low |
| `frontend/js/dashboard.js` | 2,409 lines of core UI, charts, modals, state | Vanilla JS ES6+ | Modular React components & hooks | Critical (MCDR 2017 & DGMS logic) |

---

## 2. API Surface Catalog

All calls target `/v1` via cookie-based sessions (`credentials: 'include'`).

| Endpoint | Method | Trigger / Function | Data Transferred |
| :--- | :--- | :--- | :--- |
| `/v1/auth/me` | GET | `checkAuth()` | Current user session & roles |
| `/v1/auth/login` | POST | Login submission | `{ type: 'password', username, password }` |
| `/v1/auth/logout` | POST | Sidebar Sign Out | Destroys server cookie |
| `/v1/catalog/search` | POST | Multiple queries (`Mine`, `ComplianceRecord`, `ProductionEntry`, `Sale`, `Role`) | Paginated search with filtering |
| `/v1/mines/` | POST / GET | `openAddMineModal()`, `loadMines()` | Mine lease configuration & metadata |
| `/v1/mines/{id}` | DELETE | `deleteMine(id)` | Deactivates mine lease |
| `/v1/mines/{id}/dgms-readiness` | GET | `loadDashboard()`, `loadDgms()` | 8-register DGMS audit score & breakdown |
| `/v1/mines/{id}/royalty` | GET | `loadDashboard()`, `loadRoyalty()` | Monthly & YTD royalty calculations |
| `/v1/mines/{id}/production` | POST / DELETE | `saveProduction()`, `deleteProduction()` | Shift-wise ROM production entries |
| `/v1/mines/{id}/sales` | POST | `saveDispatch()` | Off-lease dispatches & transit records |
| `/v1/mines/{id}/compliance-records` | POST | Mark submitted / update record | Compliance document lifecycle |
| `/v1/storage/upload` | POST | File upload attachment | Raw body binary upload |

---

## 3. High-Risk Complex Components (Performance Focus)

1. **`#prod-chart` (Production & Dispatch Dual Chart):**
   - Canvas-based rendering with custom grid lines, ease-out entry animation, and dynamically calculated scales.
   - Must use `useRef` and `requestAnimationFrame()` to ensure 60 FPS without React virtual DOM re-render thrashing.
2. **`#dgms-ring-fill` (DGMS Readiness SVG Circular Gauge):**
   - SVG `stroke-dashoffset` animation calculated from `overallScore`.
   - Dynamic color assignment: Green ($\ge 80$), Amber ($60-79$), Red ($< 60$).
3. **Mine Switcher & SPA Sub-Pages:**
   - 8 sub-views: `dashboard`, `alerts`, `calendar`, `forms`, `dgms`, `documents`, `royalty`, `production`.
   - Modals: `modal-add-mine`, `modal-log-prod`, `modal-log-dispatch`, `modal-mark-submitted`, `modal-upload-doc`.

---

## 4. Safety & Coexistence Baseline

- Original files preserved in `frontend_backup_vanilla/` and untouched in `frontend/`.
- Git branch: `feature/react-migration`.
- React application will be constructed in `frontend_react/` powered by Vite, with a clean production build target that seamlessly deploys into `frontend/` once verified.

