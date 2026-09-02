# Workflow Factory V1 Integration Guide

**Status:** Implementation in progress  
**Last Updated:** 2026-09-02

## Overview

MailMyPDF Workflow Factory V1 provides a unified runtime for executing complex multi-stage workflows. Rather than manually wiring domain logic in each route file, workflows now declare their capabilities and stages once, then the factory handles execution.

### The Problem (Before)

Each workflow route file manually sequences 12-20 domain-specific functions:

```tsx
// in route file: manual wiring
const extraction = extractCP2000(text);
const case_ = createCP2000Case(extraction);
const discrepancies = analyzeCP2000Discrepancies({ extraction });
const evidence = buildCP2000EvidenceChecklist({ ...inputs });
const strategy = generateCP2000Strategy({ ...inputs });
const draft = generateCP2000Draft(case_, strategy);
const validation = validateCP2000Draft(draft, case_);
// ... repeat for every workflow
```

This creates:
- **Massive duplication** — CP14 and CP2000 route files are 95% identical
- **No reusability** — each vertical rebuilds the same pipeline pattern
- **Hard to test** — pipeline logic is mixed into React components
- **Impossible to compose** — workflows can't easily combine capabilities

### The Solution (After)

Workflows declare capabilities once:

```typescript
// In packages/workflows/src/domain-packs
export const cp2000Pack: DomainPack = {
  id: "cp2000",
  
  security: async (input) => { /* validation */ },
  classify: async (input) => { /* notice classification */ },
  extract: async (input) => { /* field extraction */ },
  analyze: async (input, prior) => { /* discrepancy analysis */ },
  strategy: async (input, prior) => { /* response strategy */ },
  draft: async (input, prior) => { /* generate response */ },
  validation: async (input, prior) => { /* validate response */ },
  // ... etc
};
```

Then the factory runs the pipeline:

```typescript
// In route file: factory-driven
const result = await runConfiguredPipeline(
  "cp2000-workflow",
  "P02_OFFICIAL_RESPONSE",  // select pipeline profile
  cp2000Pack,              // provide domain intelligence
  input,                   // pass document
);
```

## Architecture

### Layer 1: Pipeline Registry
**File:** `packages/workflows/src/pipeline-registry.ts`

Defines execution shapes (which stages run, in what order):

```typescript
P02_OFFICIAL_RESPONSE: {
  id: "P02_OFFICIAL_RESPONSE",
  name: "Notice / Official Response",
  requiredStages: [
    "security", "classification", "extraction", "provenance",
    "deadline", "findings", "requirements", "evidence",
    "strategy", "draft", "validation", "blockingGate",
    "review", "mailing", "tracking", "proofAudit"
  ],
  optionalStages: ["contradiction", "discrepancy", "research"],
}
```

### Layer 2: Domain Pack Contract
**File:** `packages/workflows/src/domain-pack-contract.ts`

Defines what capabilities a domain pack must declare:

```typescript
type DomainCapability =
  | "classification"
  | "extraction"
  | "discrepancies"
  | "evidence"
  | "strategy"
  | "draft"
  | "validation"
  // ... 18 more
```

### Layer 3: Domain Pack Implementation
**File:** `packages/workflows/src/domain-packs/cp2000-pack.ts`

Each workflow provides a concrete implementation:

```typescript
export const cp2000Pack: DomainPack = {
  id: "cp2000",
  
  classify: async (input: GoldStandardInput) => ({
    stage: "classification",
    status: "passed",
    data: { type: "CP2000", confidence: 0.95 },
    messages: ["Identified as CP2000 notice"],
  }),
  
  extract: async (input: GoldStandardInput) => ({
    stage: "extraction",
    status: "passed",
    data: {
      noticeNumber: "CP2000-2023-12345-A",
      taxYear: "2022",
      proposedIncrease: "$5,000",
      // ... extracted fields
    },
    messages: ["Extracted 12 fields with high confidence"],
  }),
  
  // ... 20 more stage implementations
};
```

### Layer 4: Runtime Executor
**File:** `packages/workflows/src/gold-standard-pipeline.ts` / `configured-pipeline.ts`

The runtime that orchestrates execution:

```typescript
export async function runConfiguredPipeline(
  workflowId: string,
  pipelineId: PipelineId,
  pack: DomainPack,
  input: GoldStandardInput,
  enabledOptionalStages: readonly PipelineStage[] = [],
): Promise<PipelineResult> {
  // 1. Load pipeline definition
  // 2. Execute required stages in order
  // 3. Pass accumulated results to dependent stages
  // 4. Block consequential actions if validation fails
  // 5. Return comprehensive result with all stage outputs
}
```

### Layer 5: Workflow Factory
**File:** `packages/workflows/src/workflow-factory.ts`

Validates that a workflow declaration is complete and consistent:

```typescript
export function composeWorkflow(manifest: WorkflowManifest): WorkflowFactoryResult {
  // Validates:
  // - All required pipeline stages are declared in capabilities
  // - Adapters are compatible with pipeline
  // - Production-verified workflows have no errors
  // Returns: executable boolean + diagnostics
}
```

## Integration Patterns

### Pattern 1: Factory-Driven Route (Recommended)

```typescript
// In app vertical: apps/verticals/notice-respond/src/routes/cp2000-factory.tsx

import { runConfiguredPipeline } from "@mailmypdf/workflows";
import { cp2000Pack } from "@mailmypdf/workflows/domain-packs/cp2000";

export async function handleCP2000(file: File): Promise<WorkflowResult> {
  // Extract text from document
  const text = await extractText(file);

  // Run through factory
  const result = await runConfiguredPipeline(
    "cp2000-workflow",
    "P02_OFFICIAL_RESPONSE",
    cp2000Pack,
    {
      documents: [{ rawText: text, fileName: file.name }],
      context: { userId: currentUser.id, matterId: matter.id },
    },
  );

  // Result contains all stage outputs
  return {
    extraction: result.stages.find(s => s.stage === "extraction")?.data,
    strategy: result.stages.find(s => s.stage === "strategy")?.data,
    draft: result.stages.find(s => s.stage === "draft")?.data,
    validation: result.stages.find(s => s.stage === "validation")?.data,
    blocked: result.status === "blocked",
    blockingReason: result.stages.find(s => s.stage === "blockingGate")?.messages,
  };
}
```

### Pattern 2: Staged Execution (UI-Friendly)

```typescript
// For progressive UI loading, enable one optional stage at a time

const stageProgressions = [
  { stage: "extraction", name: "Analyzing document" },
  { stage: "evidence", name: "Building evidence checklist" },
  { stage: "strategy", name: "Generating strategy" },
  { stage: "draft", name: "Writing response" },
  { stage: "validation", name: "Validating response" },
];

for (const progression of stageProgressions) {
  const result = await runConfiguredPipeline(
    workflowId,
    pipelineId,
    pack,
    input,
    [progression.stage],
  );
  
  onStageComplete?.(progression.stage, result);
  
  if (result.status === "blocked") break;
}
```

### Pattern 3: Conditional Pipeline Selection

```typescript
// Different workflows use different pipelines

const pipelineForNotice = {
  "CP2000": "P02_OFFICIAL_RESPONSE",
  "CP14": "P02_OFFICIAL_RESPONSE",
  "RFE": "P05_IMMIGRATION",
  "Summons": "P04_COURT",
  "Appeal": "P03_APPEAL",
} as Record<string, PipelineId>;

const detectedType = await detectDocumentType(document);
const pipeline = pipelineForNotice[detectedType];
const pack = domainPackForType[detectedType];

const result = await runConfiguredPipeline(
  workflowId,
  pipeline,
  pack,
  input,
);
```

## Current Implementation Status

### ✅ Complete

- **Pipeline Registry** — 10 pipeline profiles defined (P01-P10)
- **Domain Pack Contract** — Type system for declaring capabilities
- **Gold Standard Pipeline** — Full 24-stage runtime executor
- **Configured Pipeline** — Subset execution with optional stages
- **Factory Validation** — Manifest validation and diagnostics
- **Adapter Registry** — 15 domain areas mapped to capabilities

### 🟡 In Progress

- **CP2000 Domain Pack** — Stub implementation created, needs real domain logic wiring
- **CP2000 Integration** — Route-level integration in progress
- **AI Runtime Wiring** — LLM service exists but not connected to factory
- **Persistence Integration** — Factory output needs persistence layer

### ❌ Blocked/Not Started

- **Live Execution** — Build/environment setup needed to run tests
- **Second Workflow** — Portability test (immigration or appeal)
- **Certification System** — Workflow certification tests
- **Observability** — Stage-level logging and tracing
- **Multi-Provider AI** — Fallback routing not integrated

## CP2000 Integration Roadmap

### Phase 1: Factory Wiring (This Session)

- [x] Create CP2000 domain pack structure
- [ ] Wire actual domain logic from notice-respond
- [ ] Create test route in notice-respond that uses factory
- [ ] Prove factory execution produces correct output
- [ ] Document blocking points

### Phase 2: AI Runtime Integration

- [ ] Wire CP2000 extraction to LLM service (Gemini with fallback to Claude)
- [ ] Wire CP2000 strategy generation to LLM with deterministic validation
- [ ] Wire draft generation with LLM
- [ ] Add AI provenance/confidence tracking

### Phase 3: Persistence and State

- [ ] Wire workflow state to Supabase
- [ ] Save/resume checkpoint between stages
- [ ] Track matter/document relationships
- [ ] Record stage outputs for audit

### Phase 4: Second Workflow (Portability Test)

- [ ] Choose second workflow (likely Immigration RFE)
- [ ] Implement domain pack for second workflow
- [ ] Run through factory with same pipeline infrastructure
- [ ] Verify generic factory patterns work across domains
- [ ] Fix any domain-specific gaps

### Phase 5: Production Hardening

- [ ] Add error recovery and retries
- [ ] Implement stage timeouts and cancellation
- [ ] Add comprehensive logging
- [ ] Create certification test suite
- [ ] Document production deployment

## Key Design Decisions

### 1. Synchronous Stage Execution

All stages run sequentially within a single request/response cycle. This keeps state management simple and avoids distributed transaction complexity. For long-running stages (like AI operations), we rely on efficient implementations and caching.

**Alternative considered:** Async job queue (Temporal, Trigger.dev)  
**Decision:** Keep V1 simple; async can be added in V2 if needed

### 2. Accumulated Context Passing

Each stage receives all prior stage results, enabling:
- Strategy to reference extraction + evidence
- Validation to reference extraction + draft + strategy
- Complex logical operations across multiple inputs

**Alternative considered:** Query prior stages on-demand  
**Decision:** Explicit passing makes dependencies clear and testable

### 3. Blocking Gate Before Consequential Actions

The factory enforces:
- All intelligence stages must pass/warn (not fail/block)
- Blocking gate must pass before review/approval/mailing

This prevents sending flawed documents to users or providers.

**Alternative considered:** Let workflows define their own gates  
**Decision:** Centralized gate ensures safety invariant across all workflows

### 4. No Multi-Workflow Composition (V1)

V1 doesn't support "workflow A triggers workflow B". Each workflow is independent.

**Reason:** Simplifies V1 and makes testing easier  
**V2 Plan:** Workflow graph will enable composition and recommendations

## Testing Strategy

### Unit Tests

Each domain pack should have:
- Diagnostic test: verifies all declared capabilities are executable
- Contract test: verifies stage result structure is correct
- Failure test: verifies stage failures propagate correctly

### Integration Tests

- Factory test: can compose workflow manifest without errors
- Pipeline test: can run each pipeline profile through the factory
- Stage test: each stage executes in correct order, passes accumulated state
- Gate test: validation failures block consequential stages

### Golden Tests

For each workflow:
- Sample notice document
- Expected extraction output
- Expected strategy/position
- Expected draft key points
- Verify output matches fixture

### Portability Tests

After CP2000:
- Implement second workflow (immigration)
- Verify factory patterns work without modification
- Fix any hard-coded assumptions
- Document any workflow-specific gaps

### Adversarial Tests

- Malformed documents
- Extraction failures → strategy/draft should handle gracefully
- Missing required evidence → validation should flag clearly
- Draft too long → document composer should truncate/warn
- Approval attempt after fact change → should reject
- Duplicate upload → should deduplicate

## Deployment Considerations

### Environment

- Packages: TypeScript compiled, shared across all apps
- Verticals: Each vertical imports workflows package and implements domain pack
- Runtime: Node.js (for now), Cloudflare Workers compatible (for P02_OFFICIAL_RESPONSE testing)

### Configuration

- `PIPELINE_ID` — which pipeline profile to use (loaded from workflow definition)
- `OPTIONAL_STAGES` — which optional stages to enable (runtime parameter)
- `AI_PROVIDER` — which LLM to use (default: Gemini, fallback: Claude)
- `STAGE_TIMEOUT_MS` — per-stage timeout (default: 30000ms)

### Monitoring

- Log each stage entry/exit with duration
- Track stage failures and fallback activations
- Record workflow abandonment points
- Monitor AI token usage per workflow

## Next Steps

1. **Immediate (this session)**
   - Finish CP2000 domain pack wiring with actual domain logic
   - Create factory-driven route in notice-respond
   - Run end-to-end test with sample CP2000 notice
   - Document any integration blockers

2. **Next session**
   - Fix any build/environment issues blocking test execution
   - Implement AI runtime integration
   - Create persistence/state management
   - Begin second workflow (portability test)

3. **Future**
   - Extract reusable types to platform packages
   - Build observability and monitoring
   - Implement workflow composition graph
   - Create certification system
   - Migrate all verticals to factory-driven pattern
