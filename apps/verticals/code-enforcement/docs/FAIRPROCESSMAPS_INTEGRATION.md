# Code Enforcement + FairProcessMaps Integration

## Decision

FairProcessMaps is the primary architectural reference for this vertical because it already models the right domain: property, parcel context, evidence, timeline, findings, and jurisdiction-specific due-process analysis. FairProcess remains the procedural-intelligence reference for later rule/provenance work.

The Code Enforcement product will not copy either repository wholesale. It will consume the smallest proven slices needed for a functional workflow.

## Two decisions this doc previously left open

### Mailing: MailMyPDF's own pipeline, not FairProcessMaps' Lob integration

FairProcessMaps has its own certified-mail integration via Lob
(`src/lib/mail/lob.ts`, `case_communications`, `workflow_mailings`). This
vertical does **not** route through it. Physical delivery and mailing proof
go through MailMyPDF's own mail pipeline — the same one every other
vertical in this ecosystem uses.

Reasoning: mail delivery, tracking, and proof-of-delivery is MailMyPDF's
core product, not an incidental feature. A second, parallel Lob
integration lifted from FairProcessMaps would fragment that story across
two independent mailing systems inside one monorepo, duplicate
payment/compliance surface that already exists once, and give this one
vertical a delivery-proof mechanism none of the other twelve share.
FairProcessMaps' Lob integration stays scoped to FairProcessMaps' own
users; nothing here depends on it.

This resolves item 6 below unambiguously: "MailMyPDF handling physical
delivery and mailing proof" means MailMyPDF's `/api/v2` mail pipeline,
full stop — not a choice still open per response/records workflow.

### Case Assistant: port FairProcessMaps' implementation, don't rebuild

FairProcessMaps already has a working, tool-using Claude conversation
scoped to one case (`src/lib/case-assistant.ts`): read tools (timeline,
evidence, findings, property intelligence, documents, county recorder
search) execute immediately; write tools (add/edit/remove a timeline
event) are proposed and require explicit human approval before anything
is written; `draft_document` executes immediately because it only
creates a new artifact, nothing existing is touched.

This vertical will **port and adapt that implementation**, not design a
second one from scratch. Reasons:

- This vertical already commits to reusing FairProcessMaps' domain model
  (property → case → evidence → events → findings → actions, per
  "Reuse from FairProcess / FairProcessMaps" in the README) — the same
  tool shapes (`get_timeline`, `get_evidence`, `get_findings`,
  `get_property_intelligence`, `get_documents`) map close to 1:1 onto
  this vertical's own Case Command Center sections.
- The safety-critical part of the design — reads execute immediately,
  writes are proposed and gated behind explicit approval, drafting is
  the one write-shaped exception — is exactly the kind of logic that's
  easy to get subtly wrong on a rebuild. Reusing a tested implementation
  is lower-risk than re-deriving the same guarantee independently.
- Building a second, independently-evolving tool-grounded conversation
  loop for the same job is the duplicate-model problem this project has
  already flagged elsewhere as a failure mode to avoid.
- It does not conflict with the "No fake AI chat" non-goal below — that
  non-goal is about *ungrounded* chat. A ported, tool-grounded assistant
  is exactly what "not fake" means here.

Concretely, this means: when the Case Assistant work item comes up (it
sits after document ingestion, the evidence model, timeline, and
property intelligence — items 1 through 4 below — since it needs this
vertical's own case data to be real before it has anything to read),
start from FairProcessMaps' `case-assistant.ts` as the reference
implementation. Swap in this vertical's own tool set as the underlying
sections come online (e.g. a `check_permit_conflict` tool once permit
data exists), and route every assistant-generated sentence through the
crosswalk in [`VOCABULARY.md`](VOCABULARY.md) rather than
FairProcessMaps' original system-prompt wording, which doesn't yet speak
in this vertical's Fact/Inference/Unknown/Rule/Recommendation labels.

## Current functional slice

The dashboard now provides a real browser-side case workspace:

1. Add the notice and supporting evidence files.
2. Confirm property, case number, jurisdiction, deadline, and alleged violations.
3. Persist the case locally so refreshes do not erase the work.
4. Run deterministic completeness checks.
5. Surface missing facts/evidence and deadline warnings without inventing legal conclusions.

This is deliberately smaller than the old static command-center mockup.

## Next implementation order

### 1. Document ingestion

Add server-side document storage and extraction. Every proposed fact should retain source filename and page/region provenance.

### 2. Evidence model

Map documents into the existing domain model: property -> case -> evidence -> events -> findings -> actions.

### 3. Timeline

Generate timeline events from extracted document facts, allow user corrections, and preserve the source for each event.

### 4. Property intelligence

Adapt the FairProcessMaps property-resolution pattern. Start with address/jurisdiction resolution; add parcel/GIS only when the source is reliable for the selected jurisdiction.

### 5. Procedural analysis

Port only jurisdiction-aware rules that can be traced to a governing source. Findings must distinguish source facts, inferences, unknowns, and recommendations — see [`VOCABULARY.md`](VOCABULARY.md) for how this vertical's claim labels map onto FairProcessMaps' checkpoint-status vocabulary (`Observed` / `NotLocated` / `InsufficientEvidence` / `AwaitingTrigger` / `Satisfied`), written before any of this section's code.

### 6. Response and records workflows

A reviewed finding should be able to create either a response workflow or a records-request workflow, with MailMyPDF's own mail pipeline (not FairProcessMaps' Lob integration — see "Decisions" above) handling physical delivery and mailing proof.

## Non-goals for the first release

- No fake AI chat — this excludes a *ported, tool-grounded* Case Assistant (see "Decisions" above); it's about not shipping an ungrounded chat as a stand-in for one.
- No hard-coded case data presented as user data.
- No generic nationwide legal conclusions.
- No GIS dependency before a reliable jurisdiction/data source exists.
- No large agent swarm or microservice architecture.

## Architecture target

```text
Notice / documents
        |
        v
Document extraction + provenance
        |
        v
Property + Case + Evidence
        |
        v
Evidence-linked Timeline
        |
        v
Jurisdiction-aware Findings
        |
        v
Human Review
     /       \
Response   Records Request
     \       /
      MailMyPDF
```
