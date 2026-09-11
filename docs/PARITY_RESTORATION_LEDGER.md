# MailMyPDF parity restoration ledger

Status: **baseline captured 2026-09-11**  
Purpose: make the standalone repositories useful as evidence without treating every
file in them as production-ready code.

## What happened

The monorepo migration preserved a large amount of domain content, but it did not
preserve repository parity. Several verticals have only a shell in the monorepo,
while some donor repositories contain richer UI and route implementations. A few
repositories that look like vertical donors are actually polluted snapshots of the
Notice Respond workspace (their trees contain `conversations/`, `.base44-conversation-workspace/`,
and unrelated vertical files). Those files are not safe to copy.

The counts below are an inventory signal, not a maturity claim. A workflow counts as
restored only when its registry entry, front door, authenticated start guard,
analyze/draft/approve/checkout path, secure Claude-first provider policy, fulfillment
path, and tests all exist and agree on the same ID.

## Vertical baseline

| Monorepo vertical | Donor repository | Donor files | Donor workflow-named files | Monorepo files | Monorepo workflow-named files | Current disposition |
|---|---|---:|---:|---:|---:|---|
| appeal-mail | `appeal-mail` | 478 | 258 | 457 | 257 | **Restore parity; strongest donor** |
| benefits-appeal | `benefits-appeal` | 255 | 110 | 258 | 107 | **Close; reconcile routes/tests** |
| notice-respond | `notice-respond` | 292 | 68 | 324 | 93 | **Reconcile registry and factory** |
| immigration-mail | `immigration-mail` | 237 | 35 | 232 | 33 | **Close; verify API wiring** |
| dispute-mail | `dispute-mail` | 20,600 | 28 | 117 | 24 | **Donor polluted; use only reviewed files** |
| records-request | `records-requests` | 185 | 86 | 274 | 160 | **Reconcile canonical IDs and UI** |
| code-enforcement | `code-enforcement` | 108 | 7 | 104 | 10 | **Close; verify runtime path** |
| insurance-claims | `insurance-claims` | 42 | 14 | 60 | 18 | **Close; verify runtime path** |
| tenant-reply | `tenant-reply` | 7,559 | 1,316 | 19 | 1 | **Shell; donor tree polluted** |
| permit-reply | `permit-reply` | 7,559 | 1,316 | 19 | 1 | **Shell; donor tree polluted** |
| claim-proof | `claim-proof` | 7,559 | 1,316 | 19 | 1 | **Shell; donor tree polluted** |
| private-office | `mailmypdf-private-office` | reviewed separately | reviewed separately | 133 | 23 | **Product front door; not a vertical donor** |
| small-business | `mailmypdf-smallbusiness` | reviewed separately | reviewed separately | 115 | 20 | **Product front door; not a vertical donor** |

Counts are from the GitHub `main` tree and the checked-out monorepo tree. The three
7,559-file donor results are not evidence of 1,316 real workflows: their top-level
tree is a copied workspace containing unrelated conversation artifacts.

## Integration decisions for other repositories

| Repository | Decision | Reason / next action |
|---|---|---|
| `fairprocessmaps` | **Integrate as Fair Process intelligence surface** | Existing Fair Process work; expose as a separate front door and shared case/intelligence capability. |
| `ruthlessinvestigator` | **Integrate behind Fair Process** | Previously approved investigator capability; keep its own entitlement and audit boundary. |
| `advanced-search` | **Integrate behind Fair Process** | Previously approved search capability; use as a governed retrieval service, not a workflow donor. |
| `mailmypdf-platform` | **Integrate as platform control plane** | Shared auth, billing, entitlements, routing, observability, and provider policy. |
| `mailmypdf-private-office` | **Integrate as premium front door** | Premium UI and private-office packaging; no duplicated domain runtime. |
| `mailmypdf-smallbusiness` | **Integrate as segment front door** | Small-business packaging; reuse canonical workflows and pricing contracts. |
| `appeal-mail`, `benefits-appeal`, `notice-respond`, `immigration-mail`, `dispute-mail`, `records-requests`, `code-enforcement`, `insurance-claims` | **Reviewed donor/source** | Restore file-level parity into `apps/verticals/*`; then freeze donors. |
| `tenant-reply`, `permit-reply`, `claim-proof` | **Do not copy wholesale** | Trees are polluted snapshots. Reconstruct from verified domain requirements and any individually reviewed source files. |
| `permit-response`, `gov-reply`, `debt-defense`, `case-evidence` | **Capability evidence only** | Small or contract-only repositories; harvest specifications/contracts, not front doors. |
| `custom-engrave-studio`, `nocodereviewed`, `Anything`, `dennisellistrellis`, `direct-screen-dup`, `apex-solver`, `genesis-design`, `coastal-scribe`, `stellar-listing-glimmer`, `glassy-dreams`, `no-code-reviews`, `nurture-build-verse`, `ruth-solv-flow`, `pixel-perfect-replica`, `instant-audience-engine`, `redact-desk`, `AccessForge`, `humboldt-digital-commons`, `permitsignal`, `ParcelProof`, `code-sale-finder`, `humboldt-records-watch`, `civic-ledger`, `civic-ledger-hub`, `contentforge-ai`, `TrustTrace`, `deal-intelligence-command-center`, `capitol-lens`, `image-upscale`, `agent-x`, `project-unify`, `bolt.diy-`, `exact-page-builder` | **No integration in this pass** | No demonstrated MailMyPDF/Fair Process contract. Reconsider only with an explicit product/security use case. |

## Restoration order

1. **Appeal Mail**: use the standalone workflow components and per-workflow API
   routes as the first parity reference; reconcile every file against the monorepo
   secure runtime instead of copying provider or payment code.
2. **Benefits, Immigration, Code Enforcement, Insurance Claims**: close the
   near-parity verticals and turn their existing focused tests into release gates.
3. **Notice Respond and Records Request**: reconcile factory/registry conflicts and
   canonical IDs before adding more UI.
4. **Dispute Mail**: review only clean, top-level donor files; quarantine the
   20k-file polluted tree.
5. **Tenant Reply, Permit Reply, Claim Proof**: rebuild from requirements and
   verified contracts; do not promote their copied workspace artifacts.

## Definition of done per workflow

- one canonical workflow ID and route in the vertical registry;
- front-door page links to the same ID and shows the real capability state;
- auth/context gate runs before document intake or model invocation;
- Claude is the default provider, with explicit Gemini/OpenAI fallback policy;
- untrusted documents are delimited and never treated as instructions;
- analyze → draft → validate/approve → checkout/fulfillment paths are executable;
- pricing and entitlement checks are server-side and idempotent;
- provenance, audit, retention, and deletion behavior are observable;
- focused tests cover the route, provider policy, schema, auth, and fulfillment;
- the workflow is removed from any “complete” catalog until every gate passes.

No donor is frozen and no vertical is marked complete until this checklist is
machine-checked in the monorepo.
