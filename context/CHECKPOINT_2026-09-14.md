# Checkpoint — 2026-09-14

Handoff for a fresh session continuing MailMyPDF/Private Office Studio work.
Read this, then `context/FACTORY_STATUS.md` for the live priority queue and
`context/NAV_AUTH_SHELL_CONTRACT.md` for nav/auth/shell ground truth, before
re-deriving anything from scratch.

## Goal

Repair MailMyPDF's public/authenticated/admin application per `AGENTS.md`'s
repair loop, then move Studio toward a supervised, eventually more
autonomous workflow factory. Long-term product direction:
`context/PROBLEM_TO_WORKFLOW.md`.

## Completed this session (commits, newest last)

All on `main`, pushed to `origin/main`, currently at `9224522`.

- `da66413` — seeded `context/NAV_AUTH_SHELL_CONTRACT.md`: route × role ×
  shell matrix, non-negotiables, permission-graduation policy
- `011102c` + `e3ddea8` — fixed 9 broken public workflow catch-all pages
  (stale `WorkflowAuthorityPage` props); corrected my own first attempt at
  the `/solutions/appeal-reply` alias fix after misreading a `tsc` error
- `5f8ee64` — **P0**: Studio's machine-control tools (GitHub sync, Cloudflare
  publish, agent launch) were reachable by any signed-in customer, not just
  admin. Now gated local-dev + same-origin only, self-enforcing test
- `eea1f96` — corrected Appeal Mail/Notice Respond/Small Business registry
  routes to match the rest of the app
- `d3021de` — **P0**: real, confirmed self-service admin privilege
  escalation in `appeal-mail`/`benefits-appeal` — both trusted the caller's
  own client-editable `user_metadata.role` before falling back to the safe
  `user_roles` table. Fixed, regression-tested (neither vertical had any
  test coverage on this before)
- `3a44b1c` — **P1**: open-redirect vulnerability in `/auth`+`/auth/confirm`,
  an auth-guard race condition, and header/sidebar trusting `user_metadata`
  for role
- `85b8a5d` — **P1**: records-request partial-production gap detection was
  silently under-reporting missing categories across ~30-50 of the
  vertical's ~85 workflow files (3 compounding bugs in shared matching
  engines) — a real accuracy bug, not cosmetic. 29 failing tests → 8
  (all 8 individually confirmed unrelated)
- `ddce5a5` — dev-agent-swarm never cleaned up a run/session's git worktree
  or branch after use — would have leaked unboundedly the first time it was
  actually run (it hasn't been, yet). Added cleanup, verified against
  disposable temp repos, never the real checkout

Also closed via regression checks with no code change needed: the
immigration-mail duplicate `TASK_ROUTING` declaration (`4846d8a` removed it;
`4618994` fixed one unrelated stale test it surfaced), and the Studio/PDF
reference-workflow verification (ran `car-insurance-appeal` through the real
acceptance engine, recorded as run `0005`).

## Verified evidence

Every commit above was typechecked and test-verified before landing — see
individual commit messages for exact commands/results, and
`context/FACTORY_STATUS.md`'s priority-queue table for the current
close/open status of each item with evidence pointers.

## Decisions made

- Treated `app_metadata.role` (server/service-role-only in Supabase) as
  safe, `user_metadata.role` as never-trustworthy — this distinction is now
  recorded in the contract as the concrete example to check for.
- Kept the vertical registry's `/appeal-mail`, `/notice-respond`,
  `/small-business` routes (not `/appeal-reply` etc.) — verified these match
  every other live reference in the app, including the legacy page stubs'
  own redirect targets.
- Did NOT redesign `dev-agent-swarm`'s per-run worktree+branch architecture
  — made it safe (auto-cleanup) without deciding whether it's
  policy-compliant. That's explicitly left open below.

## Open / blockers — next action is the user's call

1. **The swarm's worktree/branch policy.** `packages/dev-agent-swarm` still
   creates a disposable git worktree + branch per batch run and per chat
   session, merging into a persistent `agent/integration` branch — exactly
   the pattern `AGENTS.md`'s "no branches, no worktrees, one checkout" rule
   targets. Cleanup now exists so this is safe-to-exist, not
   policy-compliant. **Do not launch the swarm's batch/dispatch mode** until
   the user decides: grant an explicit exception, or redesign it to run
   serialized in the single checkout (losing the parallelism isolation
   exists for).
2. **P1 "Stable shell across core and verticals."** Contract matrix is
   seeded (3 confirmed inconsistent shell patterns in core; verticals
   confirmed to run local shell copies, not the core app's) but
   consolidation itself hasn't started — real navigation blast radius, do
   in its own focused pass.
3. **P0 "matter ownership boundaries."** Only spot-checked (2 files read in
   full, both correct; a coarse whole-file grep across ~79 mutation routes
   found nothing obviously missing but was a presence-of-string heuristic,
   not a real per-route audit).
4. Two stranded ChatGPT-sandbox commits from earlier the same day, never
   recovered: a "Legal Case Builder" vertical (726 tests, essentially a
   first version of the workflow-factory idea) and a UCC workflow — only
   recoverable by reopening those specific ChatGPT conversations before the
   sandboxes expire.
5. The autonomous-factory gap, per the user's own question this session:
   ground-truth contract and a real verification engine now exist; a
   structured (queryable) ledger and an orchestration loop that walks the
   catalog on its own do not. See `MEMORY.md` →
   `mailmypdf-autonomous-factory-vision` for the full picture and the user's
   explicit positions on autonomy/authority.

## Where to look, not what to re-derive

- `context/FACTORY_STATUS.md` — live priority queue, evidence-backed
- `context/NAV_AUTH_SHELL_CONTRACT.md` — nav/auth/shell ground truth,
  non-negotiables, permission-graduation policy (with a granted-autonomy log
  — currently empty)
- Claude memory (`mailmypdf-autonomous-factory-vision`,
  `mailmypdf-nav-auth-shell-contract`, `mailmypdf-multi-agent-chaos-2026-09-14`)
  — the user's explicit positions and the multi-sandbox incident history
