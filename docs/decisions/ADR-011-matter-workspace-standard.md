# ADR-011: Shared Matter Workspace for Workflow-Specific Experiences

## Status

Accepted

## Date

2026-09-12

## Context

MailMyPDF has many executable workflows across separate verticals. Their
underlying matters differ: a contractor dispute needs an evidence chronology;
an insurance appeal needs policy and denial analysis; an immigration response
needs notice-specific procedural controls. Repeating a one-off page for each
workflow makes the experience inconsistent and makes every new workflow more
expensive to build.

The completed Contractor Dispute matter is the visual and interaction
reference. It provides a readable, evidence-first workspace with a shared
header, sidebar, progress stepper, status rail, readiness checklist, next
action, package summary, explicit review, and a completion state. It is not a
mandatory eight-step template.

## Decision

Use a shared Matter Workspace built from `@mailmypdf/workflow-ui` and
`@mailmypdf/step-workflow` for executable workflows.

Each workflow must register its own:

- ordered set of steps, with no prescribed count or names;
- intake and evidence schemas, readiness rules, and required approvals;
- workflow-specific analysis, draft, pricing, payment, fulfillment, and
  tracking adapters; and
- step components composed from the shared workspace kit.

The shared workspace owns the visual chrome and common interaction patterns.
It does not infer legal or domain requirements. A workflow may omit timeline,
evidence, payment, or mail steps when they do not improve the user journey.

Customer-visible states must be backed by persisted, verifiable work. For
example, a UI cannot say a document was analyzed, a packet is ready, payment
was accepted, or mail was sent unless the corresponding workflow adapter has
recorded that operation.

## Consequences

- Contractor Dispute remains the frozen reference implementation for visual
  regression checks; future migrations may extend its reusable components but
  must not simplify its workflow-specific experience.
- New workflow work starts with a workflow definition and adapter contract,
  then composes the shared shell rather than duplicating the shell.
- Migrations proceed one production workflow at a time, beginning with
  Insurance Claim Denial because it is the highest-priority keyword opportunity
  and already has a real analysis-to-checkout backend.
- Each migrated workflow requires component, runtime, and workflow-contract
  tests before its existing route is replaced.

## Alternatives Considered

### Fixed eight- or nine-step process

Rejected. It presents irrelevant work, adds cognitive load, and conflicts with
the workflow-specific runtime boundary in ADR-009.

### Keep every workflow as an independent single-page application

Rejected. It duplicates visual and lifecycle controls and causes ongoing
experience drift.

### One generic legal workflow with configurable prompts

Rejected. It would flatten evidence, deadline, approval, and fulfillment
requirements that need workflow-specific contracts.
