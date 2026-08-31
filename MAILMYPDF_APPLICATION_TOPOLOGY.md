# MailMyPDF Application Topology

## Canonical repository layout

`apps/mailmypdf` is the canonical MailMyPDF host application.

All product verticals live beneath `apps/verticals/<vertical>` in this repository. They are no longer represented as first-class top-level applications at `apps/<vertical>`.

Current verticals:

- appeal-mail
- benefits-appeal
- claim-proof
- code-enforcement
- dispute-mail
- immigration-mail
- insurance-claims
- notice-respond
- permit-reply
- private-office
- records-request
- small-business
- tenant-reply

## Deployment rule

The repository is the source of truth for the MailMyPDF ecosystem. Vertical applications are path-addressable product modules and must not introduce separate canonical public domains.

The public hostname is intentionally not hard-coded here because MailMyPDF does not yet have a confirmed production domain. When the hostname is established, path routing should map the vertical slug to the corresponding application under the same host.

Examples:

- `/` -> `apps/mailmypdf`
- `/appeal-mail/*` -> `apps/verticals/appeal-mail`
- `/benefits-appeal/*` -> `apps/verticals/benefits-appeal`
- `/claim-proof/*` -> `apps/verticals/claim-proof`
- `/code-enforcement/*` -> `apps/verticals/code-enforcement`
- `/dispute-mail/*` -> `apps/verticals/dispute-mail`
- `/immigration-mail/*` -> `apps/verticals/immigration-mail`
- `/insurance-claims/*` -> `apps/verticals/insurance-claims`
- `/notice-respond/*` -> `apps/verticals/notice-respond`
- `/permit-reply/*` -> `apps/verticals/permit-reply`
- `/private-office/*` -> `apps/verticals/private-office`
- `/records-request/*` -> `apps/verticals/records-request`
- `/small-business/*` -> `apps/verticals/small-business`
- `/tenant-reply/*` -> `apps/verticals/tenant-reply`

## Shared platform boundary

Cross-vertical capabilities belong in `packages/*`, especially payment, fulfillment, pricing, AI, document intelligence, workflow runtime/factory, and shared design-system code. A vertical may contain domain-specific workflows and UI, but should not recreate platform contracts locally.

## Migration intent

This topology consolidates the previously scattered vertical roots without deleting their implementation history. The existing vertical trees are moved intact under `apps/verticals`, while the former `apps/core` tree becomes `apps/mailmypdf`.
