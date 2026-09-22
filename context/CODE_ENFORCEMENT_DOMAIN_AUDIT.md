# Code-Enforcement Domain Layer Audit

**Status**: Recovery outstanding (flagged in FACTORY_STATUS)  
**Audit Date**: 2026-09-21  
**Old System Size**: 36 domain files, 11,177 lines (11 test files, 25 production files)

---

## Key Domain Modules to Migrate

### CRITICAL (High Value, No Replacement Found)

#### 1. **jurisdiction.ts** (151 lines)
**Purpose**: Determine state/county/municipality/agency with confidence scoring

**Exports**:
- `Jurisdiction` interface (state, county, municipality, agency, department, program, level, isIncorporated, resolved, confidence, reason)
- `JurisdictionLevel` type (state | county | municipality | special_district | unknown)
- `identifyJurisdiction(input)` — California-specific county detection + incorporated-city matching
- `canMakeJurisdictionalConclusions(jurisdiction)` — Confidence gate (≥0.7)

**Key Design**:
- Hard-coded California county list (58 counties)
- Incorporated cities set for Humboldt County
- Specific handling for unincorporated communities (e.g., McKinleyville)
- Confidence scoring (0.2–0.85) with detailed reasoning

**Migration Target**: `packages/identity-capacity/src/jurisdiction-resolution.ts` (has partial jurisdiction logic already; should extend or replace)

**Action Required**: 
- [ ] Compare against existing `packages/identity-capacity/dist/jurisdiction-resolution.d.ts`
- [ ] Extend or build complete California jurisdiction resolver
- [ ] Port unit tests

---

#### 2. **correction-strategy.ts** (339 lines)
**Purpose**: Generate evidence-based response strategies for code enforcement notices

**Exports**:
- `CorrectionStrategyType` (14 types: CORRECT_RECIPIENT, CORRECT_PROPERTY, CORRECT_OWNER, CORRECT_CASE_INFORMATION, CORRECT_COMPLAINT_REFERENCE, CORRECT_DEADLINE, CLARIFY_SCOPE, CLARIFY_AUTHORITY, CLARIFY_PURPOSE, REQUEST_RECORDS, REQUEST_AMENDED_NOTICE, REQUEST_SUPPLEMENTAL_INFORMATION, REQUEST_FORMAL_CONFIRMATION, REQUEST_PROFESSIONAL_REVIEW)
- `CorrectionStrategy` interface (title, whatItDoes, whySuggested, supportingEvidence[], supportingSource, unknowns[], potentialConsequences, humanReviewFlag, legallyConsequential, relatedIssues)
- `CorrectionStrategyReport` (strategies[], findings[], minimalEffectiveApplied boolean, summary)
- Strategy definition functions (partial in file — rest in continuation)

**Key Design**:
- Minimal-effective-correction principle: prefer narrowest fix for identified issue
- All strategies are legally reviewable (humanReviewFlag, legallyConsequential markers)
- Evidence traceability (supportingEvidence[], source)
- Related-issue tracking for cross-strategy understanding

**Migration Target**: New `code-enforcement/src/domain/strategies/` folder (workflow-local, not shared)

**Action Required**:
- [ ] Copy full `correction-strategy.ts` + continuation (see correction-issue-engine.ts dependency)
- [ ] Port all unit tests (correction-workflow.test.ts references this heavily)
- [ ] Wire into workflow schema for workflow-specific strategy selection

---

#### 3. **evidence-graph.ts** (190 lines)
**Purpose**: Build traceability graph from complaint → notice → allegation → code section → property → evidence → timeline → finding → strategy → draft

**Exports**:
- `EvidenceNodeType` (complaint | notice | inspection_request | allegation | code_section | property | evidence_item | timeline_event | finding | strategy | draft)
- `EvidenceNode` interface (id, type, label, description, factCategory, source, confidence, metadata)
- `EvidenceEdge` interface (from, to, relationship, description)
- `EvidenceGraph` interface (nodes[], edges[], summary)
- Helper functions: `createNode()`, `createEdge()`, `buildEvidenceGraph()`, `traceEvidence()`

**Key Design**:
- Every finding is traceable to source evidence
- Nodes carry fact-category metadata (VERIFIED_FACT | USER_ASSERTION | RECOMMENDATION)
- Edges express semantic relationships (triggers, contains, alleges, cites, etc.)
- `traceEvidence()` lookup for interactive UI drill-down

**Migration Target**: `packages/workflows/src/provenance/` or new `packages/evidence-graph/` (shared, reusable across verticals)

**Action Required**:
- [ ] Abstract from code-enforcement specifics (complaint → notice is domain-agnostic)
- [ ] Port and generalize for Appeals, Records, Immigration verticals
- [ ] Add unit tests for graph construction and traversal

---

### HIGH VALUE (Logic, No Direct Replacement)

#### 4. **correction-issue-engine.ts** (289 lines)
**Purpose**: Identify and classify correction issues from notice analysis

**Key Concepts**:
- `CorrectionIssue` with category (RECIPIENT, PROPERTY, OWNER, CASE_INFORMATION, COMPLAINT_REFERENCE, DEADLINE, SCOPE, AUTHORITY, PURPOSE)
- Issue confidence scoring
- Evidence binding

**Migration Target**: `code-enforcement/src/domain/issues/`

**Action Required**:
- [ ] Port production code + 1487-line test suite
- [ ] Verify against new workflow schemas

---

#### 5. **notice-extraction.ts** (371 lines)
**Purpose**: Extract structured data from raw code enforcement notices

**Key Capabilities**:
- Recipient/property/agency extraction
- Deadline/allegation parsing
- Code section identification
- Notice type classification

**Migration Target**: `code-enforcement/src/domain/ingest/`

**Action Required**:
- [ ] Port production code
- [ ] Integrate with new workflow document-intake routes
- [ ] Re-test against sample notices

---

#### 6. **reconciliation.ts** (562 lines — largest logic file)
**Purpose**: Cross-check extracted facts, resolve contradictions, identify gaps

**Key Concepts**:
- Fact reconciliation (comparing extracted vs. user-supplied data)
- Contradiction detection and severity
- Gap identification (missing deadlines, unclear jurisdiction, etc.)

**Migration Target**: `code-enforcement/src/domain/validation/`

**Action Required**:
- [ ] Port production code + tests
- [ ] Wire into draft-validation / approval gate

---

#### 7. **draft-engine.ts** (214 lines)
**Purpose**: Generate response letter drafts based on strategy

**Key Design**:
- Template-driven generation
- Strategy-specific prompt composition
- Evidence embedding in draft

**Migration Target**: `code-enforcement/src/domain/generation/`

**Action Required**:
- [ ] Port and test
- [ ] Wire into workflow draft/start routes

---

#### 8. **gold-certification.ts** (274 lines)
**Purpose**: Gate for draft readiness, completeness, legal risk assessment

**Key Concepts**:
- Readiness checks (all key facts present, contradictions resolved, strategy justified)
- Risk flags (unsigned letters, unclear jurisdiction, unprovable claims)
- Approval gate before mailing/payment

**Migration Target**: `packages/workflows/src/approval-gates/` (shared) or `code-enforcement/src/domain/certification/` (specific)

**Action Required**:
- [ ] Decide shared vs. workflow-specific (other verticals need approval gates too)
- [ ] Port + tests
- [ ] Wire into workflow approval route

---

### SUPPORTING (Utility, Context-Dependent)

#### 9–36. Supporting Files
Remaining 27 files:
- **ai-provider.ts** (352L) / **ai-provider-routing.test.ts** (111L) — AI model selection, prompt routing
- **correction-workflow.ts** (312L) / **correction-workflow.test.ts** (1487L) — Workflow orchestration (large test suite)
- **correction-gold-stage.test.ts** (1603L) — Gold standard gate tests
- **discrepancy-engine.ts** (275L) — Finding gaps in facts/evidence
- **document-classification.ts** (257L) — Categorize/parse notice type
- **draft-critique.ts** (255L) — AI-powered draft quality feedback
- **fact-taxonomy.ts** (186L) — Fact classification system
- **human-review.ts** (242L) — Manual review triggers
- **strategy-engine.ts** (213L) — Strategy selection logic (smaller than correction-strategy)
- **property-intelligence.ts** (207L) — Property detail enrichment
- **authority-analysis.ts** (222L) — Agency authority research
- **law-enforcement-event.ts** (211L) — Law enforcement incident reference
- **scope-analysis.ts** (183L) — Code violation scope
- **timeline.ts** (276L) — Deadline/response timeline
- **secure-ingest.ts** (281L) — Document upload/validation
- **workflow.ts** (211L) — Workflow state/lifecycle
- **complaint-provenance.ts** (137L) — Evidence source tracking
- **test-helpers.ts** (76L) — Test utilities
- Others: jurisdiction-research, correction-seo, fulfillment, seo

**Migration Strategy**: Port selectively based on new workflow needs. Many are orchestration/AI-specific and may be replaced by workflow runtime.

---

## Test Coverage (3,986 lines in 11 test files)

| Test File | Lines | Coverage |
|---|---|---|
| correction-gold-stage.test.ts | 1603 | Gold standard gate logic |
| correction-workflow.test.ts | 1487 | End-to-end workflow scenarios |
| gold-standard.test.ts | 895 | Draft readiness |
| ai-provider-routing.test.ts | 111 | AI model selection |
| (6 others) | ~(no output on wc) | Various domain logic |

**Action**: Port all tests as fixtures for new workflow acceptance tests.

---

## Migration Decision Matrix

| Module | Size | Tests | Value | Shared? | Target | Priority |
|---|---|---|---|---|---|---|
| jurisdiction.ts | 151L | ❌ | ⭐⭐⭐ | ✅ | packages/identity-capacity | P0 |
| correction-strategy.ts | 339L | ✅ | ⭐⭐⭐ | ❌ | code-enforcement/domain | P0 |
| evidence-graph.ts | 190L | ❌ | ⭐⭐⭐ | ✅ | packages/evidence-graph (new) | P0 |
| correction-issue-engine.ts | 289L | ✅ | ⭐⭐ | ❌ | code-enforcement/domain | P1 |
| notice-extraction.ts | 371L | ❌ | ⭐⭐ | ❌ | code-enforcement/domain | P1 |
| reconciliation.ts | 562L | ✅ | ⭐⭐ | ❌ | code-enforcement/domain | P1 |
| draft-engine.ts | 214L | ✅ | ⭐⭐ | ❌ | code-enforcement/domain | P1 |
| gold-certification.ts | 274L | ✅ | ⭐⭐ | ✅/❌ | packages/workflows (decide) | P1 |
| Others | ~3500L | ✅ | ⭐ | ❌ | code-enforcement/domain (sample) | P2 |

---

## Next Actions

1. **Immediate** (enables workflow execution):
   - [ ] Extract and extend jurisdiction resolver → packages/identity-capacity
   - [ ] Port correction-strategy + tests → code-enforcement/domain/strategies
   - [ ] Port evidence-graph + generalize → packages/evidence-graph

2. **Short-term** (enables approval/mailing):
   - [ ] Port correction-issue-engine, reconciliation, draft-engine
   - [ ] Wire gold-certification into workflow approval gate
   - [ ] Port all test fixtures as acceptance tests

3. **Longer-term** (optimization):
   - [ ] Audit AI adapters for new runtime compatibility
   - [ ] Consolidate orchestration logic with workflow runtime
   - [ ] Decide final location for gold-certification (shared vs. specific)

---

## Open Questions

1. **Jurisdiction resolution**: Should this be generalized to all US states, or California-focused for code-enforcement MVP?
2. **Gold-certification gate**: Apply to all workflows (shared in packages/) or just code-enforcement?
3. **Evidence-graph UI**: Will workflows have interactive evidence traceability, or is this backend-only?
4. **AI routing**: New workflow runtime has AI/intelligence handling — does old correction-workflow.ts adapt or get replaced?
