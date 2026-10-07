# Agent Guidelines

> [!IMPORTANT]
> `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, and any other per-agent instruction file at the repo root are
> symlinks to this file. Make all edits here, in `AGENTS.md`, never in one of the symlinks.

## Project Summary

ComplianceOS is a mining statutory compliance platform for Indian mining companies, built on top of
agent-engine's runtime (tenancy/RBAC, Mongo-backed document storage, the microservice mesh, and —
longer term — its agent/knowledge/scheduler services for an agentic compliance assistant). It
tracks mines, production, royalty liability (DMF + NMET), statutory compliance filings, and DGMS
inspection readiness. A PHP/MySQL prototype (`../backend-php`, `../database/schema.sql`) exists as a
feature reference only — this backend is not a line-by-line port of it.

## Module Structure

| Module                        | Purpose                                                                                      |
|-------------------------------|------------------------------------------------------------------------------------------------|
| `compliance:api`               | Beans (`Mine`, `ProductionEntry`, `Royalty`, `RoyaltyRate`, `ComplianceRecord`) and the `MiningService` contract (`@MicroService("compliance")`) |
| `compliance:core`               | **Compliance service** — repositories and `MiningServiceImpl`, deployed standalone and called over gRPC |
| `interfaces:rest`               | **REST gateway** — depends on agent-engine's own `interfaces:rest` artifact and extends it in one running process: agent-engine's REST surface (chat, sessions, governance, the resource catalog, etc.) plus this module's own domain endpoints (`MiningRestAPI`) and `AssetHandler`s, thin over `MiningService` via `MicroServiceClientProvider`, no business logic |
| `agent:api`, `agent:core`       | Reserved for compliance-specific agent Tools (royalty calculator, DGMS lookups, Form-B autofill) extending agent-engine's agent runtime — currently empty; no concrete tool has been scoped yet |
| `internal`                      | Reserved for compliance-specific internal/ops endpoints — currently empty; agent-engine's own `internal` service covers general ops needs until one is |
| `deploy/docker/`, `deploy/k8s/`, `deploy/configs/`, `deploy/scripts/` | Same shape as agent-engine's own deploy tooling — one Helm chart + tier config per deployable |

This backend depends on agent-engine as a set of published Maven artifacts (group `com.agentengine`,
version `1.0.1-SNAPSHOT`, from agent-engine's own GitHub Packages registry — see root `build.gradle`).
`./gradlew publishToMavenLocal` in the agent-engine checkout refreshes the local copy when the two
repos are developed side by side.

**Every module — application or library — agent-engine publishes is a real dependency, not just
`*:api` contracts.** This product extends agent-engine module by module by depending on its
published artifact directly, rather than running a separate, unmodified instance of it alongside
this product's own services: `interfaces:rest` is the first one wired this way, depending on
`com.agentengine.interfaces:rest` and extending it in the same process (its own `MiningRestAPI`
and `AssetHandler`s sit alongside agent-engine's REST surface, including its
`ResourceCatalogAPI` — `compliance:api`'s four handlers register as additional
`AssetHandler`s on agent-engine's own framework rather than a parallel one). Other modules
(`agent:core` extending agent-engine's agent runtime, etc.) are expected to follow the same
pattern as they're wired up — don't assume a module still runs as an unmodified redeployed
agent-engine instance without checking its own `build.gradle`. `compliance` is the one new
microservice this product adds. There is deliberately no `catalog` deployment: `compliance`
plays catalog's role (config/schema ownership) for this product's own asset classes.

## Data Model Notes

- `ComplianceRecord` is the one entity for every mine compliance obligation — clearances, returns,
  notices, reports, *and* DGMS statutory registers (accident register, explosive consumption,
  safety committee, etc.) — `recordType` distinguishes them, including the `REGISTER` case. A
  register is not embedded on `Mine` and not a separate entity: a mine holds many
  `ComplianceRecord`s of `recordType=REGISTER`, one per `registerCode`, same as it holds many
  clearances. This is deliberately different from `IBMRegistration`, which stays embedded on
  `Mine` because it genuinely is a single registration per mining lease (confirmed against real
  IBM inspection records, each showing exactly one registration number per lease) — a DGMS
  register is an ongoing log DGMS requires a mine to keep (like the Mines Act, 1952 §23 register
  of accidents), not a one-time registration event, so it follows `ComplianceRecord`'s shape
  instead.
- Fields common to every `recordType` — including `REGISTER` — are: `mineId`, `title`,
  `authority`, `status`, `issuedOn`, `expiry`, `submittedOn`, `lastUpdatedAt`, `attachment`,
  `notes`. All four timestamps are epoch-millis `long`s, not date strings. `issuedOn` is
  populated only for records with an authority-granted validity window (clearances, plans);
  `expiry` doubles as both a clearance's lapse date and a return/notice's filing deadline — there
  is no separate `dueDate`. `lastUpdatedAt` is a dedicated, explicitly-set field (via
  `touchDgmsRegister`), never `BaseEntity`'s own `updatedTime`, because that one is touched by any
  save including unrelated edits and system processes (e.g. ACL recalculation) and can't serve as
  a trustworthy domain signal. There is no `regulationRef` field — which statute mandates a
  record, when worth noting at all, goes in `notes`; it wasn't common enough across record types
  to earn a dedicated field. Fields specific to filings only: `referenceNumber` (the authority's
  acknowledgment number, set on submission). Fields specific to `REGISTER` only: `registerCode`
  (used to look up its weight in the DGMS readiness score) and `maxDaysAllowed` — not an
  independent fact once `expiry` exists, just the day-count `touchDgmsRegister` adds to "now" to
  recompute `expiry` each time the register is touched. Don't reintroduce separate
  `ComplianceDeadline`/`ComplianceDocument`/`DgmsRegister` entities.
- Every categorical field across `compliance:api`'s beans follows the same rule: backed by an
  enum (`RecordType`, `Authority`, `ComplianceStatus`, `ProductionStatus`, `Shift`, `Month`,
  `ChallanStatus`, `ReadinessStatus`, `ReadinessVerdict`) but the bean/record field itself stays
  `String`, parsed with that enum's `valueOfOrDefault` wherever code needs to branch on it — never
  typed as the enum directly, so a value a different app version doesn't recognize degrades to
  `UNKNOWN` on load instead of failing to deserialize. Every one of these enums declares `UNKNOWN`.
- Every date/time field across these beans is an epoch-millis `long`, never a date string:
  `ComplianceRecord.issuedOn`/`expiry`/`submittedOn`/`lastUpdatedAt`, `ProductionEntry.entryTime`.
  `Royalty` and `RoyaltyRate` are the exception in shape, not in kind: each identifies a calendar
  month for grouping/matching, not an instant, so each is `year` (int) + `month` (a `Month` enum
  name) rather than a timestamp.
- Numeric field names don't carry a unit suffix (`Mt`, `Paise`) — the unit is implied by what the
  field measures and by the type (e.g. a royalty amount is always paise, as a `long`):
  `ProductionEntry`'s `quantityProduced`/`quantityDispatched`, `RoyaltyRate.ratePerTonne`,
  `Royalty`'s `quantity`/`baseAmount`/`dmfAmount`/`nmetAmount`/`grossLiability`.
  `RoyaltyRate.dmfRate`/`nmetRate` are 1-based fractions (0.3, not 30) — "Rate" here, as
  elsewhere in this file, means a multiplier/ratio, not a currency amount.
- `RoyaltyRate` is reference data: environment-wide, not any one customer's, even though
  `compliance`'s Mongo storage is otherwise always per-customer. `MiningServiceImpl`'s
  royalty-rate reads/writes (`saveRoyaltyRate`, `getRoyaltyRates`, and the lookup inside its
  royalty recalculation) all run under `Context.asSystemCustomer()` regardless of which real
  customer is calling, so every customer reads and writes the one copy stored under the system
  customer — a deliberate `Context` override (CLAUDE.md's "a cache load shared by every caller"
  exception), not a per-caller permission shortcut. Exactly one row exists per (state, mineral,
  year, month): its id is deterministic (`RoyaltyRate.id`), so `MiningServiceImpl.saveRoyaltyRate`
  always derives the id from those four fields before saving — a save for a combination that
  already has a rate replaces it, it never creates a second. Seeded from
  `deploy/configs/<tier>/royalty_rates.json` at *environment* provisioning (`internal`'s
  `ComplianceEnvironmentProvisioningRequest.royaltyRates`), never per-customer provisioning —
  the seed table from `../database/schema.sql`'s `royalty_rates` INSERTs was the reference for
  its shape, not something to port row-for-row.
- `Royalty` is never written directly — there is no save endpoint or service method for it.
  `MiningServiceImpl` recalculates and upserts a mine's royalty (`Royalty.id` =
  `mineId:year:month`, deterministic like `RoyaltyRate`'s) every time a `ProductionEntry` for that
  period is saved or deleted: it sums `quantityDispatched` across the period's entries, looks up
  the matching `RoyaltyRate` by the mine's `state`/`mineral` and the period, and computes
  `baseAmount`/`dmfAmount`/`nmetAmount`/`grossLiability` from it (`royaltyRateId` records which
  rate was used — fetch it for the rates applied, since `Royalty` only stores amounts, never
  snapshots the rates). If an entry's edit moves it to a different mine or period, both the old
  and new period are recalculated so neither is left stale. A period with no remaining production
  has its royalty deleted rather than left at zero. Payment tracking (what's been paid, what's
  still due, challan status) is deliberately not modeled on `Royalty` — it belongs on a separate
  payment entity against it, not yet built; `ChallanStatus` already exists in `beans` for when it
  is.
- `ProductionEntry`, `Royalty`, and `ComplianceRecord` are not independently `@Permissioned`: all
  three are reached only through their mine, and `MiningServiceImpl` checks `Permission.READ`/
  `EDIT` on the mine (`MineRepository.hasPermission`) before every read or write, the same pattern
  agent-engine uses for a notebook's notes. None carries its own role mappings in `roles.json`;
  deleting a mine cascades to its production entries, royalties, and compliance records. `Mine`
  remains the only `@Permissioned` asset class this service adds.

## Commands

```bash
# Build (skip tests)
./gradlew clean build -x test

# Build a service image (module: compliance/core, interfaces/rest)
docker build --build-arg SERVICE_MODULE=compliance/core -f deploy/docker/Dockerfile .

# Deploy / tear down the Kubernetes stack (run from deploy/scripts/)
uv run deployae deploy
uv run deployae cleanup
```

## Open Follow-Ups

- No dashboard/health-score aggregation endpoint yet (the PHP prototype's weighted
  IBM/royalty/DGMS/environment score + 6-month production chart).
- No royalty rate seeding mechanism (the PHP schema seeds 8 states × 8 minerals on setup).
- Auth/OTP/Google sign-in/tenant & user management is intentionally **not** reimplemented here —
  it's agent-engine's `identity`/`tenancy` services' job. ComplianceOS's own users are
  agent-engine principals; don't add a parallel `User`/`Tenant` model.
- New tenant users must be role-mapped (`reader`/`editor`/`manager` from
  `deploy/configs/<tier>/governance/roles.json`) onto `Mine`/`ProductionEntry`/`Royalty`/
  `ComplianceRecord` at invite time — without a role mapping, a new user sees only entities they
  created themselves (agent-engine's default per-creator ownership).
