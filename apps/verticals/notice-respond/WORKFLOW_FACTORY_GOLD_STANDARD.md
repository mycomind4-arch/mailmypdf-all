# Workflow Factory Gold Standard

**Date:** 2026-08-18
**Status:** Architecture specification — derived from CP14/CP2000 implementations

---

## Objective

Transform the gold-standard CP14/CP2000 pattern into a reusable factory that can produce hundreds of genuinely useful, runtime-connected workflows from a common architecture — without cloning the entire codebase.

```
1 gold-standard workflow
→ reusable factory architecture
→ 10 workflows
→ 50 workflows
→ 100 workflows
→ 200 workflows
```

---

## The Gold-Standard Pipeline

Every authority-level workflow must wire this exact pipeline:

```
UPLOAD
↓
SECURITY (file validation, content classification, text sanitization)
↓
CLASSIFICATION (notice type detection, confidence scoring)
↓
EXTRACTION (domain-specific field extraction with patterns)
↓
FACTS + PROVENANCE (structured facts with source references)
↓
DEADLINE ANALYSIS (deadline extraction, certainty scoring)
↓
CONTRADICTION / MISSING INFORMATION (cross-check facts, detect gaps)
↓
DOMAIN FINDINGS (structured findings with states: confirmed, discrepancy, missing, ambiguous, requires_verification, unsupported)
↓
DISCREPANCY ANALYSIS (compare extracted amounts, dates, against taxpayer-provided facts)
↓
EVIDENCE CHECKLIST (dynamically generated from findings, lifecycle: missing → requested → provided → verified → rejected → not_applicable)
↓
VERIFIED RESEARCH (source facts from official government sources, separated from system interpretation)
↓
DOMAIN STRATEGY (evidence-derived position: pay/resolve, dispute, request correction, provide documentation, seek professional review)
↓
DRAFT (generated from strategy + facts + research)
↓
DRAFT PROVENANCE (every assertion traced to source)
↓
TWO-PASS VALIDATION (Pass 1: factual consistency, Pass 2: requirement completeness)
↓
BLOCK / PASS GATE (BLOCK prevents approval/mailing)
↓
USER REVIEW (review checks, user confirms accuracy)
↓
APPROVAL (user approves draft for mailing)
↓
MAILING (MailingFunnel: standard/certified/registered)
↓
PROOF / TRACKING (order ID, tracking number, proof of delivery)
```

---

## Three-Layer Factory Architecture

### Layer 1: SHARED FACTORY CAPABILITY

These are engine-agnostic and domain-agnostic. They should live in `mailmypdf-platform` (or shared packages) and be imported by every vertical.

| Capability | Current Location | Target Location | Interface |
|-----------|-----------------|-----------------|-----------|
| Secure ingestion | `src/domain/security.ts` | platform | `validateFilename()`, `validateFileSize()`, `validateMimeType()`, `classifyContent()`, `validateTextInput()` |
| Classification | `src/domain/notice-type.ts` | platform | `classifyNoticeType(text) → {type, confidence}` |
| Fact model | `src/domain/fact.ts` | platform | `createFact()`, `NoticeFact` |
| Provenance model | `src/domain/provenance.ts` | platform | `SourceRef`, provenance classification |
| Contradiction detection | `src/domain/contradiction.ts` | platform | `detectContradictions()`, `contradictionSummary()` |
| Missing info detection | `src/domain/missing-info.ts` | platform | `detectMissingInfo()`, `missingInfoSummary()` |
| Draft provenance | `src/domain/draft-provenance.ts` | platform | `buildDraftProvenance()` |
| Draft validation (generic) | `src/domain/draft-validator.ts` | platform | `validateDraft()` |
| Workflow state | `src/domain/workflow-runtime.ts` | platform | `createWorkflowState()`, `advanceStep()`, `canAdvance()` |
| Mailing funnel | `src/components/mailing-funnel.tsx` | platform | `MailingFunnel` component |
| Workflow shell | `src/components/workflow-shell.tsx` | platform | `Stepper`, `MailOptions`, `RecipientForm`, `ReviewChecks` |
| Case model | domain-specific case files | platform contract | `CaseState` interface (each domain implements) |
| Evidence model interface | domain-specific evidence files | platform contract | `EvidenceChecklist` interface |
| Research pack interface | domain-specific research files | platform contract | `ResearchPack` interface |
| Strategy interface | domain-specific strategy files | platform contract | `ResponseStrategy` interface |
| Validation interface | domain-specific validation files | platform contract | `ValidationResult { passed, warnings, errors, blocks }` |

### Layer 2: DOMAIN PACK

These are domain-specific but workflow-agnostic within a domain. They live in the owning vertical repo.

| Pack Component | CP14 Example | CP2000 Example | What It Provides |
|----------------|-------------|----------------|-----------------|
| Case model | `cp14-case.ts` | `cp2000-case.ts` | Domain-specific case state, analysis setters, strategy/draft/validation setters |
| Findings | `cp14-findings.ts` | `cp2000-findings.ts` | Finding types specific to the notice type |
| Discrepancy rules | `cp14-discrepancy.ts` | `cp2000-discrepancy.ts` | What to compare, how to compare, what constitutes a discrepancy |
| Evidence rules | `cp14-evidence.ts` | `cp2000-evidence.ts` | What evidence is needed, how it's generated from findings |
| Research sources | `cp14-research.ts` | `cp2000-research.ts` | Verified official sources, source facts vs system interpretation |
| Strategy rules | `cp14-strategy.ts` | `cp2000-strategy.ts` | Domain-specific strategy positions, evidence-derived recommendations |
| Validation rules | `cp14-validation.ts` | `cp2000-validation.ts` | Domain-specific factual and requirement checks |
| Domain pack registration | `cp14-packs.ts` | `cp2000-packs.ts` | Registers all packs with the factory |

### Layer 3: WORKFLOW CONFIGURATION

These are workflow-specific. They live in the workflow definition + route file.

| Config | CP14 Example | CP2000 Example | What It Provides |
|--------|-------------|----------------|-----------------|
| Workflow ID | `"cp14-response"` | `"cp2000-response"` | Unique identifier |
| Canonical domain | `"notice-respond"` | `"notice-respond"` | Owning vertical |
| SEO metadata | title, description, FAQ | title, description, FAQ | Search engine optimization |
| Keyword metadata | MSV, CPC, competition | MSV, CPC, competition | Search demand (TBD until researched) |
| UI copy | Step labels, disclaimer | Step labels, disclaimer | User-facing text |
| Specific fields | noticeNumber, taxYear, balanceDue, responseDeadline | noticeNumber, taxYear, proposedAdjustments, responseDeadline | Extraction targets |
| Specific templates | CP14 draft template | CP2000 draft template | Draft structure |
| Route file | `cp14-response.tsx` | `cp2000-response.tsx` | Production route wiring |

---

## Factory Assessment

### Current State

The factory (`workflow-factory.ts`) currently:
- ✅ Validates workflow definitions (required fields, engine resolution)
- ✅ Loads capability packs from engine registry
- ✅ Loads domain pack sets via `getDomainPack()`
- ✅ Checks maturity claims against quality gates
- ✅ Supports batch construction of all workflows

### Current Gaps

1. **The factory constructs metadata, not runtime pipelines.** It validates that a definition exists and a domain pack is registered, but it does not wire the actual intelligence modules (security, extraction, discrepancy, evidence, research, strategy, validation) into a runnable pipeline.

2. **The factory does not generate routes.** Each workflow still requires a hand-written route file (~500-1000 lines) that imports and wires all the intelligence modules.

3. **The factory does not generate tests.** Each gold-standard workflow requires hand-written test fixtures and E2E tests.

4. **The domain pack interface is a contract, not an implementation.** `DomainPackSet` describes what a pack does, but the actual extraction, discrepancy, evidence, and strategy logic must still be hand-coded in domain modules.

### What the Factory CAN Do Today

- Construct a `ConstructedWorkflow` from a `MasterWorkflowDefinition`
- Validate that all required definition fields are present
- Resolve the engine and load its shared capabilities
- Check if a domain pack set is registered
- Verify quality gate claims match lifecycle status

### What the Factory CANNOT Do Today

- Generate a production route file from a definition + domain pack
- Wire intelligence modules into a runtime pipeline
- Generate test fixtures from a workflow definition
- Auto-create extraction logic from extraction field lists
- Auto-create strategy rules from strategy position labels

### Factory Maturity

**BLUEPRINT** — The factory can validate and construct workflow definitions, but it cannot generate runtime-connected workflows. Each workflow still requires manual implementation of:
- Domain-specific extraction (~400 lines)
- Domain-specific discrepancy analysis (~300 lines)
- Domain-specific evidence checklist (~200 lines)
- Domain-specific research pack (~170 lines)
- Domain-specific strategy engine (~200 lines)
- Domain-specific validation (~300 lines)
- Domain-specific case model (~300 lines)
- Production route file (~500-1000 lines)
- Test fixtures and E2E tests (~200-500 lines)

**Total per gold-standard workflow: ~2,500-3,000 lines of domain-specific code.**

### Path to Factory Maturity

To make the factory truly generative:

1. **Shared pipeline runner** — A generic `runWorkflowPipeline(definition, domainPack, input)` function that executes the full pipeline using the domain pack's interfaces. This would eliminate the need for per-workflow route files.

2. **Domain pack SDK** — A set of base classes/implementations that domain packs can extend, reducing the per-workflow code to just the domain-specific rules.

3. **Test fixture generator** — A tool that generates test fixtures from a workflow definition + domain pack.

4. **Route generator** — A tool that generates a route file from a workflow definition + domain pack, using a shared UI shell with progressive disclosure.

---

## CP14 vs CP2000: Pipeline Verification

### CP14 (authority) — Pipeline Status

| Stage | Module | Route Wired? | Status |
|-------|--------|-------------|--------|
| Upload | route file | ✅ `handleFileUpload()` | CONNECTED |
| Security | `security.ts` | ✅ `validateFilename/Size/MimeType/Content/TextInput` | CONNECTED |
| Classification | `notice-type.ts` | ✅ `classifyNoticeType()` | CONNECTED |
| Extraction | `cp14.ts` | ✅ `extractCP14()` | CONNECTED |
| Facts + Provenance | `fact.ts` | ✅ `extraction.facts` | CONNECTED |
| Deadline | `cp14.ts` | ✅ `extraction.responseDeadline` | CONNECTED |
| Contradiction | `contradiction.ts` | ✅ `detectContradictions()` | CONNECTED |
| Missing Info | `missing-info.ts` | ✅ `detectMissingInfo()` | CONNECTED |
| Findings | `cp14-findings.ts` | ✅ via discrepancy analysis | CONNECTED |
| Discrepancy | `cp14-discrepancy.ts` | ✅ `analyzeCP14Discrepancies()` | CONNECTED |
| Evidence | `cp14-evidence.ts` | ✅ `buildCP14EvidenceChecklist()` | CONNECTED |
| Research | `cp14-research.ts` | ✅ `getCP14ResearchPack()` | CONNECTED |
| Strategy | `cp14-strategy.ts` | ✅ `generateCP14Strategy()` | CONNECTED |
| Draft | `cp14.ts` | ✅ `generateCP14Draft()` | CONNECTED |
| Draft Provenance | `draft-provenance.ts` | ✅ `buildDraftProvenance()` | CONNECTED |
| Two-Pass Validation | `cp14-validation.ts` | ✅ `validateCP14Draft()` | CONNECTED |
| BLOCK Enforcement | route file | ✅ `cp14Validation.blocks` prevents advance | CONNECTED |
| Review | route file | ✅ `ReviewChecks` component | CONNECTED |
| Approval | route file | ✅ `canAdvance()` gate | CONNECTED |
| Mailing | `mailing-funnel.tsx` | ✅ `MailingFunnel` component | CONNECTED |
| Proof/Tracking | `mailing-funnel.tsx` | ✅ `MailingFunnelState` | CONNECTED |

**All 21 stages: CONNECTED.** CP14 is a genuine authority workflow.

### CP2000 (functional) — Pipeline Status

| Stage | Module | Route Wired? | Status |
|-------|--------|-------------|--------|
| Upload | route file | ✅ | CONNECTED |
| Security | `security.ts` | ✅ | CONNECTED |
| Classification | `notice-type.ts` | ✅ | CONNECTED |
| Extraction | `cp2000.ts` | ✅ | CONNECTED |
| Facts + Provenance | `fact.ts` | ✅ | CONNECTED |
| Deadline | `cp2000.ts` | ✅ | CONNECTED |
| Contradiction | `contradiction.ts` | ✅ | CONNECTED |
| Missing Info | `missing-info.ts` | ✅ | CONNECTED |
| Findings | `cp2000-findings.ts` | ✅ | CONNECTED |
| Discrepancy | `cp2000-discrepancy.ts` | ✅ | CONNECTED |
| Evidence | `cp2000-evidence.ts` | ✅ | CONNECTED |
| Research | `cp2000-research.ts` | ✅ | CONNECTED |
| Strategy | `cp2000-strategy.ts` | ✅ | CONNECTED |
| Draft | `cp2000.ts` | ✅ | CONNECTED |
| Draft Provenance | `draft-provenance.ts` | ✅ | CONNECTED |
| Two-Pass Validation | `cp2000-validation.ts` | ✅ | CONNECTED |
| BLOCK Enforcement | route file | ✅ | CONNECTED |
| Review | route file | ✅ | CONNECTED |
| Approval | route file | ✅ | CONNECTED |
| Mailing | `mailing-funnel.tsx` | ✅ | CONNECTED |
| Proof/Tracking | `mailing-funnel.tsx` | ✅ | CONNECTED |

**All 21 stages: CONNECTED.** CP2000 is functionally a gold-standard workflow but is labeled "functional" rather than "authority" in the registry. The registry label should be upgraded to "authority" based on the runtime audit.

---

## Credit Dispute Implementation Comparison

### Notice Respond Implementation (superior)

| Capability | Module | Lines | Wired? |
|-----------|--------|-------|--------|
| Bureau-specific extraction | `credit-dispute.ts` | 299 | ✅ |
| TransUnion-specific extraction | `transunion-dispute.ts` | 270 | ✅ |
| Security (file validation) | `security.ts` (shared) | — | ✅ |
| Draft generation | `credit-dispute.ts` | — | ✅ |
| Generic validation | `draft-validator.ts` (shared) | — | ✅ |
| Mailing funnel | `mailing-funnel.tsx` (shared) | — | ✅ |
| Route (TransUnion) | `transunion-dispute.tsx` | 525 | ✅ |
| Route (Experian) | `experian-dispute.tsx` | 195 | ✅ |
| Route (Equifax) | `equifax-dispute.tsx` | 195 | ✅ |
| Domain intelligence (discrepancy, evidence, research, strategy, two-pass validation) | — | — | ❌ NOT IMPLEMENTED |

### Dispute Mail Implementation (basic)

| Capability | Module | Lines | Wired? |
|-----------|--------|-------|--------|
| Workflow definitions | `workflows.ts` | 42 | ✅ |
| Credit report route | `credit-report.tsx` | 137 | ✅ (basic) |
| Debt validation route | `debt-validation.tsx` | 113 | ✅ (basic) |
| Billing error route | `billing-error.tsx` | 115 | ✅ (basic) |
| Unauthorized charge route | `unauthorized-charge.tsx` | 116 | ✅ (basic) |
| Security | — | — | ❌ |
| Extraction | — | — | ❌ |
| Validation | — | — | ❌ |
| Domain intelligence | — | — | ❌ |
| Mailing | — | — | ❌ (uses basic checkout) |

### Verdict

- Notice-respond has the superior credit dispute implementation (extraction, security, validation, mailing)
- Dispute-mail has only basic UI shells
- Neither has the full gold-standard intelligence layer (discrepancy, evidence, research, strategy, two-pass validation)
- The notice-respond implementation should be promoted to dispute-mail, NOT discarded
- Shared infrastructure should be extracted to mailmypdf-platform

### Migration Plan

1. **Phase A (current):** Registry metadata corrected. Code remains in notice-respond.
2. **Phase B (next):** Extract shared infrastructure (security, workflow-shell, mailing-funnel, draft-provenance) to mailmypdf-platform as npm package or git submodule.
3. **Phase C:** Copy credit dispute domain logic (credit-dispute.ts, transunion-dispute.ts) to dispute-mail.
4. **Phase D:** Copy route files to dispute-mail, update imports to use platform packages.
5. **Phase E:** Add gold-standard intelligence layer (discrepancy, evidence, research, strategy, two-pass validation) to credit disputes in dispute-mail.
6. **Phase F:** Remove credit dispute code from notice-respond after dispute-mail is verified.
7. **Phase G:** Run full tests in both repos.
