# Factory Runtime Audit

**Date:** 2026-08-18  
**Repository:** mycomind4-arch/notice-respond  
**Commit:** 5f0960ec  
**Tests:** 643 passing  
**Build:** Passing  

---

## 1. Current Architecture

### 1.1 Layer Overview

```
MAILMYPDF (product)
    └── notice-respond (monorepo — all code lives here)
            ├── src/domain/          ← all domain logic
            ├── src/routes/workflows/ ← React route files (one per workflow)
            ├── src/components/       ← shared UI (workflow-shell, mailing-funnel)
            └── tests/                ← Node.js test runner (.mjs)
```

**Key fact:** Despite 12 canonical domains existing in the registry, ALL code lives in the `notice-respond` repo. No separate repos exist yet. The canonical domain system is metadata-only.

### 1.2 Module Inventory

**Shared platform modules (2,516 lines total):**
| Module | Lines | Exports | Used by CP14 | Used by CP2000 | Used by CP504 |
|--------|-------|---------|:---:|:---:|:---:|
| `security.ts` | 254 | 9 functions | ✅ | ✅ | ✅ |
| `contradiction.ts` | 231 | 5 functions | ✅ | ✅ | ✅ |
| `missing-info.ts` | 214 | 6 functions | ✅ | ✅ | ✅ |
| `draft-validator.ts` | 175 | 1 function | ✅ (fallback) | ✅ (fallback) | ✅ (primary) |
| `draft-provenance.ts` | 223 | 1 function | ✅ | ✅ | ❌ |
| `evidence.ts` | 204 | 5 functions | ❌ (uses CP14-specific) | ❌ (uses CP2000-specific) | ❌ |
| `fact.ts` | 60 | 3 functions | ✅ | ✅ | ✅ |
| `strategy.ts` | 199 | 2 exports | ✅ (generic) | ✅ (generic) | ✅ (generic) |
| `deadline.ts` | 239 | — | ❌ | ❌ | ❌ |
| `notice.ts` | 231 | — | ✅ | ✅ | ✅ |
| `notice-type.ts` | 204 | — | ✅ | ✅ | ✅ |
| `response.ts` | 156 | — | ✅ | ✅ | ✅ |
| `source-provenance.ts` | 126 | — | ✅ | ✅ | ❌ |

**CP14 domain modules (2,177 lines total):**
| Module | Lines | Key Export |
|--------|-------|------------|
| `cp14.ts` | 428 | `extractCP14()`, `generateCP14Draft()` |
| `cp14-discrepancy.ts` | 327 | `analyzeCP14Discrepancies()` |
| `cp14-evidence.ts` | 211 | `buildCP14EvidenceChecklist()` |
| `cp14-research.ts` | 175 | `getCP14ResearchPack()` |
| `cp14-strategy.ts` | 199 | `generateCP14Strategy()` |
| `cp14-validation.ts` | 317 | `validateCP14Draft()` |
| `cp14-case.ts` | 280 | `CP14Case` interface + mutators |
| `cp14-findings.ts` | 34 | Finding type re-exports |
| `cp14-packs.ts` | 206 | Domain pack registration (declarative only) |
| `cp14-authority-gate.ts` | 295 | `runCP14AuthorityGate()` |
| `cp14-gates.ts` | 403 | Individual gate check functions |

**CP2000 domain modules (2,122 lines total):**
| Module | Lines | Key Export |
|--------|-------|------------|
| `cp2000.ts` | 396 | `extractCP2000()`, `generateCP2000Draft()` |
| `cp2000-discrepancy.ts` | 274 | `analyzeCP2000Discrepancies()` |
| `cp2000-evidence.ts` | 224 | `buildCP2000EvidenceChecklist()` |
| `cp2000-research.ts` | 171 | `getCP2000ResearchPack()` |
| `cp2000-strategy.ts` | 160 | `generateCP2000Strategy()` |
| `cp2000-validation.ts` | 349 | `validateCP2000Draft()` |
| `cp2000-case.ts` | 307 | `CP2000Case` interface + mutators |
| `cp2000-findings.ts` | 36 | Finding type re-exports |
| `cp2000-packs.ts` | 205 | Domain pack registration (declarative only) |

**CP504 domain module (254 lines total):**
| Module | Lines | Key Export |
|--------|-------|------------|
| `cp504.ts` | 254 | `extractCP504()`, `generateCP504Draft()` |

**CP504 has NO:** discrepancy, evidence, research, strategy, validation, case, findings, packs, authority gate, or gates modules.

### 1.3 Current Factory

**File:** `src/domain/workflow-factory.ts` (163 lines)

The factory currently:
1. `validateDefinition()` — checks that required fields exist in a `MasterWorkflowDefinition`
2. `resolveEngine()` — looks up the engine string in `ENGINE_REGISTRY`
3. `loadCapabilityPacks()` — merges engine shared capabilities + workflow-specific capabilities into a `CapabilityPack[]` array (strings)
4. `constructWorkflow()` — assembles a `ConstructedWorkflow` containing the definition, the engine string, a `DomainPackSet` (if registered), a `CapabilityPack[]` (string array), warnings/errors, and `ready: boolean`

**What `constructWorkflow()` returns is metadata.** It does NOT return:
- An extraction function
- A discrepancy analysis function
- An evidence function
- A research function
- A strategy function
- A draft function
- A validation function
- A security function
- A mailing component

The factory validates that configuration exists. It does not wire runtime execution.

### 1.4 Current Domain Pack System

**File:** `src/domain/domain-packs.ts` (196 lines)

The `DomainPackSet` interface contains 8 sub-packs, all purely declarative:
- `DocumentPack` — string fields: acceptedTypes, classifierHints, extractionSchema, minConfidence
- `DeadlinePack` — string fields: triggeringEvents, sourcePriority, computationRules
- `EvidencePack` — string fields: evidenceTypes, sufficiencyRules, contradictionRules
- `ResearchPack` — string fields: authoritativeSourceTypes, citationRequirements
- `AnalysisPack` — string fields: capabilities, orderedChecks, riskFactors
- `DraftPack` — string fields: draftType, requiredSections, prohibitedUnsupportedClaims
- `ValidationPack` — string fields: factualChecks, requirementChecks, adversarialChecks
- `SubmissionPack` — string fields: methods, recipientRules, supportsMailing

**Critical gap:** Every field in every sub-pack is either a string, string[], or boolean. There are ZERO executable functions. The domain pack is a configuration document, not an executable contract.

### 1.5 Current Runtime

**File:** `src/domain/workflow-runtime.ts` (208 lines)

The runtime provides:
- `WorkflowState` — a UI-oriented state bag (step, phase, upload, extraction, facts, draft, validation, mailing)
- `createWorkflowState()` — initializes state from a definition's UX steps
- `canAdvance()` — step-level gating (checks userFacts, draftValidation, reviewChecks, recipient)
- `advanceStep()` / `retreatStep()` / `goToStep()` — navigation
- Setters: `setUpload`, `setExtraction`, `setDraft`, `setDraftValidation`, `setReviewChecks`, `setMailing`

**What the runtime does NOT do:**
- Execute the pipeline stages (security → classification → extraction → analysis → etc.)
- Call domain pack functions (there are none to call)
- Dispatch to engine-specific behavior
- Track audit events
- Record stage results or provenance
- Enforce authority-grade gates at the pipeline level

The runtime is a **UI state machine**, not a **pipeline executor**.

### 1.6 How the Pipeline Actually Runs Today

The full pipeline is manually wired in each route file:

**CP14 route (`cp14-response.tsx`, 973 lines):**
```
1. User uploads file
2. Route calls classifyContent() (shared security)
3. Route calls extractCP14() (CP14-specific)
4. Route calls buildGoldStandardPipeline(extraction):
   a. createCP14Case(extraction)         → CP14-specific
   b. analyzeCP14Discrepancies()          → CP14-specific
   c. buildCP14EvidenceChecklist()        → CP14-specific
   d. setCP14CaseAnalysis()               → CP14-specific
   e. getCP14ResearchPack()               → CP14-specific
   f. generateCP14Strategy()              → CP14-specific
   g. setCP14CaseStrategy()               → CP14-specific
5. Route calls generateCP14Draft()         → CP14-specific
6. Route calls validateCP14Draft(case_)    → CP14-specific (two-pass)
7. Route calls buildDraftProvenance()      → shared
8. Route bridges CP14ValidationResult → DraftValidationResult
9. Route calls detectContradictions()       → shared
10. Route calls detectMissingInfo()         → shared
11. Route calls setDraftValidation()        → runtime
12. User reviews, approves, mails
```

**CP2000 route (`cp2000-response.tsx`, 946 lines):**
```
[Identical pattern, every CP14 name replaced with CP2000]
```

**CP504 route (`cp504-response.tsx`, 556 lines):**
```
1. User uploads file
2. Route calls classifyContent() (shared security)
3. Route calls extractCP504() (CP504-specific)
4. [NO pipeline — no case, no discrepancy, no evidence, no research, no strategy]
5. Route calls generateCP504Draft() (CP504-specific)
6. Route calls validateDraft() (shared generic — NOT two-pass)
7. Route calls detectContradictions() (shared)
8. Route calls detectMissingInfo() (shared)
9. Route calls setDraftValidation() (runtime)
10. User reviews, approves, mails
```

CP504 is a **functional** workflow with only ~40% of the pipeline stages that CP14/CP2000 have.

---

## 2. Duplicated CP14/CP2000 Patterns

### 2.1 Structurally Identical Interfaces

| Interface | CP14 | CP2000 | Identical? |
|-----------|------|--------|:---:|
| CasePhase | `CP14CasePhase` | `CasePhase` | ✅ Same 13 union members |
| CaseMaturity | `CP14CaseMaturity` | `CaseMaturity` | ✅ Same 3 values |
| Case (structure) | `CP14Case` | `CP2000Case` | ✅ Same 13 fields |
| ValidationFinding | `CP14ValidationFinding` | `CP2000ValidationFinding` | ✅ Same 5 fields |
| ValidationResult | `CP14ValidationResult` | `CP2000ValidationResult` | ✅ Same 8 fields |
| ResponseStrategy | `CP14ResponseStrategy` | `CP2000ResponseStrategy` | ✅ Same 10 fields |
| StrategyInput | `CP14StrategyInput` | `StrategyInput` | ✅ (CP14 adds installmentOption) |
| Discrepancy | `CP14Discrepancy` | `Discrepancy` | ✅ Same 11 fields |
| DiscrepancyResult | `CP14DiscrepancyResult` | `DiscrepancyResult` | ✅ Same fields |
| EvidenceChecklistItem | `CP14EvidenceChecklistItem` | `EvidenceChecklistItem` | ✅ Same fields |
| EvidenceChecklistResult | `CP14EvidenceChecklistResult` | `EvidenceChecklistResult` | ✅ Same fields |
| Case mutator functions | `setCP14Case*()` | `setCase*()` | ✅ Same signatures |
| Submission state | Same shape | Same shape | ✅ |

### 2.2 What Differs (Genuinely Domain-Specific)

| Capability | CP14 | CP2000 | Same Pattern? |
|-----------|------|--------|:---:|
| Extraction fields | balanceDue, penaltyAmount, interestAmount, paymentDeadline, installmentOption | proposedTaxIncrease, proposedPenalty, reportedIncome, irsReportedIncome, incomeSource, payerName | ❌ Different fields |
| Discrepancy types | balance_mismatch, missing_payment, wrong_tax_year, high_penalty | amount_mismatch, wrong_payer, duplicate_income, wrong_tax_year, missing_documentation | ❌ Different types |
| Strategy positions | pay_full, dispute_balance, request_installment, request_abatement | agree_all, disagree_some, disagree_all, insufficient_info, needs_professional_review | ❌ Different positions |
| Evidence items | CP14 notice, tax return, payment records, account transcript, Form 9465, abatement docs | CP2000 notice, W-2, 1099 variants, K-1, tax return, bank statements | ❌ Different evidence |
| Research sources | irs.gov CP14-specific pubs | irs.gov CP2000-specific pubs | ❌ Different sources |
| Draft generation | CP14 letter structure (balance, installment) | CP2000 letter structure (discrepancy response) | ❌ Different content |
| Validation checks | Checks balance amounts, installment references | Checks income amounts, payer names | ❌ Different checks |
| Strategy input | Adds `installmentOption: boolean` | No installment field | Slightly different |

### 2.3 Duplication Summary

**Duplicated (should be shared):** Case model structure, case phase enum, case maturity enum, validation finding/result, strategy interface, discrepancy structure, evidence checklist structures, case mutator pattern, pipeline wiring pattern (12-step sequence).

**Domain-specific (must remain per-workflow):** Extraction logic, discrepancy types/detection, strategy positions/decision logic, evidence types/rules, research sources, draft template, validation check implementations, pack configuration.

### 2.4 CP504 Gap Analysis

| Stage | CP14 | CP2000 | CP504 |
|-------|:---:|:---:|:---:|
| Extraction | ✅ | ✅ | ✅ |
| Draft generation | ✅ | ✅ | ✅ |
| Discrepancy analysis | ✅ | ✅ | ❌ |
| Evidence checklist | ✅ | ✅ | ❌ |
| Research pack | ✅ | ✅ | ❌ |
| Strategy | ✅ | ✅ | ❌ |
| Two-pass validation | ✅ | ✅ | ❌ (uses generic validateDraft) |
| Case model | ✅ | ✅ | ❌ |
| Domain pack | ✅ | ✅ | ❌ |
| Authority gate | ✅ | ❌ | ❌ |

---

## 3. Missing Abstractions

### 3.1 The Core Gap: No Runtime Pipeline Executor

There is no function that can execute:
```
input → security → classify → extract → analyze → evidence → research → strategy → draft → validate → block → review → approve → mail
```

Each route file manually calls domain-specific functions in sequence. The factory cannot do this because:
1. Domain packs contain strings, not functions
2. There is no `WorkflowPipeline` type
3. There is no `WorkflowContext` type that accumulates results
4. There is no engine dispatch mechanism
5. There is no stage-level capability checking

### 3.2 Missing Types

| Type | Purpose | Currently Exists? |
|------|---------|:---:|
| `WorkflowInput` | Raw input to the pipeline | ❌ |
| `WorkflowContext` | Accumulated state across all stages | ❌ (WorkflowState is UI-only) |
| `StageResult` | Result of a single stage execution | ❌ |
| `WorkflowPipelineResult` | Final output of the entire pipeline | ❌ |
| `WorkflowRuntime` | The runtime that owns pipeline execution | ❌ |
| `WorkflowExecutor` | Function type that executes the pipeline | ❌ |
| `WorkflowGateResult` | Result of a blocking gate check | ❌ (partially in canAdvance) |
| `WorkflowCapability` | Runtime capability descriptor | ❌ (CapabilityPack is a string) |

### 3.3 Missing: Executable Domain Pack

The `DomainPackSet` must evolve from declarative strings to executable contracts. Each sub-pack should optionally provide a function that the pipeline can call.

### 3.4 Missing: Engine Dispatch

`ENGINE_REGISTRY` stores pipeline steps as `string[]` but there is no executor that dispatches to engine-specific stage behavior.

### 3.5 Missing: Central Domain Pack Registry

Current registration uses side-effect imports (`import "@/domain/cp14-packs"`). The pack only registers if some route file imports it.

### 3.6 Missing: Factory Validation Against Runtime

The factory validates definition completeness but cannot validate runtime readiness.

---

## 4. Proposed Runtime Contract

### 4.1 Core Types

```typescript
interface WorkflowInput {
  rawText: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  userFacts?: string;
  userObjective?: string;
}

interface WorkflowContext {
  workflowId: string;
  engine: WorkflowEngine;
  security?: SecurityResult;
  classification?: ClassificationResult;
  extraction?: ExtractionResult;
  facts?: NoticeFact[];
  deadline?: DeadlineResult;
  discrepancy?: DiscrepancyResult;
  evidence?: EvidenceChecklistResult;
  research?: ResearchResult;
  strategy?: StrategyResult;
  draft?: string;
  draftProvenance?: DraftProvenance;
  factualValidation?: ValidationResult;
  requirementValidation?: ValidationResult;
  blocking?: BlockingResult;
  auditEvents: AuditEvent[];
  stageResults: StageResult[];
}

interface StageResult {
  stage: string;
  status: "connected" | "not_supported" | "error" | "skipped";
  durationMs: number;
  error?: string;
}

interface WorkflowPipelineResult {
  context: WorkflowContext;
  stages: StageResult[];
  ready: boolean;
  errors: string[];
  warnings: string[];
}
```

### 4.2 Executable Domain Pack

```typescript
interface ExecutableDomainPack<TExtraction extends BaseExtraction> {
  engine: WorkflowEngine;
  workflowId: string;
  capabilities: {
    security: true;
    extraction: true;
    classification: true;
    deadline: boolean;
    discrepancy: boolean;
    evidence: boolean;
    research: boolean;
    strategy: boolean;
    draft: true;
    factualValidation: boolean;
    requirementValidation: boolean;
    mailing: boolean;
  };
  extract: (text: string) => TExtraction;
  analyzeDiscrepancies?: (ctx: WorkflowContext) => DiscrepancyResult;
  buildEvidenceChecklist?: (ctx: WorkflowContext) => EvidenceChecklistResult;
  getResearchPack?: () => ResearchPack;
  generateStrategy?: (ctx: WorkflowContext) => StrategyResult;
  generateDraft?: (ctx: WorkflowContext) => string;
  validateFactual?: (ctx: WorkflowContext) => ValidationResult;
  validateRequirements?: (ctx: WorkflowContext) => ValidationResult;
  config: DomainPackSet; // retained declarative config
}
```

### 4.3 Pipeline Runner

```typescript
async function runWorkflowPipeline(
  pack: ExecutableDomainPack,
  input: WorkflowInput,
): Promise<WorkflowPipelineResult> {
  // 1. Security (always) — classifyContent, validateFilename, etc.
  // 2. Classification (always) — pack-provided or generic
  // 3. Extraction (always) — pack.extract()
  // 4. Fact construction (always) — from extraction.facts
  // 5. Provenance (always) — from extraction facts
  // 6. Deadline (if pack.capabilities.deadline)
  // 7. Discrepancy (if pack.capabilities.discrepancy)
  // 8. Evidence (if pack.capabilities.evidence)
  // 9. Research (if pack.capabilities.research)
  // 10. Strategy (if pack.capabilities.strategy)
  // 11. Draft (always) — pack.generateDraft()
  // 12. Draft provenance (always)
  // 13. Factual validation (if pack.capabilities.factualValidation)
  // 14. Requirement validation (if pack.capabilities.requirementValidation)
  // 15. Blocking (always — uses validation results)
  // 16-20. Review/Approval/Mailing/Proof (handled by UI, not pipeline)
}
```

---

## 5. CP14 Reusable Components

| Component | Current Location | Reusable? | Target |
|-----------|-----------------|:---:|--------|
| Case model structure (13 fields) | `cp14-case.ts` | ✅ | Platform `WorkflowCase` |
| Case phase enum (13 phases) | `cp14-case.ts` | ✅ | Platform `CasePhase` |
| Case maturity enum | `cp14-case.ts` | ✅ | Platform `CaseMaturity` |
| Validation finding structure | `cp14-case.ts` | ✅ | Platform `ValidationFinding` |
| Validation result structure | `cp14-case.ts` | ✅ | Platform `ValidationResult` |
| Strategy interface (10 fields) | `cp14-strategy.ts` | ✅ | Platform `ResponseStrategy` |
| Strategy input pattern | `cp14-strategy.ts` | ✅ | Platform `StrategyInput` |
| Discrepancy structure (11 fields) | `cp14-discrepancy.ts` | ✅ | Platform `Discrepancy` |
| Evidence checklist item | `cp14-evidence.ts` | ✅ | Platform `EvidenceChecklistItem` |
| Evidence checklist result | `cp14-evidence.ts` | ✅ | Platform `EvidenceChecklistResult` |
| Authority gate pattern (20 checks) | `cp14-authority-gate.ts` | ✅ | Platform `AuthorityGate` |
| Gate check functions (8) | `cp14-gates.ts` | ✅ | Platform gate functions |
| Case mutator pattern | `cp14-case.ts` | ✅ | Platform case mutators |
| Pipeline wiring pattern | `cp14-response.tsx` | ✅ | Platform `runWorkflowPipeline()` |
| Validation bridging pattern | `cp14-response.tsx` | ✅ | Platform validation bridge |

**NOT reusable (domain-specific):** `extractCP14()`, `analyzeCP14Discrepancies()`, `buildCP14EvidenceChecklist()`, `getCP14ResearchPack()`, `generateCP14Strategy()`, `generateCP14Draft()`, `validateCP14Draft()`, `CP14Extraction` interface.

---

## 6. CP2000 Reusable Components

Same structural analysis as CP14 — interfaces are identical, only domain-specific functions differ.

**Additional proof:** CP2000 route is 946 lines, nearly identical to CP14's 973. The pipeline pattern is proven repeatable. CP2000 has E2E tests (`cp2000-e2e.test.mjs`) and hardening tests (`cp2000-hardening.test.mjs`).

---

## 7. CP504 Reusable Components

**Has:** `CP504Extraction` interface, `extractCP504()`, `generateCP504Draft()`, route with upload → security → extraction → draft → generic validation → mailing.

**Missing (what the factory must provide):** Case model, discrepancy analysis, evidence checklist, research pack, strategy, two-pass validation, domain pack, authority gate.

CP504 is the ideal third reference because it starts from a simpler state and must be brought up to gold-standard through the factory, proving the factory works for new workflows.

---

## 8. Migration Strategy

### Phase 1: Runtime Contract (no behavior change)
Create types and pipeline runner without touching existing code.

### Phase 2: Central Pack Registry
Replace side-effect imports with deterministic central registry.

### Phase 3: CP14 Reference Migration
Type aliases for backward compatibility. Optional pipeline usage in route.

### Phase 4: CP2000 Migration
Same as CP14. Upgrade lifecycle to authority after tests prove gates.

### Phase 5: CP504 Gold-Standard Upgrade
Create missing domain modules (discrepancy, evidence, research, strategy, validation, case, packs). Integrate with pipeline.

### Phase 6: Factory Validation
Hard validation gate for runtime readiness.

### Phase 7: Test Harness
Prove actual function execution for all 3 reference workflows + 10+ synthetic workflows.

---

## 9. Risks

| Risk | Level | Mitigation |
|------|-------|-----------|
| Breaking existing 643 tests | HIGH | Type aliases for backward compat. Don't remove existing types. |
| Route file rewrites | MEDIUM | Don't rewrite. Add pipeline as alternative. Migrate one route at a time. |
| Type safety erosion | MEDIUM | Use generics (`ExecutableDomainPack<T extends BaseExtraction>`). Domain packs own concrete types. |
| Engine dispatch complexity | MEDIUM | Start with document-action only. Add other engines later. |
| Pack registration order | LOW | Central registry with explicit registration. |
| Performance | LOW | All current stages are synchronous pure functions. Pipeline is async-ready. |

---

## 10. Exact Files to Create/Change

### New files (14):
1. `src/domain/runtime/types.ts` — Core pipeline types
2. `src/domain/runtime/case.ts` — Generic WorkflowCase
3. `src/domain/runtime/validation.ts` — Generic validation types
4. `src/domain/runtime/strategy.ts` — Generic strategy types
5. `src/domain/runtime/discrepancy.ts` — Generic discrepancy types
6. `src/domain/runtime/evidence.ts` — Generic evidence types
7. `src/domain/runtime/executable-pack.ts` — ExecutableDomainPack + validateDomainPack()
8. `src/domain/runtime/pipeline.ts` — runWorkflowPipeline()
9. `src/domain/runtime/engine-dispatch.ts` — Engine policies
10. `src/domain/runtime/pack-registry.ts` — Central registry
11. `src/domain/runtime/factory-validation.ts` — Runtime readiness gate
12. `src/domain/cp504-discrepancy.ts` — CP504 discrepancy analysis
13. `src/domain/cp504-strategy.ts` — CP504 strategy generation
14. `src/domain/cp504-evidence.ts` — CP504 evidence checklist

### Modified files (15):
1. `src/domain/domain-packs.ts` — Add ExecutableDomainPack support
2. `src/domain/workflow-factory.ts` — Add runtime construction + validation
3-7. `src/domain/cp14-{case,strategy,discrepancy,evidence,validation}.ts` — Type aliases
8. `src/domain/cp14-packs.ts` — Register executable pack
9-12. `src/domain/cp2000-{case,packs}.ts` — Type aliases + register executable pack
13. `src/domain/cp504.ts` — Add case/pack exports
14-15. Routes (cp14, cp2000, cp504) — Optional pipeline integration

### New test files (4):
1. `tests/factory-runtime.test.mjs` — Prove actual function execution
2. `tests/factory-scale.test.mjs` — Prove 10+ synthetic workflows
3. `tests/factory-validation.test.mjs` — Prove factory detects incomplete workflows
4. `tests/cp504-gold.test.mjs` — CP504 gold-standard tests

### Document files (5):
1. `WORKFLOW_FACTORY_GOLD_STANDARD.md` — Updated
2. `FACTORY_RUNTIME_ARCHITECTURE.md` — New
3. `DOMAIN_PACK_CONTRACT.md` — New
4. `WORKFLOW_RUNTIME_CONTRACT.md` — New
5. `FACTORY_MIGRATION_PLAN.md` — New

---

## 11. Summary

| Dimension | Current State | Target State |
|-----------|---------------|--------------|
| Factory | Validates metadata, returns string arrays | Constructs executable workflow, validates runtime readiness |
| Domain Pack | Declarative strings (configuration) | Executable functions + configuration |
| Runtime | UI state machine (step navigation) | Pipeline executor + UI state machine |
| Engine | String in metadata | Executable stage policy dispatch |
| Pipeline | Manually wired in each 500-970 line route | Generic runner with domain pack functions |
| Pack Registration | Side-effect imports | Central registry |
| Factory Validation | Definition completeness | Runtime readiness |
| CP14 | Authority (manual pipeline) | Authority (factory-assisted pipeline) |
| CP2000 | Functional (manual pipeline) | Authority (factory-assisted pipeline) |
| CP504 | Functional (minimal pipeline) | Authority (factory-generated pipeline) |
| Scaling | One route file per workflow | One domain pack + one thin route per workflow |

**The single most important deliverable is `runWorkflowPipeline()`.** Once the pipeline runner works with executable domain packs, the factory transforms from a metadata validator into a real workflow engine.
