# Power Workflows — Maximum-Leverage Design

## Purpose

`WORKFLOW_CATALOG.md` lists 60 workflow *intents*, prioritized by commercial tier. This
document answers a different question: **which of those intents, built which way,
give a property owner the most actual leverage against a code enforcement action —
and in what order should we build them?**

It is written against what already exists in `src/domain/`, `src/due-process/`,
`src/findings/`, and `src/records-requests/`. Nothing here invents new legal theory;
every mechanism below maps to a rule, engine, or finding type that is either already
implemented or is a direct, evidence-gated extension of one. Every mechanism still
obeys the existing house rules: no invented facts, every conclusion traceable to
evidence, `humanReviewFlag`/`legallyConsequential` on anything that leaves the
building, and MailMyPDF as the only fulfillment path.

## Why "power" is not the same as "workflow count"

Code enforcement leverage almost never comes from writing a better paragraph of
prose. It comes from one of a small number of structural facts:

1. The government has to follow its **own procedure** (notice, hearing, appeal) —
   and it frequently doesn't, especially against pro se homeowners.
2. The government has to prove **jurisdiction and standing** — the right code, the
   right property, the right recipient — before it can act against anyone.
3. Public records law gives the target a **right to the agency's own file**, and
   that file is discoverable *before* a substantive response is owed.
4. A complaint and a verified inspection finding are **not the same thing**, and
   agencies routinely conflate them.
5. Clocks matter more than arguments — missing a hearing-request deadline can
   forfeit rights no argument will ever recover, regardless of the merits.

The five workflows below each target exactly one of these five facts. A sixth,
the **Orchestrator**, exists because the actual power move is running all five in
parallel on intake, not making the user pick one.

---

## Mechanism 1 — Due-Process Audit (voids the action outright)

**Existing infra:** `src/due-process/analyzer.ts` already encodes
`notice_timing`, `hearing_right`, and `appeal_pathway` rules against a sorted
timeline, and emits `UnifiedFinding`s (`NOTICE_TIMING_VIOLATION`,
`HEARING_RIGHT_VIOLATION`, `APPEAL_PATHWAY_MISSING`, `NO_PRIOR_NOTICE`).

**Why it's the highest-leverage mechanism:** a single `critical` flag here doesn't
weaken the agency's case — it can void the entire enforcement action, fine, or
lien, independent of whether the underlying violation is real. This is the
`DueProcessAnalyzer`'s whole point and it is currently wired only into the
inspection-consent flagship's `warrant_analysis`/`authority_analysis` stages. It
should run against the **full case timeline**, not just the inspection request.

**Gap:** `DueProcessAnalyzer.analyze()` takes a generic timeline + evidence list —
it's already workflow-agnostic. What's missing is a workflow that (a) builds the
full notice→hearing→decision→fine/lien timeline from all case documents rather
than a single notice, and (b) turns `critical`/`medium` flags directly into a
draft that cites the specific procedural defect and demands the action be
rescinded or stayed pending cure of the defect.

**Workflow 3 — "Challenge Due Process Violation" (catalog #11/#54, elevated to flagship)**

- `id`: `challenge-due-process-violation`
- `trigger`: any adverse action (fine, penalty, lien, abatement order, demolition
  order) exists in the case timeline
- `requiredEvidence`: notice(s) received, the adverse action document, any hearing
  notice/transcript if one exists
- `pipeline`: `secure_ingest → classify → extract → timeline (full case, not just
  notice) → due_process_audit → discrepancies → strategy → draft → draft_critique
  → final_validation → human_review → human_authorization → fulfillment → tracking
  → proof`
- `analysisCapabilities`: reuses `DueProcessAnalyzer` unmodified; new
  `timeline.ts` builder that ingests every uploaded document (not one) into
  `DueProcessTimelineEvent[]`
- `strategyOptions`: new `StrategyType` values —
  `CHALLENGE_NOTICE_DEFECT`, `CHALLENGE_MISSING_HEARING`,
  `CHALLENGE_MISSING_APPEAL_PATHWAY` — same shape as existing `Strategy`
  (`whatItDoes`/`whySuggested`/`supportingEvidence`/`humanReviewFlag: true`,
  `legallyConsequential: true`)
- `documentOutputs`: a demand letter that (1) states the specific procedural rule
  violated with the supporting timeline gap, (2) demands rescission or stay of
  the action pending cure, (3) reserves all rights, (4) does **not** concede the
  underlying violation
- **Composability**: shares case/evidence with Workflows 1 and 2; a
  `critical` finding here should be surfaced as a suggestion inside *both* of
  those workflows' review screens, not just its own

---

## Mechanism 2 — Discovery Before Response (buys time, forces admissions)

**Existing infra:** `src/records-requests/integration.ts` already builds a
prefilled records request from `originatingCaseId` and reacts to gap findings
(`MISSING_REQUESTED_CATEGORY`, `PARTIAL_PRODUCTION`, `REFERENCED_RECORD_NOT_PRODUCED`).
It's currently modeled as a *reaction* to a gap discovered after the fact.

**Why it's high-leverage and near-zero-risk:** requesting the complete case file
under public records law before ever responding substantively to a notice is a
legal right in nearly every US jurisdiction, it is not an admission of anything,
and it typically does one of three things: (a) the agency produces a thin file
that itself becomes due-process/discrepancy ammunition, (b) production is
late/partial, generating its own `PARTIAL_PRODUCTION`/`MISSING_REQUESTED_CATEGORY`
findings usable in Mechanism 1, or (c) it reasonably justifies extending the
response clock (`SEEK_EXTENSION` already exists as a strategy — chain it here).

**Gap:** today the records-request engine only fires *after* a gap is found
during another workflow. It should be offered as the **first move**, before
drafting any substantive response — requesting the complaint, all inspection
reports/photos, the inspector's qualifications/certification, calibration
records for any measuring device cited, the full case file, prior enforcement
history on the property, and internal correspondence referencing the case.

**Workflow 4 — "Request Complete Case File Before Response" (catalog #16–22,
consolidated into one power workflow instead of seven thin ones)**

- `id`: `request-complete-case-file`
- `trigger`: any notice received where no records request has yet been filed on
  this case
- `documentOutputs`: a single comprehensive records request built from
  `buildRecordsRequestPrefill()`, with `subjectMatter` populated from the
  notice's extracted fields (complaint number, case number, violation code,
  inspector name if present) rather than the user having to know what to ask for
- **Composability**: on `fulfilled`, automatically runs `isGapFinding()` over the
  production and offers Workflow 3 (due-process) and Workflow 6 (discrepancy) as
  next steps with the new findings pre-loaded — this is the one place in the
  whole system where composability compounds fastest, because one filing can
  spawn two follow-on workflows without the user re-explaining anything
- **Deadline interaction**: should always be paired with `SEEK_EXTENSION` from
  `strategy-engine.ts` — "we are exercising our public-records right to the case
  file and request the response deadline be extended pending production" is a
  standard, low-risk, good-faith move

---

## Mechanism 3 — Standing / Recipient Attack (voids notice to *this* person)

**Existing infra:** `recipient_reconciliation` is already a required Gold Pipeline
stage in both Workflow 1 and Workflow 2 (`correction-workflow.ts`), but it's
buried as one stage among twenty rather than a standalone move.

**Why it's high-leverage:** notice to the wrong party is not a technicality — if
the person who received the notice is not the owner of record, is deceased, is a
prior owner, is a tenant instead of the owner, or is the wrong legal entity
(individual vs. LLC vs. trust), due process requires notice to *the actual
responsible party* before action against them is valid. `strategy-engine.ts`
already special-cases `reportedDeceased` as an auto-trigger for
`SEEK_PROFESSIONAL_REVIEW` — that's the tell that this mechanism is already known
to be serious, it just isn't its own workflow yet.

**Workflow 5 — "Challenge Notice Recipient / Standing" (new — not separately
named in the current 60-item catalog; closest is #23 "Challenge Incorrect
Property Information," which conflates property errors with *person* errors)**

- `id`: `challenge-notice-recipient`
- `trigger`: `recipient_reconciliation` stage produces a mismatch between the
  named recipient and property-of-record ownership (via
  `property-intelligence.ts`)
- `requiredEvidence`: the notice, proof of current ownership/tenancy (deed,
  lease, probate filing if the named party is deceased)
- `strategyOptions`: `CORRECT_RECIPIENT` already exists in
  `correction-strategy.ts` — this workflow is that strategy promoted to a
  first-class entry point rather than something the user only finds after
  starting the correction workflow for an unrelated reason
- **Why this order matters**: run this *before* drafting any substantive
  response on the merits. Responding substantively as if you're the correct
  recipient can be read as accepting that you are — the workflow's draft-critique
  stage should specifically check for and flag any language that implicitly
  concedes proper service

---

## Mechanism 4 — Discrepancy / Contradiction Mining

**Existing infra:** `discrepancy-engine.ts` + `complaint-provenance.ts` +
`evidence-graph.ts` already exist to distinguish a complaint allegation from a
verified condition and to trace claims to sources. `CONTRADICTION` and
`IDENTIFIER_MISMATCH` are findings the taxonomy already supports.

**Why it's high-leverage:** agencies routinely cite a complainant's allegation as
if it were a verified inspection finding, or a code section that doesn't match
what's actually on the property, or dates/case numbers that shift between
documents. Any of these, once documented with a source citation, either forces a
correction or becomes grounds for a due-process challenge (the notice doesn't
accurately describe what it purports to address).

**Workflow 6 — "Cross-Reference Complaint Against Evidence"** consolidates
catalog #24 ("Challenge Incorrect Violation Information") with the
discrepancy/contradiction engines already built, fed by whatever the property
owner uploads (their own photos, permit history, prior inspection reports) plus
anything produced under Workflow 4. This is the natural consumer of Workflow 4's
output — feed the production into `discrepancy-engine.ts` rather than asking the
user to read it themselves.

---

## Mechanism 5 — Selective / Discriminatory Enforcement (new capability)

**Not in the current 60-item catalog at all.** This is the one genuinely new
capability worth building, because the infrastructure for it already exists in a
different shape.

**The idea:** selective or retaliatory enforcement — being cited for a condition
that identical/worse conditions on comparable nearby properties are not cited
for — is a recognized equal-protection defense, especially where there's
evidence of a retaliatory motive (a complaint from a neighbor with a known
dispute, a pattern of enforcement following a specific trigger like a permit
denial or a code-enforcement complaint the owner themselves filed).

**How to build it without inventing new machinery:** `records-requests/` already
supports requesting property-specific enforcement history
(`originatingCaseId`, `property`, `dateRangeStart/End`). Extend the *scope*
parameter to request the same category of records for a defined radius or a
user-supplied list of comparable addresses, then run the same
`discrepancy-engine.ts`/finding pipeline across the *set* rather than a single
case. The output is a comparison table (this property: cited; N comparable
properties with the same condition: not cited) with every entry sourced to a
specific record, never asserted from vibes.

**Workflow 7 — "Selective Enforcement Pattern Analysis"**

- `id`: `selective-enforcement-pattern-analysis`
- `trigger`: user-initiated, typically after Workflow 3 or 6 surfaces a
  procedural or evidentiary weakness and the user has reason to believe they
  were targeted
- `requiredEvidence`: the case's own records (from Workflow 4), plus either
  agency-wide enforcement statistics (often public via open-data portals) or a
  user-supplied list of comparable addresses
- `analysisCapabilities`: new `pattern-analysis.ts` module — deliberately kept
  separate from `discrepancy-engine.ts` (which compares claims *within one
  case*) since this compares outcomes *across cases*; same finding-taxonomy
  shape, new `source: "pattern"` on `UnifiedFinding`
- `legallyConsequential`: **always true, always `SEEK_PROFESSIONAL_REVIEW`** —
  this is the one workflow whose output should never be treated as
  self-executing; it is proof marshaling in support of an eventual attorney
  engagement or an equal-protection argument in an administrative hearing, not a
  standalone letter

---

## The Orchestrator — where the actual power lives

Individually, Workflows 3–7 are each meaningfully better than the current
one-workflow-at-a-time model. The compounding move is **not** making a property
owner pick which of five specialized workflows applies to their notice. It's
running the cheap, evidence-only stages of all five automatically on intake and
presenting a ranked battle plan.

**Workflow 0 — "Case Strategy Command Center"**, sitting in front of Workflows
1–7:

1. On document upload, run `secure_ingest → classify → extract →
   complaint_provenance → recipient_reconciliation → property_intelligence →
   jurisdiction_identification` once, shared across every downstream workflow
   (this already happens implicitly via the composable case model —
   the Orchestrator makes it explicit and automatic instead of requiring the
   user to have picked the "right" workflow first).
2. Run the **read-only, evidence-only** halves of Mechanisms 1, 3, and 4
   (due-process audit against whatever timeline exists so far, recipient
   reconciliation, discrepancy scan) — none of these require drafting anything
   or contacting the agency, so none of them are `legallyConsequential` yet.
3. Rank findings by severity using the existing `findingSummary()` output
   (`critical` due-process/recipient defects first — these can void the action
   outright — then `high`/`medium` discrepancies, then routine deadline
   management).
4. Present the ranked list with one clearly-marked recommended next workflow
   per finding, using the exact `Strategy`/`CorrectionStrategy` shape already
   defined (`whatItDoes`, `whySuggested`, `supportingEvidence`,
   `humanReviewFlag`, `legallyConsequential`) — never auto-selecting a strategy,
   per the existing house rule.
5. If nothing critical surfaces and a deadline is close, default to offering
   Mechanism 2 (records request + extension) as the safe first move rather than
   drafting a substantive response under time pressure.

This is a thin orchestration layer over engines that already exist
(`due-process/analyzer.ts`, `discrepancy-engine.ts`, `recipient_reconciliation`,
`findings/taxonomy.ts`) — it requires no new legal logic, only wiring stages that
today run inside one workflow's pipeline to run once, shared, on intake.

---

## Build Priority

Ordered by leverage-per-engineering-hour, given what's already built:

| Order | Workflow | New engine work required |
|---|---|---|
| 1 | **Orchestrator** (Workflow 0) | Wiring only — no new analysis logic |
| 2 | **Due-Process Audit** (Workflow 3) | Full-case timeline builder; `DueProcessAnalyzer` reused as-is |
| 3 | **Complete Case File Request** (Workflow 4) | Prefill logic mostly exists; add "first move" trigger + auto-extension pairing |
| 4 | **Notice Recipient Challenge** (Workflow 5) | Promote existing `recipient_reconciliation` + `CORRECT_RECIPIENT` to a standalone entry point |
| 5 | **Discrepancy Cross-Reference** (Workflow 6) | Mostly wiring `discrepancy-engine.ts` to Workflow 4's output |
| 6 | **Selective Enforcement Analysis** (Workflow 7) | New `pattern-analysis.ts` — the only workflow here needing a genuinely new module |

Workflows 1 and 2 (already built) remain the entry points for the two intents
they cover (inspection consent, correction of factual errors). Everything above
is designed to sit alongside them on the same composable case, not replace them.

## Non-goals

- Nothing here drafts or sends anything without `human_authorization`, matching
  every existing workflow.
- Nothing here asserts a legal conclusion ("this violates due process") — every
  output is a finding with a severity, a source, and supporting facts, exactly
  like `UnifiedFinding` already requires, with `SEEK_PROFESSIONAL_REVIEW`
  triggered wherever the stakes are highest (adverse action already taken,
  selective-enforcement claims, warrant/consent issues).
- Selective enforcement analysis in particular should never be framed as
  self-executing — it is evidence assembly for a hearing or an attorney, not a
  letter that resolves the case on its own.
