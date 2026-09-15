# MailMyPDF factory status

Updated: 2026-09-14. This is the active repair queue, not a readiness certification.

## Objective and current focus

Deliver a coherent, secure public/user/admin application, then make Studio a
supervised factory that builds and verifies workflows against that standard.
Current focus: protect Studio's machine-level tools; repair authentication return
paths and shared navigation; verify the existing PDF acceptance engine.
Long-term product direction: `PROBLEM_TO_WORKFLOW.md` — problem-led private plans
and reviewed reusable registry templates generated from real customer needs.

## Verified recovery observations

- Canonical checkout is dev/mailmypdf-all, main. Archive tags retain old histories.
- The prior estimate of 20–35 lost features was unsupported. Small-business and
  Idaho recovery merges changed no files. Records commerce's 10 changed archive
  files exactly match main. Production Records implementations already exist;
  their registry has later additions beyond the old individual workflow branches.
- Code Enforcement and Notice Claude-first archive files match main. Immigration
  contained a duplicate TASK_ROUTING declaration referencing an undefined legacy
  map; removal is included in the current repair.
- FairProcess Code Enforcement has 36 archive-changed paths requiring integration
  review; its domain layer is not present. Recovery is still outstanding.
- UI/SEO merge e5e3904 kept four conflicting files without a semantic review.
  Registry URLs and missing package/CI quality gates still need reconciliation.
- Local main contains unpushed recovery commits. Do not assume GitHub is synchronized.

## Priority queue

| Priority | Item | Status / evidence |
|---|---|---|
| P0 | Restrict Studio shell/file/publishing tools | Closed, commit `5f8ee64`. Real severity: GitHub sync/Cloudflare publish (developer-machine-credentialed) were reachable by any signed-in customer via `accountAuthMiddleware`, not just admin. Now `studioAccessError` (local-loopback + `NODE_ENV=development` + same-origin) gates every `/api/studio/**` route unconditionally, including in production for an authenticated admin. Verified: `studio-access.test.ts` 4/4 (incl. a self-enforcing scan that every route file contains the guard call), full private-office suite 1067/1067, `tsc --noEmit` clean. |
| P0 | Audit server admin and matter ownership boundaries | Partially closed, commit `d3021de`. Found and fixed a real, confirmed self-service admin privilege escalation: `appeal-mail` and `benefits-appeal`'s `auth-guard.ts` (identical, likely copy-pasted) granted admin from the caller's own client-editable `user_metadata.role`/`is_admin` before falling back to `user_roles` — any signed-in customer of either vertical could self-grant admin and pass `requireAdmin()`, reaching `/api/admin/appeals` and `/api/admin/health`. Neither vertical had any test coverage on this function before; added `auth-guard-role-trust.test.ts` to both (structural regression test) so it can't silently regress. Swept core app's `app_metadata.role` usage (`entitlements-management.ts`) — confirmed correct, `app_metadata` is server/service-role-only in Supabase, unlike `user_metadata`. Coarse whole-file grep across ~79 `.update()`/`.delete()` route files for a `user_id`/`owner_id` ownership-check string found none missing entirely, but this was NOT a line-by-line audit of every mutation — treat matter/case ownership enforcement as spot-checked, not exhaustively verified, especially outside appeal-mail/benefits-appeal/private-office. Still open: apply the same `auth-guard.ts` scan to every other vertical with its own auth guard (immigration-mail, notice-respond, private-office, dispute-mail already checked clean by grep — no `metadata?.role`/`metadata?.is_admin` pattern found in those), and a real per-route ownership audit rather than a presence-of-string heuristic. |
| P1 | Safe login/confirmation destinations | Closed for core `/auth`, `/auth/confirm`, `_authenticated/route.tsx`, `_authenticated/dashboard/route.tsx`, commit `3a44b1c`. `safeAuthDestination()` rejects external/protocol-relative/auth-loop targets; auth-guard race with `ensureSupabase()` fixed; shell no longer trusts `user_metadata.role`. Verified: `auth-navigation.test.ts` 2/2, full app suite 598+130 passing. Still open: password recovery flow and vertical-level auth flows (verticals run their own local auth, per the shell-duplication finding below) haven't been audited against this same standard. |
| P1 | Stable shell across core and verticals | In progress. `context/NAV_AUTH_SHELL_CONTRACT.md` now holds the route × role × shell matrix (seed version, 2026-09-14) — 3 confirmed inconsistent shell patterns in core (dashboard/admin/legal-defense), verticals confirmed to run their own local shell copies rather than the core app's. Extend the matrix per vertical before further consolidation. |
| P1 | Verify Studio/PDF reference workflow | Recorded, run 0005 (commit `bbe0941`). `node packages/workflow-acceptance/bin/studio.mjs workflow test car-insurance-appeal --fixture rear-end-liability-dispute --json`: status `passed`, `mailReady: true`, all 11 checks pass, zero quality findings. Artifacts committed under `apps/verticals/appeal-mail/tests/acceptance/car-insurance-appeal/runs/.../0005/`. Caveat unchanged: this simulates Stripe/Lob and does not certify live fulfillment — only 1 of ~100 catalog workflows (`car-insurance-appeal`) has a registered acceptance test at all (`packages/workflow-acceptance/registry/workflows.json`); the other ~99 workflows' "production" status badges are unverified by this engine. |
| P1 | Records workflow regression failures | Closed, commit `85b8a5d`. Baseline 29 failing tests / 25 files. Root cause was 3 compounding bugs in shared matching engines used by 30-50 of the vertical's workflow files (unfiltered generic auto-derived keywords; a reference-pattern exclusion wrongly gated on the record already having *any* category; police-records-analysis.ts's filename match having no reference-pattern guard at all, a too-low 1-keyword match threshold, and a REFERENCE regex missing the bare word "referenced"). This was a real accuracy bug (told requesters a production was complete when categories were actually missing), not cosmetic. Now 8/282 failing, each individually confirmed unrelated to gap detection (manifest schema field, 2 stale content-string assertions, 2 pre-existing validation-array assertion-format issues, 1 narrower category-taxonomy content overlap — see commit message for detail on all 8). |
| P1 | Immigration provider declaration | Closed, commit `4618994`. `pnpm vitest run` for immigration-mail: 2614/2614 passing. Regression check surfaced one unrelated pre-existing stale test (`mailmypdf-gold-contract.test.ts` asserted `"/v1/documents"` and explicitly must-not-contain `"/api/v1/documents"`) — confirmed against the real server routes (`apps/mailmypdf/src/routes/api/v1/documents/index.ts`) that `/api/v1/documents` is the actual live endpoint and fixed the test to match. |
| P2 | Complete selected archive recovery | FairProcess review, registry/CI reconciliation; retain later functionality. |
| P2 | Swarm obeys one-copy/main constraint | Partially addressed, commit `ddce5a5`. Real finding: the swarm had never actually been run in this repo (confirmed: zero worktrees, zero `agent/*` branches, nothing under `.agent-runs` on disk), but had no cleanup path at all — every run/session would have leaked its worktree and branch forever, unbounded. Added cleanupWorktree/cleanupRun/closeChatSession (auto for merged/cancelled runs, manual endpoints for needs_human/failed runs and chat sessions), verified against disposable temp repos (3/3), never the real checkout. **Still unresolved, still open, still the user's call:** the design fundamentally still creates a disposable git worktree + branch per batch run and per chat session, and merges into a persistent `agent/integration` branch — this is exactly the pattern `AGENTS.md`'s "no branches, no worktrees, one checkout" rule targets. This change makes that pattern safe-to-exist-and-clean-up, not policy-compliant. Do not launch the swarm's batch/dispatch mode until the user explicitly decides whether per-run branches are an acceptable exception or the architecture needs to change to operate serialized in the single checkout. |
| P2 | Agent completion reflects integrated acceptance | Open. Tester falls back to a vertical suite when no workflow acceptance exists; that is not workflow acceptance coverage. |

## Verification ledger

Add exact commands, exit status, tested revision or working-tree state, and
limitations below as checks complete. Never infer passing results from old reports.
