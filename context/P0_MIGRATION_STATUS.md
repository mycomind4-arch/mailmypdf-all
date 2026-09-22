# P0 Migration Status — 2026-09-21

## Completed (2 of 3 P0 items)

### ✅ P0 #1: Geographic Jurisdiction Resolver
**Commit**: `f529866e`
**Source**: `/Users/macdizzle/dev/mailmypdf-all/code-enforcement/src/domain/jurisdiction.ts` (151 lines)
**Destination**: `packages/identity-capacity/src/geographic-jurisdiction.ts`

**What**: California state/county/municipality/agency identification with confidence scoring (0.2–0.85) and validation gates.

**Scope**:
- `identifyGeographicJurisdiction(input)` — location/county/agency matching
- `canMakeJurisdictionalConclusions(jurisdiction)` — confidence gate (≥0.7)
- `validateJurisdictionForCodeEnforcement(jurisdiction)` — blockers/warnings
- Hard-coded: 58 CA counties, incorporated cities, unincorporated communities (McKinleyville)

**Verification**: 11 new tests + 72 existing identity-capacity tests pass.
**Export**: From `packages/identity-capacity/src/index.ts`

---

### ✅ P0 #2: Correction-Strategy Engine
**Commit**: `ca2f81cb`
**Source**: `/Users/macdizzle/dev/mailmypdf-all/code-enforcement/src/domain/correction-strategy.ts` (340 lines)
**Destination**: `code-enforcement/src/domain/strategies/` (split into types/engine/index)

**What**: 14 evidence-based response strategies for code enforcement violations, following minimal-effective-correction principle (prefer narrowest fix).

**Scope**:
- Strategy types (14): CORRECT_RECIPIENT, CORRECT_PROPERTY, CORRECT_OWNER, CORRECT_CASE_INFORMATION, CORRECT_COMPLAINT_REFERENCE, CORRECT_DEADLINE, CLARIFY_SCOPE, CLARIFY_AUTHORITY, CLARIFY_PURPOSE, REQUEST_RECORDS, REQUEST_AMENDED_NOTICE, REQUEST_SUPPLEMENTAL_INFORMATION, REQUEST_FORMAL_CONFIRMATION, REQUEST_PROFESSIONAL_REVIEW
- `generateCorrectionStrategies(issues)` — maps issues → strategies with evidence
- `detectContradictions(issues)` — finds conflicting expected values
- Validation: `isLegallyConsequentialStrategy()`, `requiresHumanReview()`, `mapIssuesToStrategies()`
- Each strategy includes: whatItDoes, whySuggested, supportingEvidence, unknowns, potentialConsequences, humanReviewFlag, legallyConsequential

**Verification**: 15 tests pass (strategy generation, contradiction detection, validation gates, issue mapping, all mapped categories).

---

## Pending (1 of 3 P0 items)

### ⏳ P0 #3: Evidence Graph (Traceability Layer)
**Source**: `/Users/macdizzle/dev/mailmypdf-all/code-enforcement/src/domain/evidence-graph.ts` (190 lines)
**Destination**: `packages/evidence-graph/` (new shared package)

**What**: Traceability graph from complaint → notice → allegation → code section → property → evidence → timeline → finding → strategy → draft. Every finding is traceable to source evidence.

**Scope**:
- Node types: complaint, notice, inspection_request, allegation, code_section, property, evidence_item, timeline_event, finding, strategy, draft
- `EvidenceNode` — carries fact-category metadata (VERIFIED_FACT | USER_ASSERTION | RECOMMENDATION), source, confidence
- `EvidenceEdge` — semantic relationships (triggers, contains, alleges, cites, etc.)
- `buildEvidenceGraph()` — construct graph from inputs
- `traceEvidence()` — lookup: follow incoming/outgoing edges
- Generalize from code-enforcement specifics (complaint → notice is domain-agnostic)

**Planned verification**: Unit tests for graph construction, traversal, and evidence traceability.

**Reusable across**: Appeals, Records, Immigration (any vertical that traces findings to source evidence).

---

## Open Questions to Resolve Before P0 #3

1. **Node cardinality**: Should we track both incoming sources and outgoing targets, or just one direction?
2. **Metadata flexibility**: What fact-categories should be standardized vs. domain-specific?
3. **Query API**: Should `traceEvidence()` be extended with filters (confidence threshold, fact-category, date range)?
4. **UI integration**: Will workflows have interactive evidence traceability (drill-down in drafts), or is this backend-only for audit/certification?

---

## Next Steps

### Immediate (before continuing)
1. Decide P0 #3 scope: which question(s) above must be answered now vs. later
2. Implement and test `packages/evidence-graph/` (190 lines + tests)

### Short-term (after P0 complete)
1. Port P1 modules (correction-issue-engine, notice-extraction, reconciliation, draft-engine, gold-certification)
2. Wire strategies into code-enforcement workflow draft/approval routes
3. Wire evidence-graph into workflow acceptance/certification gates

### Medium-term
1. Port remaining high-value modules (AI adapters, orchestration, test fixtures)
2. Consolidate with workflow runtime (some adapters may be obsoleted)
3. Complete code-enforcement domain layer integration

---

## Metrics

| Item | Status | Lines | Tests | Commit |
|---|---|---|---|---|
| Geographic Jurisdiction | ✅ Complete | 151 | 11/72 | f529866e |
| Correction-Strategy Engine | ✅ Complete | 340 | 15/15 | ca2f81cb |
| Evidence Graph | ⏳ Pending | 190 | TBD | — |
| **P0 Total** | **67%** | **681** | **26+ tests** | **2 commits** |
