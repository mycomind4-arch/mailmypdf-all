# CP2000 Reference Implementation Audit

## 1. What CP2000 Currently Does

### Exposed in the UI (`cp2000-response.tsx`)
- Document upload (PDF text extraction, paste text)
- CP2000 classification and field extraction (notice number, date, deadline, tax year, amounts, income source, payer, address, phone)
- Extracted fact review with provenance (sourceExcerpt, extractionMethod)
- Contradiction detection (reuse `detectContradictions()`)
- Missing info detection (reuse `detectMissingInfo()`)
- User facts input
- User objective input with strategy suggestions (reuse `recommendStrategies()`)
- Draft generation (reuse `generateCP2000Draft()`)
- Draft validation (reuse `validateDraft()` from `draft-validator.ts`)
- Review checks
- Mailing funnel (reuse `MailingFunnel` component)

### Implemented in Domain Modules (NOT exposed in UI)
- **Discrepancy analysis** (`cp2000-discrepancy.ts`) — detects amount_mismatch, documentation_gap, wrong_tax_year, deadline_risk, proposed_change
- **Evidence checklist** (`cp2000-evidence.ts`) — dynamic checklist with requirement levels
- **Findings** (`cp2000-findings.ts`) — structured findings with supporting facts
- **Research pack** (`cp2000-research.ts`) — IRS sources with source facts vs interpretations
- **Response strategy** (`cp2000-strategy.ts`) — evidence-derived strategy with position, issues, evidence
- **Two-pass validation** (`cp2000-validation.ts`) — factual consistency + requirement completeness
- **Case model** (`cp2000-case.ts`) — typed structure connecting all components with phase tracking
- **Domain packs** (`cp2000-packs.ts`) — registered with factory

### Critical Gap
The new domain modules are **tested but not integrated into the workflow**. The production UI runs the old extraction → draft → validate pipeline. Discrepancy analysis, evidence checklist, findings, research, strategy, and two-pass validation exist only in tests.

## 2. Genuinely Reusable Platform Capability

| Capability | Module | Reusable? |
|---|---|---|
| Notice classification | `notice-type.ts` | YES — shared |
| Fact model with provenance | `fact.ts` | YES — shared |
| Deadline model + parsing | `deadline.ts` | YES — shared |
| Contradiction detection | `contradiction.ts` | YES — shared |
| Missing info detection | `missing-info.ts` | YES — shared |
| Evidence model | `evidence.ts` | YES — shared (needs lifecycle upgrade) |
| Strategy recommendation | `strategy.ts` | YES — shared |
| Draft generation | `response.ts` | YES — shared |
| Draft validation | `draft-validator.ts` | YES — shared |
| Workflow state machine | `workflow-runtime.ts` | YES — shared |
| Security | `security.ts` | YES — shared |
| Mailing | `mailing.ts` | YES — shared |
| Domain pack contracts | `domain-packs.ts` | YES — shared |
| Factory pipeline | `workflow-factory.ts` | YES — shared |

## 3. CP2000-Specific Domain Logic

| Capability | Module | CP2000-specific? |
|---|---|---|
| CP2000 extraction | `cp2000.ts` | YES — CP2000 field patterns |
| Discrepancy analysis | `cp2000-discrepancy.ts` | PARTIALLY — structure is reusable, CP2000 types are specific |
| Evidence checklist | `cp2000-evidence.ts` | PARTIALLY — builder pattern is reusable, items are CP2000-specific |
| Findings | `cp2000-findings.ts` | PARTIALLY — Finding model is reusable, types are CP2000-specific |
| Research pack | `cp2000-research.ts` | YES — IRS sources are CP2000-specific |
| Strategy | `cp2000-strategy.ts` | PARTIALLY — position types are reusable, logic is CP2000-specific |
| Two-pass validation | `cp2000-validation.ts` | PARTIALLY — validator structure is reusable, checks are CP2000-specific |
| Case model | `cp2000-case.ts` | YES — CP2000 case structure |
| Domain packs | `cp2000-packs.ts` | YES — CP2000 pack configuration |

## 4. What Belongs in the Factory

- **Finding model** (generic) — structure with supporting facts, confidence, severity
- **Evidence lifecycle** (generic) — missing → provided → under_review → verified → rejected
- **Source provenance** (generic) — URL, title, organization, type, verification status
- **Draft assertion traceability** (generic) — map draft claims to facts/evidence
- **Two-pass validation structure** (generic) — factual + requirement validators
- **Workflow gates** (generic) — quality gate evaluation with blocking
- **Case review state** (generic) — phase tracking through the workflow
- **Integration test harness** (generic) — end-to-end test pattern for any workflow

## 5. What Is Duplicated

- `validateDraft()` in `draft-validator.ts` and `validateCP2000Draft()` in `cp2000-validation.ts` — overlapping amount/placeholder/forbidden checks
- Evidence states in `evidence.ts` (`pending/verified/rejected`) and `cp2000-evidence.ts` (`missing/provided/verified/...`) — two different state models
- Strategy in `strategy.ts` (`recommendStrategies()`) and `cp2000-strategy.ts` (`generateCP2000Strategy()`) — two different strategy approaches

## 6. What Is Missing

1. **UI integration** — new domain modules are not wired into the production UI
2. **Evidence state machine** — no proper lifecycle with `under_review`, `rejected`, defined verification meaning
3. **Deadline derivation** — no "derived" certainty with calculation provenance
4. **Draft provenance** — no mechanism to trace draft assertions back to facts/sources
5. **End-to-end integration test** — no test connecting all components
6. **Blocking validation** — no BLOCK level that prevents completion/mailing
7. **Shared Finding model** — Finding is CP2000-specific, should be generic
8. **Source verification** — research pack URLs not verified against live content
9. **Expanded adversarial fixtures** — only 3 adversarial cases (empty, gibberish, injection)
10. **Case review UI** — no clear UNDERSTAND → VERIFY → COMPLETE → REVIEW → APPROVE → SEND experience

## 7. What Prevents Authority Status

1. UI does not expose discrepancy analysis, findings, evidence checklist, or two-pass validation
2. No end-to-end integration test
3. Evidence lifecycle is incomplete
4. Deadline derivation with provenance is not implemented
5. Draft assertions are not traceable to sources
6. Validation has no BLOCK level
7. Adversarial fixtures are insufficient
8. Shared Finding model not extracted

## 8. Which Gaps Should Be Solved Globally

- Finding model → shared `finding.ts`
- Evidence lifecycle → upgrade `evidence.ts`
- Source provenance → shared `source-provenance.ts`
- Draft assertion traceability → shared `draft-provenance.ts`
- Two-pass validation structure → shared `validation-framework.ts`
- Integration test harness → shared test utility

## 9. Which Gaps Should Remain CP2000-Specific

- CP2000 extraction patterns
- CP2000 discrepancy types and logic
- CP2000 evidence checklist items
- CP2000 research sources (IRS-specific)
- CP2000 strategy positions
- CP2000 validation checks
- CP2000 case model structure
