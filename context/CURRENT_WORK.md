# Current Work — MailMyPDF migration

Updated: 2026-09-19

## Active user-directed architecture

MailMyPDF has one host application and canonical top-level product sections.

- Host: `apps/mailmypdf/`
- Canonical section roots: top-level `<section>/` directories
- Shared cross-workflow capabilities: `packages/*`
- Legacy donor / compatibility code: `apps/verticals/*`

**Never create new architecture functionality under `apps/verticals/**` unless the user explicitly changes this direction.** Existing legacy code may still be read and may still be consumed temporarily where migration is incomplete.

The old statement that all verticals canonically live under `apps/verticals/<vertical>` is stale.

## Canonical section inventory

The current canonical top-level sections are:

- `appeal-mail/`
- `benefits-appeal/`
- `claim-proof/`
- `code-enforcement/`
- `dispute-mail/`
- `immigration-mail/`
- `insurance-claims/`
- `legal-defense/`
- `notice-respond/`
- `permit-reply/`
- `private-office/`
- `records-request/`
- `secured-transactions/`
- `small-business/`
- `tenant-reply/`

Currently activated top-level workspace packages:

- `appeal-mail/`
- `immigration-mail/`
- `notice-respond/`
- `records-request/`
- `secured-transactions/`

Other top-level section roots remain canonical migration targets even when they are still scaffolds and even when the host temporarily consumes an `apps/verticals/**` compatibility package.

## Core architecture rule

A workflow should contain only the domain-specific logic, forms, prompts, rules, configuration, assets, authority, adapters, and tests that make it unique.

Reusable infrastructure belongs in shared packages. Prefer extending an existing shared capability over copying it into a section.

## Current goal

Make the new architecture the single source of truth and finish the migration without losing useful implementation behavior.

For each legacy donor dependency:

1. inventory the donor behavior and active consumers;
2. compare it with the canonical top-level section and shared packages;
3. classify each unique item as:
   - migrate to the canonical section,
   - generalize into a shared package,
   - preserve as a test/fixture/reference,
   - or retire as obsolete/stale/duplicated;
4. migrate the useful material;
5. verify the destination and affected contracts;
6. record the disposition in `context/MIGRATION_PRUNE_LEDGER.md`;
7. remove the donor dependency only when active consumers have moved.

Never delete a donor subtree merely because similar files exist elsewhere. Account for runtime behavior, tests, assets, schemas, prompts, authority/safety rules, auth/ownership logic, payment/fulfillment behavior, and acceptance fixtures first.

## Workflow execution rule

Authenticated execution must use the shared execution registry and top-level workflow implementations. It must not silently fall back to `apps/verticals/**`.

A workflow is not production-ready merely because it has a directory, manifest, route, or UI. Distinguish placeholder, wired, certified, and production-hosted states truthfully.

## Current reference areas

### Appeal Mail

- canonical section: `appeal-mail/`
- reference workflow: `appeal-mail/workflows/appeal-ssdi-denial/`
- legacy donor: `apps/verticals/appeal-mail/`

### Secured Transactions

- canonical section: `secured-transactions/`
- shared domain package: `packages/secured-transactions/`
- shared identity/capacity support: `packages/identity-capacity/`
- shared registry adapters: `packages/registry-adapters/`
- pipeline: `P11_SECURED_TRANSACTION`
- do not create `apps/verticals/secured-transactions`

## Migration completion condition

The migration is not complete until:

- topology docs and CI point to the top-level sections;
- the host routes/navigation/execution registry use the canonical sections;
- active `apps/verticals/**` runtime dependencies are retired or explicitly isolated as compatibility adapters;
- a clean install/build can exercise representative new-architecture workflows end to end.
