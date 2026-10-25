# MailMyPDF Application Topology

Updated: 2026-10-08

## Canonical repository layout

The single TanStack Start host is **`mailmypdf/`**. The public product sections
are **top-level directories** with their own `config.ts`, `index.tsx`, and
`workflows/` trees. Their IDs and availability are defined by
[`mailmypdf/src/lib/section-registry.ts`](mailmypdf/src/lib/section-registry.ts),
not by a second hard-coded registry in this document.

The 15 currently registered canonical section roots are:

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

`packages/*` owns reusable infrastructure and capabilities, including
`@mailmypdf/step-workflow` for workflow execution, documents, intelligence,
security, pricing, payments, fulfillment, shared design and factory tooling.
Do not create a separate per-section host application, deployment, workflow
runtime, or copy of a shared platform engine.

## Routing, catalog and execution

The host owns `mailmypdf/src/routes/**`, including each section route
`mailmypdf/src/routes/<section>/index.tsx`. Public URLs resolve from the
canonical section root, for example:

- `/appeal-mail` → `appeal-mail/config.ts`
- `/notice-respond` → `notice-respond/config.ts`
- `/records-request` → `records-request/config.ts`
- `/secured-transactions` → `secured-transactions/config.ts`

The `section-registry.ts` status and execution-state metadata deliberately
distinguish a published catalog entry from a truly executable workflow. Being
listed in the section catalog does **not** imply that a workflow is complete or
that a provider-backed mailing or payment has been tested.

## Legacy compatibility versus source of truth

The old `apps/mailmypdf/**` host tree and `apps/verticals/**` application
shells are **not** canonical destinations for new product code. Some legacy
packages may still appear in `pnpm-workspace.yaml` or be consumed as explicit
compatibility dependencies during migration. Such references are not authority
to create new application shells or move canonical sections back there.

Migration should preserve useful domain logic and tests, port it into the
top-level section or suitable `packages/*` package, wire it through the
single host, and remove legacy donors only after parity and behavior checks.

The standing execution UI standard is `@mailmypdf/step-workflow`; read
[`AGENTS.md`](AGENTS.md) and run
`node scripts/check-step-workflow-execution.mjs` before modifying any
workflow's `start/` UI.

## Enforced verification

Run:

```sh
node scripts/verify-product-topology.mjs
node --test scripts/workflow-registry-topology.test.mjs
node scripts/check-step-workflow-execution.mjs
```

The topology verifier checks the 15 registry entries, real top-level section
directories, live TanStack route mounts and workflow registry invariants.
The workflow-execution check protects against reintroducing bespoke or
legacy-only starts. Neither substitutes for release gates or provider E2E
verification.

The application may use the deployed Cloudflare Worker origin while a
canonical custom hostname is configured. Hostname choice does not change the
repository architecture; all sections remain paths under the same app.
