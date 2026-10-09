# Studio shared-engine integration

This branch connects the existing `@mailmypdf/*` capability registry to the
Studio visual builder, and adds an administrator-only Engine Workbench.

## Locations

- `/studio` — admin command center
- `/studio/builder` — visual workflow builder with the canonical capability catalog
- `/studio/engines` — engine catalog and read-only execution workbench
- `GET /api/studio/engines` — admin-authenticated catalog of registered and runnable engines
- `POST /api/studio/engines` — admin-authenticated, allowlisted direct engine execution
- `POST /api/studio/run` — existing local-development phase runner, now executing bound deterministic engine IDs instead of reporting fake completions

## Bound read-only engines (phase and workbench)

1. Name normalization and comparison (identity-capacity).
2. Source authority scoring (identity-capacity).
3. Authoritative name evidence resolution (identity-capacity).
4. Entity classification (identity-capacity).
5. Workflow capability dependency resolution (workflows).
6. Fact contradiction detection (intelligence).
7. Deadline arithmetic using a user-supplied rule (intelligence).
8. Duplicate-charge candidate screening (intelligence).
9. Exhibit index generation (packet-builder).
10. Secured-transaction evidence eligibility (secured-transactions).

The workbench accepts administrator-supplied JSON, never obtains real records
on its own, and does not persist inputs or results. Its examples are demo data.

## Capability statuses

The builder's capability selection comes directly from the existing canonical
registry and includes legacy aliases for previously saved Studio drafts.
A package-level `implemented` or `production` status is **not** interpreted
as a Studio handler. Only explicitly allowlisted Studio operations can execute.
Other deterministic capabilities report a blocked trace rather than a
fabricated success event. Consequential external services remain held for
approval and do not execute in the Studio runner.

## Remaining work

- Connect each other existing package through a typed adapter and genuine
  per-matter input contracts; add package-level and host-level acceptance tests.
- Connect provider-backed identity proofing, signatures, notarization, registry
  searches, and e-filing only after credentials, scope, audit, and review gates.
- Replace local browser-only workflow publication with verified deployable
  runtime bindings where appropriate; do not equate draft publication with
  production execution.
- Establish cross-phase data propagation, durable matters, and per-engine
  usage/observability before using these as unattended background agents.
- Run host build, Studio route checks, and full regression tests in CI before
  deployment.

Do not attach payment, mail, filing, or privileged data APIs to the workbench.
The runtime is deliberately allowlisted and side-effect-free.
