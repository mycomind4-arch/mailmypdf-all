# Code Enforcement + FairProcessMaps Integration

## Decision

FairProcessMaps is the primary architectural reference for this vertical because it already models the right domain: property, parcel context, evidence, timeline, findings, and jurisdiction-specific due-process analysis. FairProcess remains the procedural-intelligence reference for later rule/provenance work.

The Code Enforcement product will not copy either repository wholesale. It will consume the smallest proven slices needed for a functional workflow.

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

A reviewed finding should be able to create either a response workflow or a records-request workflow, with MailMyPDF handling physical delivery and mailing proof.

## Non-goals for the first release

- No fake AI chat.
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
