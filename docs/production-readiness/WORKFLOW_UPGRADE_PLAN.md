# Workflow Upgrade Plan

## Rules

Keep only after end-to-end certification. Polish only after execution is certified. Harden when the core path exists but controls or deployment proof are missing. Upgrade when domain stages or integrations are missing. Migrate bespoke routes to the canonical runtime. Rebuild only if migration cannot preserve data. Consolidate duplicates before expanding the catalog. Defer everything outside the launch set.

## Plans

- Core mailing, 7 profiles: HARDEN. Select one direct-PDF flow and verify auth, durable order, immutable approved artifact, server quote, Stripe webhook, Lob submission, tracking, proof, receipt, refund, recovery, and duplicate protection.
- CP2000: HARDEN. Wire approval to approveWorkflow, register the missing mail route, certify provider path, and test save/resume/ownership/invalidation.
- Notice remainder, 14 profiles: DEFER until each domain pack and route is real.
- Credit Report: HARDEN. Finish approval/submission predicates, payment/fulfillment, tracking/proof, and deployed verification.
- Appeal Mail, 35 profiles: HARDEN/MIGRATE. Register each production workflow with the factory and certify owner-scoped approval, versioning, Stripe, Lob, tracking, and proof individually.
- Immigration, 19 profiles: MIGRATE. Move draft-only routes to the document-action runtime and add verified checkout/provider submission.
- Small Business, 5 profiles: HARDEN. Connect Gold runner to executor, persistent storage, authenticated scheduling, provider credentials, carrier webhooks, proof storage, and team permissions.
- GovReply: UPGRADE. Connect runner, persistence, fulfillment, tracking, and proof.
- Benefits Appeal, 23 profiles: UPGRADE. Reconcile pricing names with actual routes and wire shared appeal runtime, evidence provenance, approval, mail, and proof.
- Private Office, 5 profiles: UPGRADE. Complete matter persistence, authorization, payment evidence, provider fulfillment, and deployed smoke tests.
- Records Requests, 13 profiles: HARDEN/CONSOLIDATE. Treat generic records-request as the candidate; verify D1 deployment, approval resolver, webhooks, and provider credentials.
- Code Enforcement, 14 profiles: UPGRADE. Connect property/jurisdiction runtime and runner to the real executor, then certify fulfillment/tracking/proof.
- Tenant, Permit, and Insurance catalog: DEFER. Hide until real runtime paths exist.

## Consolidation

Reconcile gov-reply versus govreply, permit-response versus permit-reply, private-office IDs, and duplicate appeal concepts before exposing more names.

