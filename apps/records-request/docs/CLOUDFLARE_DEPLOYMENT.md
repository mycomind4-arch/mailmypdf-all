# Cloudflare Deployment Contract

## Required bindings

The application expects a Cloudflare D1 binding named `RECORDS_DB`.

The binding must point to the production database containing `database/schema.sql`.
Do not commit a real database ID or secret into this repository.

## Required environment controls

`MAILMYPDF_FULFILLMENT_ENABLED=true` may only be enabled after the authenticated MailMyPDF adapter is configured and smoke-tested.

The application intentionally treats a missing `RECORDS_DB` binding as a configuration error rather than falling back to in-memory persistence.

## Deployment sequence

1. Provision a D1 database for Records Requests.
2. Apply `database/schema.sql` to the target database.
3. Configure `RECORDS_DB` in the Cloudflare deployment runtime.
4. Verify durable create, approval, and transition writes against the test environment.
5. Configure MailMyPDF credentials through the deployment secret manager.
6. Set `MAILMYPDF_FULFILLMENT_ENABLED=true` only after the fulfillment smoke test passes.
7. Run the end-to-end flow: validate → persist → review → approve → submit → tracking/proof.

## Certification rule

A deployed environment cannot be considered production-ready while the D1 binding or MailMyPDF fulfillment configuration is missing. UI rendering and static route success are not evidence of durable execution.
