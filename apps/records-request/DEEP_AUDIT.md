# Records Requests Deep Audit

## Scope

Audited the `main` application architecture before the workflow-foundation pass. The repository had strong primitives for lifecycle state, document integrity, MailMyPDF fulfillment, webhook signing, D1 persistence, and Gold Standard workflow contracts, but several pieces were disconnected from the real application lifecycle.

## P0 findings addressed in this branch

- Request creation was only validation-facing; durable creation is now exposed through `POST /api/requests`.
- D1 was declared in Wrangler but the application runtime had no canonical OpenNext binding bootstrap; `getRequestStateRepositoryAsync()` now obtains `RECORDS_DB` from `getCloudflareContext()`.
- Request creation now supports D1 batch execution and owner binding.
- Requests now have an owner boundary and list queries are owner-scoped.
- `validated -> review` is now an authenticated, owner-checked transition.
- Approval now checks request ownership in addition to approval role.
- Audit event hashes are now SHA-256 values chained to the previous event hash.
- MailMyPDF webhook events now have a durable provider/event uniqueness boundary.
- The dashboard no longer presents fabricated request metrics or fake cases.

## Remaining engineering work

### P0 / before production

- Wire the real identity provider into `installApprovalAuthorizationResolver()`.
- Provision real D1 database IDs in deployment environments.
- Verify the deployed Worker can execute migrations.
- Add a durable fulfillment-attempt/idempotency table for outbound submissions, not only provider callback events.
- Make every state-changing operation ownership-aware at the repository/domain boundary, not only at selected routes.
- Add a true end-to-end deployment test covering create → review → approve → attest → submit → webhook.
- Add CI certification on pull requests and main.

### P1 / workflow platform

- Add versioned jurisdiction policy packs.
- Add workflow-specific validation extension points to the request runtime.
- Expand the workflow factory into the complete platform contract: persistence, authorization, audit, document, fulfillment, tracking, evidence, findings, actions, and SEO.
- Build production/evidence ingestion and evidence-backed finding primitives.
- Make workflow landing pages launch workflow-specific intake rather than a generic dashboard CTA.

### P2

- Production audit UX.
- Rich communications/timeline UI.
- Workflow analytics and observability.
- Additional jurisdiction packs and workflow catalog expansion.

## Architectural decision

Do not rewrite the Records Requests platform. Preserve the existing D1 repository, document attestation, MailMyPDF adapter, authorization boundary, workflow metadata, and Gold Standard concepts. Finish the connections between those components and keep individual workflows responsible for domain intelligence rather than infrastructure.
