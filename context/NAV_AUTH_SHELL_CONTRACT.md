# MailMyPDF Navigation, Authentication & Shell Contract

Status: seed version, 2026-09-14. Rows marked VERIFIED were checked directly
against code. Rows marked NEEDS AUDIT are unverified — treat as unknown, not
as passing or failing. This file is the ground truth an agent checks a page
against before saying "this workflow is perfect." Keep entries dated.

## 1. How to use this file

Before auditing or fixing a page: find its route here (or its vertical's
pattern). If the row says VERIFIED, that's the target — deviations are bugs.
If NEEDS AUDIT, verify shell/auth/links first, record the correct answer as a
new VERIFIED row (with today's date and evidence, e.g. a file path), then fix
deviations. Never mark a row VERIFIED from memory or from an agent's summary —
only from reading the actual route/component files or exercising the route.

## 2. The three canonical shells

### Public shell
Required: MailMyPDF logo/home, Products, Workflows, How It Works, Mail a PDF,
Sign In, one primary CTA. Must NOT render `AuthenticatedSidebar`, account
controls, admin controls, or private data.
Reference implementation: `apps/mailmypdf/src/components/site-chrome.tsx`
(`SiteHeader`/`SiteFooter`).

### Authenticated shell
Required: `EcosystemShell` wrapping `AuthenticatedSidebar`
(`apps/mailmypdf/src/components/ecosystem-shell.tsx`,
`apps/mailmypdf/src/components/authenticated-sidebar.tsx`). Sidebar must stay
mounted across dashboard, matters, workflows, workflow steps, account, and
completed-workflow pages — a route that intentionally leaves it (a focused
workflow mode) must say so here explicitly, not by accident.
Auth guard: `apps/mailmypdf/src/routes/_authenticated/route.tsx` —
`beforeLoad` redirects to `/auth?redirect=<current href>` when
`supabase.auth.getUser()` has no user. This is the only place session
presence should be checked; do not re-implement it per route.

### Admin shell
Authenticated shell plus admin-only navigation/tools. Role source of truth is
the `user_roles` table, checked server-side only
(`apps/mailmypdf/src/lib/admin.functions.ts: assertAdmin`), via the
server-only `supabaseAdmin` client. **Never** trust `user_metadata` or
`app_metadata` for role — both are user-editable or otherwise not
authoritative for this check (see `ecosystem-shell-config.ts:29-31`, which
explicitly excludes `role` from profile metadata for this reason).

## 3. Verified findings (evidence-backed, as of 2026-09-14)

- **Auth guard is centralized correctly.** One `beforeLoad` in
  `_authenticated/route.tsx`, one redirect pattern, preserves destination via
  `search.redirect`. Do not add a second auth check elsewhere in core.
- **Admin authorization is server-side and correct** in
  `apps/mailmypdf/src/lib/admin.functions.ts` and `admin-*.functions.ts` —
  every admin server function calls `assertAdmin`/checks `user_roles`
  independently. Good: even if UI-level gating is missing on a route, data
  stays protected.
- **Admin route UX gap (not a security hole):**
  `_authenticated/admin/index.tsx` has no `beforeLoad` admin check of its own;
  a non-admin authenticated user reaches the tab chrome before individual
  data calls throw "Forbidden." Fix: add a route-level admin check that
  redirects/shows an intentional "not authorized" screen instead of letting
  data calls fail one at a time.
- **Shell is NOT consistent across core `_authenticated/*` routes** — verified
  by direct inspection, three different treatments exist side by side:
  - `_authenticated/dashboard` → `EcosystemShell` + `AuthenticatedSidebar` (canonical)
  - `_authenticated/admin/*` → own `AdminHeader`, no sidebar
  - `_authenticated/legal-defense/*` → fully bespoke dark-theme chrome, no shared shell, no sidebar
  This is the P1 "stable shell" item from `FACTORY_STATUS.md`. Resolve by
  deciding, explicitly, whether admin and legal-defense should adopt
  `EcosystemShell` or whether they are deliberate exceptions — then record
  the decision here. Do not silently leave three patterns.
- **Verticals largely do not use the core app's shell at all.** e.g.
  `apps/verticals/appeal-mail/src/routes/*` import their own local
  `SiteHeader`/shell components, not `apps/mailmypdf`'s. This is the "shell
  copies exist in verticals" duplication noted in `FACTORY_STATUS.md`.
  NEEDS AUDIT per vertical: does each vertical's local shell match the public
  shell's required elements above? Does each vertical's authenticated area
  use an equivalent of `AuthenticatedSidebar`, or none at all?
- **`appeal-reply.tsx` legacy redirect was broken, now fixed** (commit
  `a2f1cab`): `/solutions/appeal-reply` → `/appeal-reply` (was pointing at a
  dead `/appeal-mail` route). Pattern to check for elsewhere: any
  `redirect({ to: "..." })` whose target string isn't a live route.
- **Incomplete vertical rename discovered, NOT yet resolved (flagged, left for
  a decision):** `apps/mailmypdf/tests/vertical-routing-integrity.test.mjs`'s
  own `canonicalRoutes` map — and a separate uncommitted working-tree edit to
  `apps/mailmypdf/src/verticals/registry.ts` — both expect the appeal
  vertical's canonical route to be `/appeal-mail` (and, same pattern,
  Notice Respond → `/notice-respond`, Small Business → `/small-business`).
  None of those three routes exist as real pages — only `/appeal-reply`,
  `/notice-response`, and `/small-business-mail` exist in
  `routeTree.gen.ts`. This predates the current session (the test alone,
  with today's registry edit reverted, already fails 2/5 against committed
  `main`). Completing it means renaming the actual route files plus updating
  ~8 files that reference the old path strings (`vertical-landing.tsx`,
  `ecosystem.ts`, `workflow-navigation.ts`, `master-public-routes.ts`,
  `routes/index.tsx`, `solutions.tsx`, plus the alias) and regenerating
  `routeTree.gen.ts` — real navigation blast radius, not a one-line fix.
  Until resolved, `git stash`/inspect the uncommitted `registry.ts` change
  before trusting `vertical-routing-integrity.test.mjs`'s pass/fail as
  ground truth for these 3 verticals.
- **9 public SEO catch-all routes fail typecheck** (pre-existing, not caused
  by recent work): `benefits/$.tsx`, `business/$.tsx`, `claim/$.tsx`,
  `future/$.tsx`, `mail/$.tsx`, `notice/$.tsx`, `permit/$.tsx`,
  `records/$.tsx`, `tenant/$.tsx` all call
  `<WorkflowAuthorityPage product=... workflowSlug=... pipeline=... />`
  against a component whose props were refactored to `{ page }` in commit
  `1cdc9c33`. These are likely broken/blank in production right now.

## 4. Route × role × shell matrix

Format: `route pattern | public | authenticated user | admin | shell | status`

| Route | Public | Auth user | Admin | Expected shell | Status |
|---|---|---|---|---|---|
| `/` (mailmypdf home) | ✓ | ✓ | ✓ | Public shell | NEEDS AUDIT |
| `/dashboard` | redirect→/auth | ✓ | ✓ | Authenticated shell (sidebar) | VERIFIED |
| `/admin`, `/admin/*` | redirect→/auth | 403 (data-level) | ✓ | Admin shell — currently AdminHeader only, no sidebar; needs explicit decision | VERIFIED (gap noted above) |
| `/legal-defense` (public landing) | ✓ | ✓ | ✓ | Public shell | VERIFIED (fixed in `86c39c8`) |
| `/legal-defense/workflows/$workflowId/start` | redirect→/auth | ✓ | ✓ | Bespoke chrome (no shared shell/sidebar) — record as deliberate or fix | VERIFIED, needs decision |
| `/solutions/appeal-reply` (legacy alias) | → `/appeal-reply` | → `/appeal-reply` | → `/appeal-reply` | N/A (redirect only) | VERIFIED (fixed) |
| `/benefits/$`, `/business/$`, `/claim/$`, `/future/$`, `/mail/$`, `/notice/$`, `/permit/$`, `/records/$`, `/tenant/$` | ✓ (broken — TS error) | ✓ | ✓ | Public shell via `WorkflowAuthorityPage` | VERIFIED BROKEN — fix props mismatch from `1cdc9c33` |
| Every `apps/verticals/*` public route | ✓ | ✓ | ✓ | Vertical's local shell — audit against Public shell requirements above | NEEDS AUDIT (per vertical) |
| Every `apps/verticals/*` authenticated route | redirect→/auth | ✓ | ✓ | Vertical's local authenticated shell — audit against Authenticated shell requirements | NEEDS AUDIT (per vertical) |
| `apps/verticals/appeal-mail` `/admin` | ? | ? | ? | Unknown whether it reuses core's `assertAdmin` pattern or reimplements role check | NEEDS AUDIT — priority, since a reimplemented admin check is a likely place for a role-trust bug |

Extend this table one vertical/workflow at a time. A row only becomes
VERIFIED after someone (human or agent) actually reads the route file(s) or
exercises the route — not from the workflow catalog's self-reported status
badge (Studio's own catalog status is a claim, not proof; see
`FACTORY_STATUS.md`'s P2 item on this).

## 5. Non-negotiables (apply regardless of profit/efficiency pressure)

These are boundaries, not preferences. An agent (or swarm) optimizing for
conversion, speed, or cost must never cross them, and must ask a human rather
than interpret its way around one:

1. **Accuracy and required human-review gates are never traded for speed or
   conversion.** A workflow's approval/review gate (see `studio-workflow.ts`
   gate types) is not something profit-optimization is allowed to shorten,
   skip, or auto-approve.
2. **Role/authorization checks are server-side only, against `user_roles`,
   never against user-editable metadata.** No exceptions, no "just for this
   one admin tool."
3. **No autonomous privilege escalation.** The system may propose that a
   capability be added to what admin can do; a human approves each addition.
   The system never grants itself or any account broader access on its own
   judgment.
4. **No dark patterns in pursuit of conversion** — no harder-to-cancel flows,
   no deceptive pricing/upsell timing, no manipulating a customer into a
   workflow or purchase they didn't intend.
5. **Sensitive personal data (immigration status, medical/court records,
   financial disputes) retention/handling rules are fixed, not something
   "improved" for growth.**
6. **A human always has final authority and an always-available stop/revert.**
   No change this system makes to itself should be irreversible without a
   human's active choice.
7. **Publishing is staged, not direct-to-production.** Anything the system
   generates or changes (a new workflow, a nav change, a copy change) goes
   through the existing verification path (typecheck/build/acceptance tests)
   before it's live, per `AGENTS.md`'s repair loop and
   `context/CONTEXT_POLICY.md`.

## 6. Permission-graduation policy

Default posture: ask before acting on anything with a real effect (publish,
push, spend money, change pricing, touch a customer-facing flow beyond a
scoped bug fix).

When the same category of question has been asked and answered the same way
repeatedly, the system may ask, once, whether that specific category can be
autonomized going forward (e.g. "may I auto-fix broken internal links without
asking each time?"). It must:
- name the exact category being requested,
- state what it would then do without asking,
- wait for an explicit yes,
- and log the grant here (with date and category) so it's inspectable and
  revocable later.

It must never infer a broader autonomy grant than what was explicitly asked
and approved, and never re-ask to reclaim something the human said no to
without new information.

### Granted autonomy log
(empty — nothing has been autonomized yet)

## 7. Maintenance

Treat like `CURRENT_STATE.md`: update the affected rows after a real change,
date them, and link evidence (commit hash or file path) rather than
restating old claims. This file is expected to grow the route matrix
incrementally as the audit/repair loop touches each vertical — it is not
meant to be completed in one pass.
