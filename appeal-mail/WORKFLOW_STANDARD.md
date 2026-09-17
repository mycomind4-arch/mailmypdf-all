# Appeal Mail Workflow Standard

Updated: 2026-09-16

This is the durable workflow contract for the top-level `appeal-mail/` architecture.

## Customer journey

Appeal Mail workflows should move through a consistent evidence-first journey:

`source decision -> understand -> analyze -> issues -> evidence -> strategy -> draft -> review -> approve -> pay -> mail -> track -> proof`

The exact visible steps may vary by workflow, but the underlying safety and fulfillment boundaries do not.

## Shared-vs-workflow-specific rule

Do not build a new full UI/runtime architecture for each workflow.

- Shared presentation belongs in `packages/design-system` and `packages/workflow-ui`.
- Shared workflow/runtime logic belongs in `packages/workflows`, `packages/step-workflow`, and other shared capability packages.
- Workflow folders under `appeal-mail/workflows/<workflow>/` own their specific content, schema, SEO, source forms, mappings, prompts/rules, and any genuinely unique step behavior.

Prefer manifest/config-driven rendering over one-off workspace components.

## Analysis and provenance

AI may assist with document extraction, issue analysis, evidence organization, drafting, and validation.

Deterministic code remains responsible for:

- schema validation;
- ownership and authorization;
- source/provenance retention;
- deadline/status state;
- contradictions and unresolved facts;
- readiness and approval gates;
- payment state and idempotency;
- exact-document approval;
- fulfillment/tracking/proof state.

Unknown, inferred, conflicting, and source-supported facts must remain distinguishable. Do not silently promote an inference into a confirmed fact.

## Human control

Consequential actions require explicit user review and approval.

A draft, validation pass, payment event, or provider request is not mailing success.

The fulfillment boundary is:

`approved document -> payment -> fulfillment submission -> provider status -> tracking/proof`

## Evidence and documents

Workflows should retain the source document and relevant uploaded evidence when the final packet is supposed to include them. Generated correspondence must not claim an attachment is enclosed unless packet assembly actually includes it.

## States and accessibility

Every step should intentionally handle loading, empty, partial, warning, error, success, and review states.

Use semantic headings, keyboard-accessible controls, visible focus, sufficient contrast, descriptive labels, reduced-motion support, and status communication that does not rely on color alone.

## New workflow rule

Before adding custom UI, check whether the need can be represented by:

- a workflow manifest;
- shared field definitions;
- shared document requirements;
- shared readiness/approval gates;
- shared packet/fulfillment components;
- a small workflow-specific adapter.

Custom components are the exception, not the default.
