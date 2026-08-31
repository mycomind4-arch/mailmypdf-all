# Factory Runtime Implementation Plan

**Date:** 2026-08-18
**Repository:** mycomind4-arch/notice-respond
**Commit:** 5f0960ec (clean)
**Tests:** 643 passing
**Build:** Passing

---

## 1. Current Architecture (Verified)

### 1.1 Repository State

All code lives in `notice-respond`. No separate repos exist. Canonical domains are metadata-only.

**Module inventory (verified line counts):**

| Module | Lines | Role |
|--------|-------|------|
| `workflow-factory.ts` | 175 | Metadata validation only — no execution |
| `workflow-runtime.ts` | 320 | UI state machine — step navigation |
| `domain-packs.ts` | 159 | Declarative strings only — zero functions |
| `workflow-definition.ts` | 353 | Engine registry as string pipelines |
| `workflow-master-registry.ts` | 1202 | 49 entries: 38 blueprint, 9 functional, 1 authority |
| `canonical-domains.ts` | 400 | 12 canonical domains with ownership validation |

**CP14 modules (11 files, 2,177 lines):** cp14.ts, cp14-case.ts, cp14-discrepancy.ts, cp14-evidence.ts, cp14-research.ts, cp14-strategy.ts, cp14-validation.ts, cp14-findings.ts, cp14-packs.ts, cp14-authority-gate.ts, cp14-gates.ts

**CP2000 modules (9 files, 2,122 lines):** cp2000.ts, cp2000-case.ts, cp2000-discrepancy.ts, cp2000-evidence.ts, cp2000-research.ts, cp2000-strategy.ts, cp2000-validation.ts, cp2000-findings.ts, cp2000-packs.ts

**CP504 modules (1 file, 254 lines):** cp504.ts only — extraction + draft generation. No case, discrepancy, evidence, research, strategy, validation, packs, authority gate, or gates.

### 1.2 Confirmed Gaps

1. **No `runWorkflowPipeline()`** — no function executes the full pipeline
2. **No `WorkflowContext`** — no accumulated state across stages
3. **No `ExecutableDomainPack`** — packs are strings, not functions
4. **No engine dispatch** — engines are strings in metadata
5. **No central pack registry** — uses side-effect imports (`import "@/domain/cp2000-packs"`)
6. **No runtime factory validation** — only validates metadata completeness
7. **No explicit stage capability/status** — no NOT_SUPPORTED vs SKIPPED distinction
8. **No blocking validation gates in factory** — only in route code

### 1.3 Confirmed Structural Duplication

CP14Case and CP2000Case are structurally identical:
- Same 13 case phases (identical union members)
- Same 3 case maturity values
- Same 13-field case structure
- Same 5-field ValidationFinding
- Same 8-field ValidationResult
- Same 11-field Discrepancy
- Same EvidenceChecklistItem/EvidenceChecklistResult

What differs (genuinely domain-specific):
- Extraction fields (CP14: balanceDue/penaltyAmount/installmentOption; CP2000: proposedTaxIncrease/reportedIncome/payerName)
- Discrepancy types (CP14: balance_mismatch/missing_payment; CP2000: amount_mismatch/wrong_payer/duplicate_income)
- Strategy positions (CP14: pay_full/request_installment; CP2000: agree_all/disagree_some)
- Evidence items, research sources, draft templates, validation checks

---

## 2. Reuse Map

### Platform (shared, reusable):
- `security.ts` — classifyContent, validateTextInput, validateFilename, validateFileSize
- `contradiction.ts` — detectContradictions, contradictionSummary
- `missing-info.ts` — detectMissingInfo, missingInfoSummary
- `draft-validator.ts` — validateDraft (generic fallback)
- `draft-provenance.ts` — buildDraftProvenance
- `fact.ts` — NoticeFact, createFact, factSummary
- `finding.ts` — Finding, createFinding, findingSummary
- `source-provenance.ts` — AuthoritativeSource, SourceCitation, ResearchPack
- `strategy.ts` — generic Strategy, recommendStrategies
- `deadline.ts` — Deadline types and helpers
- `notice.ts`, `notice-type.ts`, `response.ts` — shared notice/response types

### Domain pack (per-workflow):
- Extraction function (extractCP14, extractCP2000, extractCP504)
- Discrepancy analysis (analyzeCP14Discrepancies, analyzeCP2000Discrepancies)
- Evidence checklist (buildCP14EvidenceChecklist, buildCP2000EvidenceChecklist)
- Research pack (getCP14ResearchPack, getCP2000ResearchPack)
- Strategy generation (generateCP14Strategy, generateCP2000Strategy)
- Draft generation (generateCP14Draft, generateCP2000Draft, generateCP504Draft)
- Validation (validateCP14Draft, validateCP2000Draft)
- Case model (CP14Case, CP2000Case — structurally identical)

### Engine behavior:
- Pipeline stage ordering (document-action: document → classify → extract → understand → deadline → requirements → action)
- Required vs optional stages
- Stage failure handling

---

## 3. Proposed Runtime

### 3.1 Core Types

```typescript
// Stage execution status
type StageStatus = "passed" | "failed" | "blocked" | "not_supported" | "skipped";

// Single stage result
interface StageResult {
  stage: string;
  status: StageStatus;
  durationMs: number;
  error?: string;
  detail?: string;
}

// Accumulated workflow state
interface WorkflowContext {
  workflowId: string;
  engine: WorkflowEngine;
  input: { rawText: string; fileName?: string; userFacts?: string; userObjective?: string; };
  security?: ContentClassification;
  extraction?: BaseExtraction;
  facts?: NoticeFact[];
  deadline?: { raw: string | null; parsed: string | null; certainty: string; source: string; };
  discrepancies?: unknown[];
  findings?: Finding[];
  evidence?: unknown[];
  research?: ResearchPack;
  strategy?: unknown;
  draft?: string;
  draftProvenance?: DraftProvenance;
  factualValidation?: ValidationResult;
  requirementValidation?: ValidationResult;
  blocked: boolean;
  blockReasons: string[];
  stageResults: StageResult[];
  auditEvents: { stage: string; timestamp: string; message: string; }[];
}

// Generic extraction base
interface BaseExtraction {
  noticeNumber: string | null;
  noticeDate: string | null;
  responseDeadline: string | null;
  facts: NoticeFact[];
  warnings: string[];
  classificationConfidence: number;
}

// Generic validation result (matches CP14/CP2000 structure)
interface ValidationFinding {
  check: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info";
  validator: "factual" | "requirement";
}
interface ValidationResult {
  factualFindings: ValidationFinding[];
  requirementFindings: ValidationFinding[];
  allFindings: ValidationFinding[];
  passed: boolean;
  errors: number;
  warnings: number;
  blocks: number;
  blocked: boolean;
}

// Pipeline output
interface WorkflowPipelineResult {
  context: WorkflowContext;
  stages: StageResult[];
  ready: boolean;
  errors: string[];
  warnings: string[];
}
```

### 3.2 Executable Domain Pack

```typescript
interface ExecutableDomainPack {
  workflowId: string;
  engine: WorkflowEngine;
  // Declarative config (backward compatible)
  config: DomainPackSet;
  // Capability flags
  capabilities: {
    security: true;       // always required
    extraction: true;     // always required
    classification: true; // always required
    deadline: boolean;
    discrepancy: boolean;
    evidence: boolean;
    research: boolean;
    strategy: boolean;
    draft: true;          // always required
    factualValidation: boolean;
    requirementValidation: boolean;
  };
  // Executable functions
  extract: (text: string) => BaseExtraction;
  analyzeDiscrepancies?: (ctx: WorkflowContext) => { discrepancies: unknown[]; findings: Finding[]; };
  buildEvidenceChecklist?: (ctx: WorkflowContext) => unknown[];
  getResearchPack?: () => ResearchPack;
  generateStrategy?: (ctx: WorkflowContext) => unknown;
  generateDraft?: (ctx: WorkflowContext) => string;
  validateFactual?: (ctx: WorkflowContext) => ValidationResult;
  validateRequirements?: (ctx: WorkflowContext) => ValidationResult;
}
```

### 3.3 Pipeline Stages (document-action engine)

```
1. security          — classifyContent (always)
2. classification    — classifyNoticeType (always)
3. extraction        — pack.extract() (always)
4. facts             — from extraction.facts (always)
5. deadline          — from extraction (if capabilities.deadline)
6. discrepancy       — pack.analyzeDiscrepancies() (if capabilities.discrepancy)
7. evidence          — pack.buildEvidenceChecklist() (if capabilities.evidence)
8. research          — pack.getResearchPack() (if capabilities.research)
9. strategy          — pack.generateStrategy() (if capabilities.strategy)
10. draft            — pack.generateDraft() (always)
11. draftProvenance  — buildDraftProvenance() (always)
12. factualValidation— pack.validateFactual() (if capabilities.factualValidation)
13. requirementValidation — pack.validateRequirements() (if capabilities.requirementValidation)
14. blocking         — check validation results (always)
```

---

## 4. Migration Strategy

### Compatibility approach: Type aliases, not replacements

- Keep `CP14Case`, `CP2000Case` as-is — routes continue using them
- Add `WorkflowCase` as the generic type in runtime/
- CP14/CP2000 case types remain their own types (not aliases) — they have domain-specific fields (extraction type)
- The pipeline works with `BaseExtraction` and generic structures
- Domain packs bridge between their specific types and the generic ones

### Route migration: Deferred

- Do NOT touch CP14/CP2000 routes until parity is proven
- The factory pipeline runs alongside the existing route code
- Parity tests compare factory output to expected behavior from existing tests
- Route migration happens in a later phase after parity

### CP504: Factory-first implementation

- Create the missing domain modules (discrepancy, evidence, research, strategy, validation, case)
- Register as an executable pack
- Run through the factory pipeline
- Prove the factory reduces bespoke code (CP504 should be smaller than CP14/CP2000)

---

## 5. Testing Strategy

### Per-milestone:
```
targeted tests → full 643+ suite → build → diff/security check → commit → push
```

### New test files:
1. `tests/runtime-contracts.test.mjs` — WorkflowContext, StageResult, ExecutableDomainPack types
2. `tests/pack-registry.test.mjs` — register, resolve, reject duplicates, reject invalid
3. `tests/pipeline-executor.test.mjs` — runWorkflowPipeline with synthetic packs
4. `tests/factory-cp2000-parity.test.mjs` — factory pipeline vs existing CP2000 behavior
5. `tests/factory-cp14-parity.test.mjs` — factory pipeline vs existing CP14 behavior
6. `tests/cp504-gold.test.mjs` — CP504 gold-standard tests (new domain modules)
7. `tests/factory-cp504.test.mjs` — CP504 through factory pipeline
8. `tests/factory-scale.test.mjs` — scale test across registry

### Parity test approach:
- Use existing CP2000 fixtures (FIXTURE_VALID_SIMPLE, etc.)
- Run through factory pipeline
- Compare extraction, discrepancies, evidence, strategy, draft, validation to expected values from existing tests
- Must match exactly — no silent loss of capability

---

## 6. Risks

| Risk | Level | Mitigation |
|------|-------|-----------|
| Breaking 643 tests | HIGH | Don't modify existing files. Add new files alongside. |
| Type safety erosion | MEDIUM | Use generics. Domain packs own concrete extraction types. |
| Route rewrites | MEDIUM | Don't touch routes until parity proven. |
| Engine over-abstraction | MEDIUM | Start with document-action only. Add others later. |
| Pack registration order | LOW | Central registry with explicit registration. |

---

## 7. Milestones

1. **FACTORY_RUNTIME_IMPLEMENTATION_PLAN.md** ← this document
2. **Runtime contracts + executable packs** — types + ExecutableDomainPack interface
3. **Central pack registry + engine dispatch** — registry + document-action policy
4. **`runWorkflowPipeline()`** — pipeline executor
5. **CP2000 parity** — factory pipeline matches existing behavior
6. **CP14 parity** — factory pipeline matches existing behavior
7. **CP504 factory-first** — build missing modules + run through factory
8. **Factory scale/validation tests** — diagnostic report across 49 workflows
9. **Route migration plan** — FACTORY_ROUTE_MIGRATION_PLAN.md
10. **Final verification/deployment** — tests, build, commit, deploy, smoke test
