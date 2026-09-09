# Standalone Repository Reconciliation — 2026-09-08

## Purpose

`mailmypdf-all` is the canonical source of truth for MailMyPDF application code. This reconciliation audits standalone vertical repositories for work performed after consolidation and selectively migrates only behavior that is still desirable and not already superseded by newer monorepo architecture.

The migration rule is intentionally conservative:

1. Do not copy whole standalone trees.
2. Preserve current monorepo authentication, pricing, fulfillment, shared packages, and one-host/path-based topology.
3. Prefer current monorepo implementations when they are newer or more secure.
4. Migrate missing behavior together with regression contracts.
5. Do not import obsolete cross-domain SSO or standalone deployment assumptions.

## Canonical destination

All retained production behavior belongs under `mailmypdf-all`:

- vertical apps: `apps/verticals/*`
- public host: `apps/mailmypdf`
- shared contracts/services: `packages/*`

Standalone repositories are reference sources only after this reconciliation merges and passes CI.

## Reconciliation matrix

| Standalone repository | Disposition | What was found | Canonical action |
|---|---|---|---|
| `mailmypdf-private-office` | **MIGRATED** | Substantial post-consolidation Capability Graph, state engine, workflow orchestrator, workflow groups/lifecycle, durable capability state, capability dashboard, and Debt Validation Dispute work | Ported selectively into `apps/verticals/private-office`; kept current monorepo auth/pricing/fulfillment; workflow-backed capabilities can only be granted by authoritative matter completion |
| `appeal-mail` | **MIGRATED / SUPERSEDED IN PART** | Authenticated case workspace, case stage contract, document context pipeline, case AI analyze/draft/revise flow; separate packet/fulfillment work | Restored the case workspace using bearer-authenticated owner-scoped API routes. Did **not** copy the standalone client-supplied `userId` trust boundary. Did **not** replace the newer monorepo packet/Stripe/fulfillment pipeline |
| `notice-respond` | **SUPERSEDED** | Auth/start gating and checkout hardening plus obsolete cross-domain SSO | Current monorepo checkout is materially stronger: immutable approval record, owner scope, mailing intent, quote snapshot, Stripe metadata, and hardened fulfillment. No standalone code imported |
| `records-requests` | **SUPERSEDED / CLEANUP DEBT** | Runtime bridge, deliberate pricing, and `property-permit-records` slug correction | Active TanStack app already contains newer runtime modules and canonical `property-permit-records`. Old Next.js `app/` tree still contains stale names but is not the active application; treat as dead-tree cleanup, not migration source |
| `benefits-appeal` | **SUPERSEDED** | Next.js/Vitest/build repair and obsolete SSO | Monorepo has since standardized on TanStack/Vite, current shared mailing/payment packages, zod, and current test tooling. No old repair imported |
| `mailmypdf-smallbusiness` | **SUPERSEDED** | TypeScript/build repairs (MailClass import, z.enum tuple, Postgres typing, environment types, interface extraction) plus obsolete SSO | Equivalent/better fixes already landed in `apps/verticals/small-business` on Sep. 5; no standalone import required |
| `dispute-mail` | **OBSOLETE-ONLY** | Post-consolidation standalone change was cross-domain SSO | Skip. Monorepo has substantially newer fulfillment and gating fixes |
| `immigration-mail` | **OBSOLETE-ONLY** | Post-consolidation standalone change was cross-domain SSO | Skip. Monorepo has substantially newer fulfillment/build fixes |
| `code-enforcement` | **OBSOLETE-ONLY** | Post-consolidation standalone change was cross-domain SSO | Skip. Canonical monorepo removed the abandoned Next/Base44 app and continued active TanStack development |
| `insurance-claims` | **OBSOLETE-ONLY** | Post-consolidation standalone change was cross-domain SSO | Skip. Keep canonical monorepo implementation |
| `gov-reply` | **OBSOLETE-ONLY** | Post-consolidation standalone change was cross-domain SSO | Skip. Do not restore multi-domain auth topology |
| `claim-proof` | **CONSOLIDATION/IDENTITY ONLY** | Identity/shell/directory corrections and `.gitignore` conflict cleanup | Canonical vertical already exists in the monorepo; no missing post-consolidation feature behavior found |
| `permit-reply` | **CONSOLIDATION/IDENTITY ONLY** | Identity/shell/directory corrections and `.gitignore` conflict cleanup | Canonical vertical already exists in the monorepo; no missing post-consolidation feature behavior found |
| `tenant-reply` | **CONSOLIDATION/IDENTITY ONLY** | Identity/shell/directory corrections and `.gitignore` conflict cleanup | Canonical vertical already exists in the monorepo; no missing post-consolidation feature behavior found |

## Private Office migration details

### Restored domain capabilities

The canonical Private Office app now contains the missing orchestration layer:

- `capability-graph.ts`
- `state-engine.ts`
- `workflow-orchestrator.ts`
- `requirement-rules.ts`
- `workflow-groups.ts`
- `workflow-group-engine.ts`
- `capability-lifecycle.ts`
- durable Supabase-backed capability state
- authenticated capability-state loading and reconciliation from completed matters
- authenticated `/capabilities` workspace surface

The pre-existing canonical `complete-matter.ts` boundary remains authoritative. A workflow-backed capability cannot be self-granted from the dashboard; it is created only after the owner-scoped matter reaches the canonical completed state.

Capability events remain in the dedicated `user_capability_events` persistence channel rather than being forced into the unrelated fixed `MatterEvent` enum/table.

### Restored Debt Validation workflow

`debt-validation-dispute` is restored as the sixth canonical Private Office Gold workflow with:

- workflow registry entry
- authority page route
- workflow profile
- capability mapping
- regression coverage

The migrated authority copy deliberately avoids asserting that a legal deadline or time-bar status applies without the underlying notice, dates, jurisdiction, and rule being verified.

### Privacy correction

`/capabilities` is an authenticated personal-state surface and is now `noindex,nofollow`. The standalone implementation's public-SEO posture was not carried forward.

## Appeal Mail migration details

### Restored case workspace

The canonical Appeal app now contains:

- private `/case/$caseId` route (`noindex,nofollow`)
- case workspace stage contract
- document-context contract
- authenticated case read endpoint
- authenticated case analysis endpoint
- authenticated case draft endpoint
- authenticated case revision endpoint
- client bearer-token fetch helper
- case workspace UI

### Security correction

The standalone case AI implementation accepted a client-supplied `userId`. That boundary was rejected during migration. The canonical port derives the owner from the authenticated bearer token (`requireUser(request)`) before loading or mutating the case.

### Packet and mailing behavior

The case workspace does not create a second packet or payment implementation. Packet assembly, locking/hashing, approval, Stripe processing, and MailMyPDF fulfillment remain delegated to the newer hardened monorepo pipeline.

## Explicitly rejected migration: cross-domain SSO

A synchronized Sep. 1 commit added hidden-iframe/session relay behavior across separate `*.pages.dev` vertical domains. That is incompatible with the canonical one-host/path-based architecture and is intentionally **not** migrated.

Do not reintroduce:

- `/auth/sso` domain relay topology
- `/auth/sso-silent` iframe session detection
- token propagation across standalone vertical domains
- standalone-domain callback assumptions

## Validation gates

This reconciliation adds a focused CI job to the existing Workspace UI verification workflow:

- Private Office capability reconciliation tests
- Private Office workflow registry tests
- Appeal Mail case workspace contract tests
- Appeal Mail document pipeline tests

The existing PR workflow still builds every canonical vertical, verifies product topology, and runs the workflow SEO authority gate.

## Archival / deletion rule

Do **not** delete a standalone repository solely because it appears in this document.

A standalone becomes an archive/delete candidate only after:

1. this reconciliation PR is green,
2. the reconciliation PR is merged to `main`,
3. the deployed monorepo version is verified for the migrated Private Office and Appeal Mail surfaces, and
4. no external deployment, webhook, secret, or automation still points at the standalone repository.

Prefer **archive first**. Deletion should happen only after the archived repository has served as a recovery reference for at least one verified production cycle or after an explicit backup/export is retained elsewhere.
