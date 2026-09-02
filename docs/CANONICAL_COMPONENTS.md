# Canonical Components — Platform Capabilities Map

**Status:** Initial establishment  
**Last Updated:** 2026-09-02  
**Scope:** MailMyPDF V1 platform capabilities

## Overview

This document identifies the canonical platform implementations that all workflows should reuse rather than reimplementing. It answers: "For capability X, which package/implementation should new workflows reference?"

## Component Directory

### Authentication & Authorization

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| User Authentication | @mailmypdf/ecosystem | `packages/ecosystem` | Production | ✅ |
| Role-Based Access Control | @mailmypdf/ecosystem | `packages/ecosystem` | Production | ✅ |
| Matter Ownership Scoping | @mailmypdf/ecosystem | `packages/ecosystem` | Production | ✅ |
| Row-Level Security (RLS) | Supabase native | (in Supabase config) | Production | ✅ |

**Notes:** 
- No local authentication — use Supabase Auth
- No direct database queries — use RLS-enforced policies
- No secrets in client code — use server functions only

---

### AI & Language Models

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Multi-Provider LLM Interface | (to be created) | `packages/ai` | Experimental | 🟡 |
| Claude Adapter | notice-respond | `src/platform/llm-service.ts` | Production-ish | 🟡 |
| Gemini Adapter | notice-respond | `src/platform/llm-service.ts` | Production-ish | 🟡 |
| OpenAI Adapter | notice-respond | `src/platform/llm-service.ts` | Production-ish | 🟡 |
| Fallback Routing | notice-respond | `src/platform/llm-service.ts` | Experimental | 🟡 |
| Structured Output Parsing | notice-respond | (inline in routes) | Experimental | ❌ |
| Prompt Versioning | (none exists) | — | Missing | ❌ |
| Schema Versioning | (none exists) | — | Missing | ❌ |

**Current State:**
- LLM service exists in notice-respond only
- Multi-provider support (Gemini primary, Claude/OpenAI fallback)
- Default model configs in env vars
- No structured output validation

**Next Steps:**
1. Extract LLM service to @mailmypdf/ai
2. Add official Anthropic SDK support
3. Implement structured output validation with Zod
4. Add prompt/schema versioning

**Example Usage:**
```typescript
// Current (notice-respond only)
import { callLLM, callGeminiWithDocument } from "@/platform/llm-service";

// Future (platform-level)
import { callLLM, callWithFallback } from "@mailmypdf/ai";
```

---

### Document & File Handling

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| File Upload Security | notice-respond | `src/domain/security.ts` | Production | ✅ |
| MIME Type Validation | notice-respond | `src/domain/security.ts` | Production | ✅ |
| File Size Validation | notice-respond | `src/domain/security.ts` | Production | ✅ |
| PDF Text Extraction | notice-respond | (inline in routes) | Experimental | 🟡 |
| Document Storage | @mailmypdf/documents | `packages/documents` | Experimental | 🟡 |
| Document Metadata | @mailmypdf/documents | `packages/documents` | Experimental | 🟡 |
| Document Versioning | (none exists) | — | Missing | ❌ |

**Current State:**
- Security validation in notice-respond
- PDF text extraction uses basic regex (unreliable for complex PDFs)
- Document storage/retrieval minimal

**Next Steps:**
1. Promote security functions to @mailmypdf/documents
2. Implement robust PDF parsing (pdf-lib or similar)
3. Add document versioning for evidence tracking

---

### Workflow & Pipeline Execution

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Pipeline Registry | @mailmypdf/workflows | `packages/workflows/src/pipeline-registry.ts` | Production | ✅ |
| Domain Pack Contract | @mailmypdf/workflows | `packages/workflows/src/domain-pack-contract.ts` | Production | ✅ |
| Gold Standard Pipeline | @mailmypdf/workflows | `packages/workflows/src/gold-standard-pipeline.ts` | Production | ✅ |
| Configured Pipeline Runner | @mailmypdf/workflows | `packages/workflows/src/configured-pipeline.ts` | Production | ✅ |
| Workflow Factory | @mailmypdf/workflows | `packages/workflows/src/workflow-factory.ts` | Production | ✅ |
| Workflow Manifest | @mailmypdf/workflows | `packages/workflows/src/workflow-manifest.ts` | Production | ✅ |
| Stage Result Types | @mailmypdf/workflows | `packages/workflows/src/gold-standard-pipeline.ts` | Production | ✅ |
| Adapter Registry | @mailmypdf/workflows | `packages/workflows/src/adapter-registry.ts` | Production | ✅ |

**Current State:**
- Complete infrastructure for factory execution exists
- 10 pipeline profiles defined (P01-P10)
- No concrete domain pack implementations yet
- No integration with actual workflows

**Next Steps:**
1. Implement CP2000 domain pack (in progress)
2. Implement second domain pack (immigration/appeal)
3. Create domain pack test fixtures
4. Add observability/logging

---

### Pricing & Payment

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Pricing Engine | @mailmypdf/pricing | `packages/pricing` | Production | ✅ |
| Stripe Integration | @mailmypdf/payment-fulfillment | `packages/payment-fulfillment` | Production | ✅ |
| Payment Intent Creation | @mailmypdf/payment-fulfillment | `packages/payment-fulfillment` | Production | ✅ |
| Payment Verification | @mailmypdf/payment-fulfillment | `packages/payment-fulfillment` | Production | ✅ |
| Webhook Handling | @mailmypdf/payment-fulfillment | `packages/payment-fulfillment` | Production | ✅ |
| Idempotency | @mailmypdf/payment-fulfillment | `packages/payment-fulfillment` | Production | ✅ |

**Current State:**
- Pricing and Stripe integration are canonical
- Payment-first fulfillment workflow established
- Idempotent mailing intent model

**Usage:**
All verticals should use @mailmypdf/pricing and @mailmypdf/payment-fulfillment for payment handling.

---

### Fulfillment & Mailing

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Mailing Client | @mailmypdf/mailing-client | `packages/mailing-client` | Production | ✅ |
| Lob Integration | @mailmypdf/fulfillment | `packages/fulfillment` | Production | ✅ |
| Mail Submission | @mailmypdf/fulfillment | `packages/fulfillment` | Production | ✅ |
| Tracking Status | @mailmypdf/fulfillment | `packages/fulfillment` | Production | ✅ |
| Proof of Mailing | mailmypdf (core) | `src/lib/proof-of-service/` | Production | ✅ |

**Current State:**
- Canonical mailing infrastructure exists
- Lob provider integration is production-tested
- Proof of service with custody chains

**Usage:**
All verticals should use @mailmypdf/fulfillment for actual mailing. Do not implement custom mail providers.

---

### Facts, Evidence & Provenance

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Fact Model | notice-respond | `src/domain/fact.ts` | Production | ✅ |
| Fact Provenance | notice-respond | `src/domain/draft-provenance.ts` | Production | ✅ |
| Evidence Checklist | notice-respond | (CP14/CP2000-specific) | Domain-Specific | 🟡 |
| Contradiction Detection | notice-respond | `src/domain/contradiction.ts` | Production | ✅ |
| Missing Info Detection | notice-respond | `src/domain/missing-info.ts` | Production | ✅ |

**Current State:**
- Fact model with provenance exists
- Evidence is domain-specific (CP14 vs CP2000)
- Contradiction/missing-info detection is generic

**Next Steps:**
1. Promote Fact model to platform if not already shared
2. Create generic Evidence model
3. Promote contradiction/missing-info detection

---

### Case Models & State

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Case Model (Generic) | (to be created) | `packages/core` | Missing | ❌ |
| CP2000 Case | notice-respond | `src/domain/cp2000-case.ts` | Domain-Specific | 🟡 |
| CP14 Case | notice-respond | `src/domain/cp14-case.ts` | Domain-Specific | 🟡 |
| Case Phase Enum | notice-respond | (per-domain) | Domain-Specific | 🟡 |
| Case Maturity | notice-respond | (per-domain) | Domain-Specific | 🟡 |

**Current State:**
- CP2000 and CP14 cases are ~95% identical
- Different field extraction but same structure
- No generic base case model

**Next Steps:**
1. Extract generic Case model to @mailmypdf/core
2. Define generic phases: intake → classification → extraction → analysis → strategy → drafting → validation → review → approved → complete
3. Create per-domain case extensions that add domain-specific fields

---

### Validation

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Draft Validator (Generic) | notice-respond | `src/domain/draft-validator.ts` | Production | ✅ |
| CP2000 Validation | notice-respond | `src/domain/cp2000-validation.ts` | Production | ✅ |
| CP14 Validation | notice-respond | `src/domain/cp14-validation.ts` | Production | ✅ |
| CP14 Authority Gate | notice-respond | `src/domain/cp14-authority-gate.ts` | Production | ✅ |
| Schema Validation | (using Zod inline) | (various) | Experimental | 🟡 |

**Current State:**
- Generic draft validation exists
- Domain-specific validation is fine-grained
- Authority gate pattern proven for CP14
- No cross-domain validation reuse

**Next Steps:**
1. Promote draft-validator to platform
2. Create generic validation gate pattern
3. Implement domain pack certification tests

---

### SEO & Metadata

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Workflow Registry | notice-respond | `src/domain/workflow-catalog.ts` | Production | ✅ |
| SEO Head Tags | notice-respond | `src/domain/enhanced-head.ts` | Production | ✅ |
| Workflow Metadata | notice-respond | (embedded in catalog) | Production | ✅ |
| Sitemap Generation | (none exists) | — | Missing | ❌ |

**Current State:**
- Workflow catalog is per-vertical
- SEO metadata is embedded in route definitions
- No canonical sitemap generation

**Next Steps:**
1. Consolidate workflow registry to @mailmypdf/workflows
2. Promote SEO head generation to platform
3. Create sitemap generation for all verticals

---

### Observability & Logging

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Request ID Tracking | mailmypdf (core) | `src/lib/request-id.ts` | Production | ✅ |
| Audit Logging | mailmypdf (core) | `src/lib/audit-log.ts` | Production | ✅ |
| Error Reporting | (none centralized) | — | Experimental | 🟡 |
| Analytics Events | mailmypdf (core) | `src/lib/analytics-events.ts` | Production | ✅ |
| Stage Logging | (none exists) | — | Missing | ❌ |
| Performance Tracking | (none centralized) | — | Missing | ❌ |

**Current State:**
- Basic audit logging exists
- Analytics events sent to internal tracking
- No per-stage logging in pipeline

**Next Steps:**
1. Add stage-level logging to pipeline executor
2. Implement performance tracking (duration per stage)
3. Create error/exception centralization

---

### Testing & Fixtures

| Capability | Package | Location | Maturity | Status |
|---|---|---|---|---|
| Golden Fixtures | notice-respond | `tests/fixtures/` | Domain-Specific | 🟡 |
| Unit Test Patterns | (various) | (test files) | Production | ✅ |
| Integration Tests | notice-respond | `tests/e2e/` | Domain-Specific | 🟡 |
| Property-Based Testing | (none) | — | Missing | ❌ |
| Test Utilities | @mailmypdf/core | (possibly) | Experimental | 🟡 |

**Current State:**
- Golden fixtures exist per-workflow
- Test patterns are established
- No property-based testing

**Next Steps:**
1. Extract test utilities to platform
2. Create golden fixture format
3. Implement property-based tests for state transitions

---

## Canonical Implementation Rules

### Rule 1: No Local Reimplementation
If a canonical implementation exists for a capability, do NOT create a local version in a vertical.

**Example:**
```typescript
// ❌ WRONG — reimplementing payment
function submitMailing(draftId: string) {
  const stripe = new Stripe(apiKey);
  const session = await stripe.checkout.sessions.create({...});
}

// ✅ RIGHT — using canonical
import { createPaymentIntent } from "@mailmypdf/payment-fulfillment";
function submitMailing(draftId: string) {
  const intent = await createPaymentIntent(draftId);
}
```

### Rule 2: Exceptions Are Documented
If a workflow must deviate from canonical, document WHY.

**Example:**
```typescript
// EXCEPTION: Immigration workflows use Google Translate because
// case law requires certified translations. Standard LLM service
// doesn't support certification tracking.
// TODO: Extract certification tracking to platform when multiple
// verticals need it.
```

### Rule 3: Shared Tests
If a capability is canonical, its tests live in its package.

**Example:**
```
packages/payment-fulfillment/
  src/
    payment-intent.ts
    webhook-handler.ts
  tests/
    payment-intent.test.ts
    webhook-handler.test.ts
    idempotency.test.ts
```

Verticals should NOT duplicate these tests locally.

---

## Promotion Criteria

A component is ready to promote from vertical → platform when:

1. **Proven:** 2+ verticals need it (or 1 vertical has proven production use)
2. **Stable:** No breaking API changes in last 2 releases
3. **Tested:** >80% test coverage, integration tests passing
4. **Documented:** Clear API docs, usage examples, integration guide
5. **Licensed:** No licensing conflicts with other platform packages
6. **Maintainable:** <200 external dependencies, <500 LOC core logic

---

## Migration Checklist

When promoting a component to platform:

- [ ] Create package directory in `packages/`
- [ ] Copy source files + tests
- [ ] Extract interfaces/types to `types.ts`
- [ ] Create `index.ts` with exports
- [ ] Add `package.json` with versions + dependencies
- [ ] Create `README.md` with usage examples
- [ ] Add TypeScript configuration
- [ ] Publish to npm (if applicable)
- [ ] Update vertical imports
- [ ] Retire old local implementations
- [ ] Document in CANONICAL_COMPONENTS.md
- [ ] Add to PR template: "Do not create new [capability] implementations; use @mailmypdf/[package]"

---

## Current Gaps

High-Priority Gaps (needed for V1 Factory):

1. **Generic Case Model** — CP2000/CP14/others need unified base
2. **LLM Service Extraction** — Currently siloed in notice-respond
3. **Domain Pack Implementations** — Only stubs exist; no real CP2000 pack
4. **AI Provenance** — Track which LLM/model generated which output
5. **Structured Output Validation** — Parse and validate JSON from LLMs with Zod

Medium-Priority Gaps:

6. **Prompt Management** — Version prompts separately from domain logic
7. **Evidence Model** — Generic evidence type (currently per-domain)
8. **Workflow Composition** — Can workflows recommend/trigger other workflows?
9. **Stage Observability** — Logging/tracing through pipeline
10. **Portable Fixtures** — Golden test fixtures independent of framework

Low-Priority Gaps:

11. **Property-Based Testing** — Generative testing for state machines
12. **Dynamic Pricing** — Per-workflow pricing overrides
13. **Workflow Analytics** — Which workflows are users starting/completing
14. **Multi-Language Support** — Internationalization framework

---

## Future Canonical Packages

Likely candidates for future platform packages:

- `@mailmypdf/ai-runtime` — Multi-provider LLM with structured output
- `@mailmypdf/cases` — Generic case model and state management
- `@mailmypdf/evidence` — Evidence storage and relationships
- `@mailmypdf/deadlines` — Deadline calculation and tracking
- `@mailmypdf/strategy` — Strategy modeling and comparison
- `@mailmypdf/observability` — Logging, tracing, metrics
- `@mailmypdf/testing` — Test utilities, fixtures, matchers
- `@mailmypdf/serialization` — Type-safe data serialization

