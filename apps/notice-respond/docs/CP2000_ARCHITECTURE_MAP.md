# CP2000 Architecture Map

## Current Architecture: Two Parallel Systems

### System A: Production Runtime (actually executes when a user visits /workflows/cp2000-response)

```
User uploads document
    ↓
handleFileUpload() / handlePasteText()
    ↓
extractCP2000()          ← src/domain/cp2000.ts (extraction only)
classifyNoticeType()     ← src/domain/notice-type.ts
    ↓
WorkflowState            ← src/domain/workflow-runtime.ts (generic state machine)
  - extraction.facts
  - extraction.deadlines (always [] — never populated)
  - deadline (set from extraction.deadlines[0] → null)
    ↓
detectContradictions()   ← src/domain/contradiction.ts (shared)
detectMissingInfo()      ← src/domain/missing-info.ts (shared)
recommendStrategies()    ← src/domain/strategy.ts (generic by notice type)
    ↓
generateCP2000Draft()    ← src/domain/cp2000.ts (template fill)
    ↓
validateDraft()          ← src/domain/draft-validator.ts (generic)
  - checks required sections
  - checks fact matching
  - checks forbidden behavior
  - NO BLOCK level
  - NO discrepancy check
  - NO evidence check
    ↓
WorkflowState.draftValidation
    ↓
User reviews (checkboxes only — no validation enforcement)
    ↓
MailingFunnel            ← src/components/mailing-funnel.tsx
    ↓
Mailing
```

### System B: CP2000 Intelligence Layer (tested but NOT production-connected)

```
extractCP2000()
    ↓
createCP2000Case()              ← src/domain/cp2000-case.ts
    ↓
analyzeCP2000Discrepancies()     ← src/domain/cp2000-discrepancy.ts
  - detects amount_mismatch
  - generates findings (severity, confidence, provenance)
  - lists evidence needed
  - lists possible explanations
    ↓
buildCP2000EvidenceChecklist()  ← src/domain/cp2000-evidence.ts
  - required/recommended/optional items
  - state: missing → provided → extracted → verified → rejected
  - links evidence to discrepancies
    ↓
getCP2000ResearchPack()         ← src/domain/cp2000-research.ts
  - 7 verified IRS sources
  - source citations (topic, claim, source ID, excerpt)
  - known facts with provenance
    ↓
generateCP2000Strategy()        ← src/domain/cp2000-strategy.ts
  - position: agree_all / disagree_all / disagree_some / unclear
  - requested actions
  - risk flags
  - supporting sources
  - evidence gaps
    ↓
generateCP2000Draft()           ← src/domain/cp2000.ts (same template as System A)
    ↓
buildDraftProvenance()          ← src/domain/draft-provenance.ts
  - traces assertions to facts
  - marks supported/unsupported
  - identifies placeholder leakage
    ↓
validateCP2000Draft()           ← src/domain/cp2000-validation.ts
  PASS A: Factual Consistency
    - amounts match extraction
    - dates match extraction
    - names match
    - notice number matches
    - tax year matches
    - no unsupported assertions
  PASS B: Requirement Completeness
    - required sections present
    - requested actions covered
    - evidence requirements addressed
    - deadline considered
    - unresolved discrepancies
    - source citations
  BLOCK level: prevents approval/mailing
    - unresolved discrepancies
    - missing required evidence
    - placeholder leakage
    - unsupported assertions
    ↓
CP2000Case
  - phase: extraction → analysis → strategy → research → draft → validation → review → mailing → submitted
  - maturity: discovery → functional → authority
  - discrepancies, findings, evidence, strategy, research, validation
  - submission: method, status, tracking, proof
```

### Module Dependency Graph

```
                    PRODUCTION (System A)
                    ═════════════════════
                    
cp2000-response.tsx (UI route)
  ├── workflow-catalog.ts (definition metadata)
  ├── workflow-runtime.ts (generic state machine)
  ├── notice-type.ts (classification)
  ├── cp2000.ts (extraction + draft template)
  ├── draft-validator.ts (generic validation)
  ├── strategy.ts (generic strategies)
  ├── contradiction.ts (shared)
  ├── missing-info.ts (shared)
  └── mailing-funnel.tsx (checkout/mailing)


                    INTELLIGENCE (System B)
                    ══════════════════════
                    (NOT connected to UI)
                    
cp2000-case.ts
  ├── cp2000-discrepancy.ts
  │     ├── cp2000-findings.ts → finding.ts
  │     └── cp2000.ts (extraction type)
  ├── cp2000-evidence.ts
  │     ├── cp2000-discrepancy.ts
  │     └── cp2000-findings.ts → finding.ts
  ├── cp2000-strategy.ts
  │     ├── cp2000-research.ts → source-provenance.ts
  │     ├── cp2000-discrepancy.ts
  │     ├── cp2000-evidence.ts
  │     └── cp2000-findings.ts → finding.ts
  ├── cp2000-research.ts
  │     └── source-provenance.ts
  └── cp2000-validation.ts
        ├── cp2000-case.ts (case state)
        ├── cp2000-discrepancy.ts
        └── cp2000-findings.ts → finding.ts

cp2000-packs.ts
  ├── domain-packs.ts
  └── cp2000-research.ts

draft-provenance.ts (standalone)
```

### Duplicate/Competing Modules

| Capability | Old Module (Production) | New Module (Disconnected) | Recommendation |
|------------|------------------------|---------------------------|----------------|
| Strategy | `strategy.ts` `recommendStrategies()` | `cp2000-strategy.ts` `generateCP2000Strategy()` | **REPLACE** in CP2000 route |
| Validation | `draft-validator.ts` `validateDraft()` | `cp2000-validation.ts` `validateCP2000Draft()` | **REPLACE** in CP2000 route |
| Deadline | `workflow-runtime.ts` `deadline` field | `cp2000-case.ts` deadline with certainty | **MERGE** — use case deadline in route |
| Evidence | `workflow-catalog.ts` `evidence` array | `cp2000-evidence.ts` `buildCP2000EvidenceChecklist()` | **REPLACE** in CP2000 route |
| Case state | `workflow-runtime.ts` `WorkflowState` | `cp2000-case.ts` `CP2000Case` | **BRIDGE** — derive case from state |
| Research | (none) | `cp2000-research.ts` `getCP2000ResearchPack()` | **CONNECT** — new capability |
| Provenance | (none) | `draft-provenance.ts` `buildDraftProvenance()` | **CONNECT** — new capability |
| Factory | (none) | `workflow-factory.ts` `constructWorkflow()` | **DEFER** — architecture only |
| Registry | `workflow-catalog.ts` | `workflow-master-registry.ts` (40+ entries) | **DEFER** — not yet needed |
| Packs | (none) | `domain-packs.ts` + `cp2000-packs.ts` | **DEFER** — architecture only |
| Security | `security.ts` (used by analyze.tsx only) | (same module) | **CONNECT** — add to CP2000 route |

### What Is Genuinely Production-Connected

1. ✅ Document upload (file + paste)
2. ✅ Basic CP2000 extraction (notice number, tax year, amounts, deadline)
3. ✅ Classification (CP2000 type + confidence)
4. ✅ Extracted facts display (label + value)
5. ✅ Contradiction detection (shared module)
6. ✅ Missing info detection (shared module)
7. ✅ Generic strategy suggestions (by notice type)
8. ✅ Draft generation (template fill)
9. ✅ Generic draft validation (sections, facts, forbidden behavior)
10. ✅ Review checkboxes
11. ✅ Mailing funnel (checkout, recipient, mail type)
12. ✅ SEO metadata + FAQ

### What Exists But Is Disconnected

1. ❌ CP2000 case state with phases and maturity
2. ❌ Discrepancy analysis (amount mismatch, evidence needs, explanations)
3. ❌ Evidence checklist with lifecycle states
4. ❌ CP2000-specific strategy (discrepancy-aware)
5. ❌ Research pack (7 IRS sources + known facts)
6. ❌ Two-pass validation (factual + requirement, with BLOCK level)
7. ❌ Draft provenance (assertion-to-fact tracing)
8. ❌ Finding system (severity, confidence, provenance)
9. ❌ Source provenance (authoritative sources, citations)
10. ❌ Deadline certainty display (confirmed/derived/missing)
11. ❌ Security module (content classification, input validation)
12. ❌ Workflow factory (definition validation, engine resolution)
13. ❌ Master registry (40+ workflows)
14. ❌ Domain packs (capability configuration)
15. ❌ Case repository (persistence)

### What Is Missing Entirely

1. 🔴 BLOCK enforcement — no mechanism prevents mailing a draft with validation failures
2. 🔴 Discrepancy display — user never sees what's wrong with their notice
3. 🔴 Evidence requirements — user doesn't know what to collect
4. 🔴 Deadline certainty — user doesn't know if deadline is confirmed or estimated
5. 🔴 Source display — user never sees IRS sources or taxpayer rights
6. 🔴 Fact provenance — user can't verify where extracted values came from
7. 🔴 State persistence — all state lost on page refresh

### Canonical Data Flow (Desired)

```
Document Text
    ↓
[security.ts] classifyContent() → trust classification
    ↓
[notice-type.ts] classifyNoticeType() → type + confidence
    ↓
[cp2000.ts] extractCP2000() → facts with sourceExcerpt + extractionMethod
    ↓
[cp2000-case.ts] createCP2000Case() → case with deadline (certainty: confirmed/derived/missing)
    ↓
[cp2000-discrepancy.ts] analyzeCP2000Discrepancies() → discrepancies + findings + evidence needs
    ↓
[cp2000-evidence.ts] buildCP2000EvidenceChecklist() → required/recommended items with states
    ↓
[cp2000-research.ts] getCP2000ResearchPack() → IRS sources + known facts
    ↓
[cp2000-strategy.ts] generateCP2000Strategy() → position + actions + risks + sources
    ↓
[cp2000.ts] generateCP2000Draft() → template draft
    ↓
[draft-provenance.ts] buildDraftProvenance() → assertion-to-fact tracing
    ↓
[cp2000-validation.ts] validateCP2000Draft() → PASS A (factual) + PASS B (requirement) + BLOCK
    ↓
[workflow-runtime.ts] canAdvance() → BLOCK if validation.blocked === true
    ↓
User review (checkboxes + validation findings visible)
    ↓
[mailing-funnel.tsx] MailingFunnel → checkout → mailing
    ↓
Tracking / proof
```
