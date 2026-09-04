# Ecosystem Architecture

**Date:** 2026-08-18
**Status:** Living document — updated after domain ownership correction

---

## Overview

MailMyPDF is a multi-repository ecosystem for guided document-response workflows. The architecture follows a strict layering principle: shared capabilities live in the platform, domain logic lives in verticals, and every workflow has exactly one canonical owner.

```
                    MAILMYPDF
                        |
                MAILMYPDF-PLATFORM
                        |
       +----------------+----------------+
       |                |                |
   VERTICALS        SHARED ENGINES     MAILING
       |
       +-- Notice Respond
       +-- Dispute Mail
       +-- Appeal Mail
       +-- Immigration Mail
       +-- Debt Defense
       +-- Records Requests
       +-- Insurance Claims
       +-- Tenant Reply
       +-- Benefits Appeal
       +-- Permit Response
       +-- Code Enforcement
```

---

## Layer 1 — MailMyPDF Platform (mailmypdf-platform)

**Owns:** Reusable technology primitives and stable ecosystem contracts.

### Platform Capabilities (shared across ALL verticals)

| Capability | Description | Status |
|------------|-------------|--------|
| Document model | Document lifecycle, metadata, provenance, classification contract | Defined |
| Security validation | Max size, MIME types, forbidden content, text sanitization | Defined |
| SourceRef / Provenance | Document → page → locator, provenance classification | Defined |
| Fact model | Subject, predicate, value, source, confidence, provenance, status | Defined |
| Evidence model | Claim, supporting, contradicting, missing, source, relevance | Defined |
| Contradiction model | Statement A vs B, sources, confidence, severity, review status | Defined |
| Timeline model | Event, date/time, type, description, source, provenance | Defined |
| Deadline primitives | Event + rule = deadline (separated: extraction / rule / calculation) | Defined |
| Finding model | Type, severity, confidence, title, explanation, source, evidence | Defined |
| AI task contract | Task ID, input schema, model, structured output, validation | Defined |
| Audit event model | Timestamped, attributable, structured, queryable, immutable | Defined |
| Proof artifact model | Artifact, hash, version, kind | Defined |
| Fulfillment adapter | createMailing, getMailing, cancelMailing, getTracking, getProof | Defined |
| Ecosystem identity | Account/org identity, entitlement, billing contracts | Defined |
| Design tokens | Color, typography, spacing, radius, shadows, borders | Defined |

### What Does NOT Belong in the Platform

- Vertical-specific domain logic (CP2000 extraction, FCRA rules, FOIA procedures)
- Vertical-specific UI components or pages
- Any specific provider SDK integrations (Lob, Stripe, Resend, Supabase)
- Authentication implementation
- Vertical application databases

---

## Layer 2 — Verticals

Each vertical owns its domain logic, workflows, and user experience.

### Notice Respond (notice-respond)

**Status:** Active — gold-standard reference implementation

**Scope:** Respond to notices, orders, demands, correspondence, or administrative actions received from government agencies, courts, municipalities, or other authorities.

**Core flow:** Government/agency notice → understand → analyze → determine response → draft → validate → mail

**Canonical workflows (7):**

| Workflow | Engine | Maturity | Route? | Production-Connected? |
|----------|--------|----------|--------|----------------------|
| cp2000-response | document-action | functional | ✅ 946 lines | ✅ Full intelligence pipeline |
| cp14-response | document-action | authority | ✅ 973 lines | ✅ Full intelligence pipeline |
| cp504-response | document-action | functional | ✅ 556 lines | ✅ Full intelligence pipeline |
| irs-notice | document-action | functional | ✅ 324 lines | ✅ Extraction + validation |
| court-summons | document-action | functional | ✅ 113 lines | ✅ Basic |
| agency-action | document-action | functional | ✅ 116 lines | ✅ Basic |
| file-appeal | appeal | functional | ✅ 117 lines | ⚠️ Ambiguous — see below |

**file-appeal ambiguity:** Uses the appeal engine but is registered in notice-respond. A "file an appeal" could be a notice-respond workflow (responding to a denial notice from a government agency) or an appeal-mail workflow (appealing any adverse decision). **Decision: RESEARCH** — the workflow is generic enough that it may belong in appeal-mail. However, it currently functions within notice-respond and its removal would break existing routes. Leave in place until appeal-mail has a concrete implementation.

### Dispute Mail (dispute-mail)

**Status:** Active — has simpler implementations, needs upgrade

**Scope:** Challenge inaccurate information, debts, charges, records, transactions, or claims.

**Core flow:** Consumer identifies inaccurate information → dispute → evidence → contradiction → response

**Canonical workflows (13):**

| Workflow | Engine | Maturity | Implementation Location | Code Status |
|----------|--------|----------|------------------------|-------------|
| transunion-dispute | dispute | functional | notice-respond repo | ⚠️ Needs migration |
| experian-dispute | dispute | functional | notice-respond repo | ⚠️ Needs migration |
| equifax-dispute | dispute | functional | notice-respond repo | ⚠️ Needs migration |
| credit-report-dispute | dispute | blueprint | registry only | No code |
| lexisnexis-dispute | dispute | blueprint | registry only | No code |
| hard-inquiry-dispute | dispute | blueprint | registry only | No code |
| collection-dispute | dispute | blueprint | registry only | No code |
| fcra-dispute | dispute | blueprint | registry only | No code |
| debt-collection-dispute | dispute | blueprint | registry only | No code |
| debt-validation | dispute | blueprint | dispute-mail repo | Basic UI shell |
| fdcpa-dispute | dispute | blueprint | registry only | No code |
| debt-lawsuit-response | dispute | blueprint | registry only | No code |
| collection-cease-contact | dispute | blueprint | registry only | No code |

**Code-level situation:** Notice-respond contains the superior credit dispute implementation (credit-dispute.ts with 299 lines of bureau-specific extraction + transunion-dispute.ts with 270 lines of TransUnion-specific logic). Dispute-mail has only basic UI shells (credit-report.tsx at 137 lines, no extraction, no security, no validation).

**Migration plan:**
1. The reusable infrastructure (security, validation, mailing, workflow-shell) should be extracted to mailmypdf-platform
2. The domain-specific logic (bureau configs, FCRA extraction) should move to dispute-mail
3. The workflow-specific configuration should stay as workflow definitions
4. Migration is deferred until the factory architecture is finalized to avoid duplication

**Dispute vs. Debt Defense boundary:**
- DISPUTE ACTION: challenging the accuracy of specific information (credit report errors, billing errors)
- DEBT DEFENSE JOURNEY: handling the broader debt collection lifecycle (validation, defense, FDCPA, lawsuits)
- Debt-defense workflows (debt-validation, fdcpa-dispute, debt-lawsuit-response, collection-cease-contact) may belong in debt-defense rather than dispute-mail. **Decision: RESEARCH** — determine whether debt-defense has a distinct enough journey model to warrant a separate vertical.

### Appeal Mail (appeal-mail)

**Status:** Planned — blueprints only, no implementation

**Scope:** Challenge an adverse decision after a decision/denial has already been issued.

**Canonical workflows (12):** All blueprints, no code, no routes.

### Immigration Mail (immigration-mail)

**Status:** Planned — blueprints only, no implementation

**Scope:** USCIS and immigration-specific correspondence and evidence workflows.

**Canonical workflows (3):** All blueprints, no code, no routes.

### Records Requests (records-requests)

**Status:** Planned — blueprints only, no implementation

**Scope:** Obtain records, documents, communications, reports, or public information.

**Canonical workflows (11):** All blueprints, no code, no routes.

### Other Verticals

| Vertical | Workflows | Status | Implementation |
|----------|-----------|--------|----------------|
| code-enforcement | 1 (blueprint) | planned | none |
| tenant-reply | 1 (blueprint) | planned | none |
| insurance-claims | 0 (assigned to appeal-mail) | research | none |
| benefits-appeal | 0 (assigned to appeal-mail) | research | none |
| permit-response | 0 | research | none |
| debt-defense | 0 (assigned to dispute-mail) | research | none |

---

## Layer 3 — Workflows

Each workflow is a concrete instance of a domain pipeline. A workflow is NOT merely a registry entry — it must have:

1. **Definition** — MasterWorkflowDefinition with full schema
2. **Domain pack** — registered via registerDomainPack()
3. **Route** — a production route file that imports and uses the intelligence modules
4. **Tests** — at least basic tests proving the pipeline works
5. **Security** — content classification, input validation, file validation
6. **Mailing** — MailingFunnel integration

### Maturity States (strictly separated)

| State | Meaning |
|-------|---------|
| **blueprint** | Registry entry exists, definition may exist, no route, no intelligence modules, no tests |
| **functional** | Route exists, basic extraction + validation wired, tests pass, mailing works |
| **authority** | Full gold-standard pipeline: security + extraction + provenance + discrepancy + evidence + research + strategy + draft + provenance + two-pass validation + BLOCK enforcement + mailing + E2E tests + authority gate |

**Only CP14 currently meets the authority standard.**

---

## Layer 4 — User Experience / SEO Entry Points

SEO routes provide discoverability. Some are redirects to canonical workflows:

| SEO Route | Redirects To | Status |
|-----------|-------------|--------|
| respond-to-cp2000-notice | cp2000-response | ✅ |
| respond-to-cp14-notice | cp14-response | ✅ |
| respond-to-an-irs-notice | irs-notice | ✅ |
| respond-to-a-court-summons | court-summons | ✅ |
| respond-to-an-agency-action | agency-action | ✅ |
| respond-to-an-ssa-notice | (no target) | ⚠️ Dead end |
| respond-to-a-benefits-notice | (no target) | ⚠️ Dead end |
| respond-to-a-dmv-notice | (no target) | ⚠️ Dead end |
| respond-to-a-permit-correction-notice | (no target) | ⚠️ Dead end |
| respond-to-a-uscis-notice | (no target) | ⚠️ Dead end |
| respond-to-a-tax-notice | (no target) | ⚠️ Dead end |
| respond-to-code-enforcement-notice | (no target) | ⚠️ Dead end |

**Dead-end SEO routes** are 10-line redirect stubs that point to workflows that don't exist yet. They should either be connected to real workflows or removed to avoid user frustration.

---

## Architecture Rules

1. **Every workflow has ONE canonical owner.** The owning vertical is determined by the user's problem/domain, not by which engine executes it.
2. **Shared capabilities belong in the platform, not duplicated across verticals.**
3. **The engine does NOT determine the domain.** CP2000 (document-action) and TransUnion dispute (dispute) both analyze documents but belong to different verticals.
4. **A workflow is not "functional" merely because it has a registry entry.** It must have a production route that uses the intelligence modules.
5. **A workflow is not "authority" merely because tests pass.** It must have all gold-standard pipeline stages connected and an authority gate that passes.
6. **No vertical is a dumping ground.** Notice Respond is for government/agency notices, not for every workflow involving a letter.
7. **Metadata ownership and code ownership should match.** When they don't, document the gap and plan the migration.
