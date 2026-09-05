# ADR-009: Workflow-specific runtimes on shared secure infrastructure

## Status
Accepted

## Context

MailMyPDF serves workflows with different legal and operational shapes. An SSDI appeal, an IRS CP2000 response, an immigration evidence package, and a records request do not share the same questions, evidence model, generated artifacts, deadlines, or completion rules. A single generic workflow runtime would either flatten those differences or expose capabilities before their authorization and validation rules exist.

The product still needs consistent security and delivery controls: authenticated ownership, quarantine and malware scanning, bounded model disclosure, audit records, immutable drafts and approvals, pricing, payment, mailing, tracking, retention, and observability.

## Decision

Use a two-layer architecture:

1. **Shared secure infrastructure** owns identity, document custody, scanning gates, retention, model disclosure, audit events, packet hashing, approval, pricing, payment, fulfillment, tracking, and operational telemetry.
2. **Workflow runtimes** are explicit adapters registered by `(vertical_id, workflow_id)`. Each runtime owns its step graph, input schema, analysis instructions, draft instructions, artifact builder, evidence rules, source requirements, deadline semantics, and readiness checks.

The shared case and packet primitives may be reused only when a workflow's contract fits them. A runtime must fail closed when its pair is not registered; catalog or SEO content never grants execution permission.

## Consequences

- CP14 and CP2000 can share secure intake, storage, analysis disclosure, packet custody, payment, and certified mailing while using different tax-specific fields and response logic.
- Workflow pages can share visual components without presenting identical steps or making unsupported capability claims.
- Each runtime needs contract tests for malformed model output, stale documents, unsupported notice types, missing evidence, deadlines, packet readiness, and fulfillment handoff.
- Adding a workflow is slower than copying a generic prompt, but its behavior is reviewable and its security boundary is explicit.

## Non-goals

- Treating an SEO landing page as proof that an executable runtime exists.
- Sending a notice or evidence file to a model from the browser.
- Reusing a workflow's legal or domain assumptions in another workflow.
