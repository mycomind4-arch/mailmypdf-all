# Vertical root migration

Status: planned from the 2026-09-21 inventory. This plan supersedes the old
assumption that `apps/verticals/*` is the permanent production location. The
user-directed target is to remove `apps/verticals` completely after every
vertical has a verified destination.

## Target topology

```text
mailmypdf/                 # MailMyPDF host, shared routing, auth, admin
studio/                    # independent Studio app and factory controls
<vertical>/                # one top-level product source per vertical
packages/                  # shared contracts and platform capabilities
```

The existing top-level vertical directories are the destination candidates.
`private-office/` must be created. A destination is allowed to replace an
existing directory only after its current files have been inventoried and
classified; same-name files are never overwritten by a bulk copy.

## Preservation rules

1. Freeze the legacy tree before each vertical migration. Do not edit the
   source while its inventory is being reviewed.
2. Record every tracked and untracked source file, its SHA-256, and its
   disposition: move, merge, generalize, preserve as fixture, or discard with
   a reason.
3. Make a local pre-migration archive and a Git tag before the first deletion.
   The archive is a recovery aid; the ledger and Git history remain the source
   of truth for the migration.
4. Merge by file and review collisions. Preserve the destination file and
   source file when their behavior differs; resolve the contract explicitly.
5. Update workspace globs, package imports, route registries, scripts,
   acceptance fixtures, documentation, and generated route trees only after
   the destination builds from its new location.
6. Run the source and destination focused checks, then host typecheck/build,
   route/auth checks, and the affected workflow acceptance tests.
7. Delete a source vertical only when its ledger row is complete, no active
   import points at it, and the destination checks pass from a clean install.
8. Delete `apps/verticals/` last, after a repository-wide reference scan is
   clean. Never use a recursive delete to force the final state.

## Migration order

Start with the smallest, already-migrated product roots and finish with the
largest and most coupled applications:

1. `claim-proof` → `claim-proof/`
2. `permit-reply` → `permit-reply/`
3. `tenant-reply` → `tenant-reply/`
4. `legal-defense` → `legal-defense/`
5. `benefits-appeal` → `benefits-appeal/`
6. `code-enforcement` → `code-enforcement/`
7. `insurance-claims` → `insurance-claims/`
8. `records-request` → `records-request/`
9. `small-business` → `small-business/`
10. `dispute-mail` → `dispute-mail/`
11. `immigration-mail` → `immigration-mail/`
12. `notice-respond` → `notice-respond/`
13. `appeal-mail` → `appeal-mail/`
14. `private-office` → `private-office/`

The order is a risk-control sequence, not a claim that the existing
top-level directories are already complete. Each row needs its own inventory
and verification entry in `context/MIGRATION_PRUNE_LEDGER.md`.

## Completion gate

The migration is complete only when:

- every vertical has a top-level source with all useful behavior, tests,
  assets, migrations, and documentation accounted for;
- `pnpm-workspace.yaml`, agent path resolution, registries, and docs contain no
  active `apps/verticals` references;
- `pnpm install --lockfile-only`, focused vertical checks, host typecheck and
  build, and the relevant acceptance checks pass;
- `apps/verticals` is empty and then removed as a separate reviewed change;
- the final diff and the migration ledger show what moved, what was merged,
  and what was intentionally retired.

## Studio boundary

Studio is migrated independently from the verticals. Its source of truth is
the standalone `studio/` app. MailMyPDF Admin links to Studio as a separate
administrator tool. No vertical owns Studio routes, machine file access,
agent controls, publishing adapters, or Studio authoring state. Product
verticals may consume a reviewed published workflow contract through shared
packages or a stable release boundary.
