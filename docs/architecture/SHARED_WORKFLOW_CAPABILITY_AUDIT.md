# Shared Workflow Capability Audit

Audited against `main` on 2026-09-18.

## Result

The reusable workflow architecture is now broad enough that new MailMyPDF workflows should usually be assembled from configuration, domain rules, workflow-specific assets/forms, and a small amount of domain logic instead of rebuilding infrastructure.

The old architecture under `apps/**` remains read-only. Legacy files may be inspected for useful contracts or data shapes, but reusable logic must be copied/generalized into the new shared packages rather than edited in place.

| Capability area | Package | Audit result |
| --- | --- | --- |
| Identity / entitlements | `@mailmypdf/ecosystem` | implemented |
| Workflow definition / manifests / capability composition | `@mailmypdf/workflows` | implemented |
| Durable/checkpointed workflow execution | `@mailmypdf/workflows` | implemented |
| Dynamic matter state / conditional steps | `@mailmypdf/step-workflow` | implemented |
| Secure intake / quarantine / scanning | `@mailmypdf/documents` | implemented |
| Verified document retrieval / integrity | `@mailmypdf/documents` | implemented |
| Retention / purge eligibility | `@mailmypdf/documents` | implemented |
| Privacy-release review / redaction instructions | `@mailmypdf/documents/privacy` | implemented contract and fail-closed review gates |
| PDF / text extraction | `@mailmypdf/document-intelligence` | implemented |
| PDF / image vision analysis boundary | `@mailmypdf/document-intelligence` | implemented |
| AI routing / schema / provenance | `@mailmypdf/ai` | implemented |
| Facts / evidence / provenance / contradictions | `@mailmypdf/intelligence` | implemented |
| Timeline / deadlines / risk / readiness | `@mailmypdf/intelligence` | implemented |
| Appeal-specific classification / grounds / strategy / readiness | `@mailmypdf/intelligence/appeal` | implemented |
| Benefits issue/evidence/drafting constraints | `@mailmypdf/intelligence/benefits` | implemented |
| Official-form registry / source metadata / requirement rules | `@mailmypdf/forms` | implemented |
| Generic official-form field filling | `@mailmypdf/forms` | not claimed; workflow-specific form filling should not be invented until a reliable shared filler/field-map implementation exists |
| Versioned jurisdiction/authority rules | `@mailmypdf/jurisdiction-rules` | implemented infrastructure |
| Authoritative recipient/destination resolution | `@mailmypdf/fulfillment` | implemented, including workflow/jurisdiction/method/effective-date matching |
| Address verification | `@mailmypdf/fulfillment` | implemented |
| PDF generation / packet assembly / exact hashes | `@mailmypdf/packet-builder` | implemented |
| Exact-artifact user attestation | `@mailmypdf/workflows/approval/artifact-attestation` | implemented; statement/version is bound to artifact id + SHA-256 |
| Pricing | `@mailmypdf/pricing` | implemented |
| Payment -> immutable fulfillment | `@mailmypdf/payment-fulfillment` | implemented |
| Mailing / tracking | `@mailmypdf/mailing-client`, `@mailmypdf/fulfillment` | implemented |
| Notifications / reminders | `@mailmypdf/notifications` and ecosystem/runtime integrations | implemented |
| Proof / custody | `@mailmypdf/proof` | implemented |
| Workflow-wide append-only audit events | `@mailmypdf/audit` | implemented with durable Supabase adapter |
| Retry / idempotency | `@mailmypdf/workflows` | implemented |
| Safe workflow telemetry | `@mailmypdf/workflows` | implemented |
| Host scheduling / immediate queue boundary | `@mailmypdf/agent-runtime` | implemented provider-neutral contract; production host supplies durable provider |
| Acceptance simulation / mock Stripe / mock mailing / artifacts | `@mailmypdf/workflow-acceptance` | implemented |
| Shared workflow UI | `@mailmypdf/workflow-ui` | implemented |
| Studio/factory operations | `@mailmypdf/vertical-foundry` | implemented foundation |

## Official forms

`@mailmypdf/forms` deliberately separates what is already proven from what is not.

It can register official forms, preserve agency/source/revision/hash metadata, resolve conditional form requirements, and fail closed unless required completed forms are clean, usable, and included.

The canonical SSDI workflow is the first production consumer. Its bundled SSA PDFs include retained official source copies and normalized mail-ready copies. The current SSDI flow downloads the official form and accepts the user's completed/signed upload; it does **not** pretend that arbitrary agency PDFs can already be filled reliably through a generic PDF-field engine.

A future shared filler should be added only after workflow-proven field maps and edition/version handling can be generalized safely.

## Recipient and authority resolution

Address verification and recipient resolution are separate concerns.

The recipient resolver answers which agency/office/destination applies to a workflow, jurisdiction, submission method, and effective date. Its entries require an authoritative source. The resolved postal address may then pass through the shared address-verification boundary before fulfillment.

Jurisdiction-specific legal/procedural rules belong in `@mailmypdf/jurisdiction-rules`, with authority references and effective dates. Do not promote stale addresses, deadlines, or procedural rules from legacy catalogs without current authoritative support.

## Artifact-bound approval and privacy review

An approval or certification must refer to an exact artifact, not merely to a matter.

`@mailmypdf/workflows/approval/artifact-attestation` binds the signer, statement id/version, artifact id, and SHA-256. Rebuilding or changing the packet therefore invalidates a prior attestation.

`@mailmypdf/documents/privacy` provides a separate disclosure review. Sensitive findings must receive an explicit retain, redact, or exclude decision. A redaction decision is not actionable unless it has a text range or PDF rectangle. Rendering is provider-neutral and must produce a different output hash before release can proceed.

## Audit and scheduling

`@mailmypdf/audit` is append-only at the public repository boundary and supports a durable Supabase implementation. Audit events can reference document, form, packet, approval, order, mailing, and proof artifacts, including hashes.

Scheduling is intentionally separate from durable workflow semantics. `@mailmypdf/workflows` owns checkpointed workflow execution; `@mailmypdf/agent-runtime` now exposes a host scheduling/queue boundary for requests such as workflow resume, deadline scan, notification delivery, provider reconciliation, and maintenance. Production infrastructure must provide durable persistence and idempotency; the in-memory scheduler/queue implementations are test/dev adapters only.

## Boundary rule

A workflow should declare and configure capabilities. It should not independently implement storage, malware scanning, model routing, official-form requirement logic, recipient authority lookup, privacy-release review, PDF generation, packet hashing, attestation semantics, pricing, Stripe state, mailing submission, notification delivery, retries, audit storage, host scheduling, proof hashing, or acceptance simulation.

Provider-specific production adapters can remain in the canonical application/Studio deployment layer while provider-neutral contracts and invariants live in packages. This keeps secrets and infrastructure configuration centralized without duplicating runtime logic across workflows.

## Legacy migration rule

`apps/**` is inspection-only. When a useful legacy concept is found:

1. identify the smallest reusable contract or invariant;
2. copy/generalize it into the correct new package;
3. remove stale workflow-specific assumptions and unverified rule data;
4. add focused tests;
5. make a canonical new-architecture workflow consume the shared capability;
6. leave the legacy implementation untouched.

This is the required migration pattern for future workflow factory work.
