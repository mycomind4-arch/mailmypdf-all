# MailMyPDF Application Topology

Updated: 2026-09-19

## Canonical architecture

`apps/mailmypdf/` is the single MailMyPDF host application.

Product sections are canonical **top-level section roots**. Shared cross-section functionality belongs in `packages/*`.

```text
apps/mailmypdf/                # single host application

appeal-mail/                   # canonical section root
benefits-appeal/
claim-proof/
code-enforcement/
dispute-mail/
immigration-mail/
insurance-claims/
legal-defense/
notice-respond/
permit-reply/
private-office/
records-request/
secured-transactions/
small-business/
tenant-reply/

packages/                      # shared platform capabilities
apps/verticals/                # legacy donor / compatibility trees only
```

Do not create new product implementations under `apps/verticals/**`. Existing trees there may remain temporarily because migration is incomplete and some runtime consumers still depend on them. Treat them as donors or explicit compatibility dependencies, not as the destination for new architecture work.

## Section activation state

A canonical top-level section does **not** need to be a fully activated workspace package yet. This distinction is intentional.

Currently activated top-level workspace packages:

- `appeal-mail/` → `@mailmypdf/appeal-mail`
- `immigration-mail/` → `@mailmypdf/immigration-mail`
- `notice-respond/` → `@mailmypdf/notice-respond`
- `records-request/` → `@mailmypdf/records-request`
- `secured-transactions/` → `@mailmypdf/secured-transactions-section`

The remaining canonical section roots are migration targets/scaffolds until their top-level package/runtime implementation is activated.

## Routing rule

All products live under the same MailMyPDF host. Public routes address the canonical section by slug, while `apps/mailmypdf` owns deployment and routing.

Examples:

- `/` → MailMyPDF host
- `/appeal-mail/*` → canonical Appeal Mail section
- `/notice-respond/*` → canonical Notice Respond section
- `/records-request/*` → canonical Records Request section
- `/secured-transactions/*` → canonical Secured Transactions section

A route must not imply that `apps/verticals/<section>` is the canonical destination. If the host still imports a legacy workspace package for a section, document that as a temporary compatibility dependency and migrate it deliberately.

## Shared platform boundary

Reusable capabilities belong in `packages/*`, including:

- security and ownership boundaries
- document intake/storage/scanning
- document intelligence
- AI execution
- facts/evidence/provenance/findings
- workflow manifests/runtime/gates/review
- workflow UI
- packet/PDF generation
- pricing/payments
- fulfillment/mailing
- identity/capacity and registry adapters
- acceptance/certification

A section contains only the domain-specific workflows, configuration, rules, prompts, assets, authority, adapters, and tests that make it unique. Do not rebuild a mini platform inside a section.

## Legacy donor rule

`apps/verticals/**` remains readable while migration requires it.

When useful behavior exists only there:

1. inspect and understand it;
2. copy/generalize reusable behavior into the correct shared package or canonical top-level section;
3. verify the new implementation;
4. update migration records;
5. retire the donor dependency only when nothing active still relies on it.

Do not add a new top-level feature to `apps/verticals/**` merely because a legacy implementation already exists there.

## Verification

`scripts/verify-product-topology.mjs` verifies the canonical top-level section roots. It may report legacy donor directories for visibility, but legacy donor presence is not evidence that those directories are canonical.

The repository is mid-migration until the host, CI, docs, and runtime dependencies all agree on this topology.
