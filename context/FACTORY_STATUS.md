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
| P0 | Audit server admin and matter ownership boundaries | Open. Core admin functions use user_roles; other surfaces may use app_metadata. UI role data must not trust user_metadata. |
| P1 | Safe login/confirmation destinations | Closed for core `/auth`, `/auth/confirm`, `_authenticated/route.tsx`, `_authenticated/dashboard/route.tsx`, commit `3a44b1c`. `safeAuthDestination()` rejects external/protocol-relative/auth-loop targets; auth-guard race with `ensureSupabase()` fixed; shell no longer trusts `user_metadata.role`. Verified: `auth-navigation.test.ts` 2/2, full app suite 598+130 passing. Still open: password recovery flow and vertical-level auth flows (verticals run their own local auth, per the shell-duplication finding below) haven't been audited against this same standard. |
| P1 | Stable shell across core and verticals | In progress. `context/NAV_AUTH_SHELL_CONTRACT.md` now holds the route × role × shell matrix (seed version, 2026-09-14) — 3 confirmed inconsistent shell patterns in core (dashboard/admin/legal-defense), verticals confirmed to run their own local shell copies rather than the core app's. Extend the matrix per vertical before further consolidation. |
| P1 | Verify Studio/PDF reference workflow | Pending recorded result. Use existing car-insurance-appeal acceptance CLI; it simulates services and does not certify live fulfillment. |
| P1 | Records workflow regression failures | Baseline test run showed failures in partial-production gap detection and some field contracts. Investigate shared cause; do not downgrade newer workflows to old versions. |
| P1 | Immigration provider declaration | Duplicate declaration removed; focused regression check pending. |
| P2 | Complete selected archive recovery | FairProcess review, registry/CI reconciliation; retain later functionality. |
| P2 | Swarm obeys one-copy/main constraint | Open. Current orchestrator creates worktrees and integration branches. Do not launch it under the current user constraint. |
| P2 | Agent completion reflects integrated acceptance | Open. Tester falls back to a vertical suite when no workflow acceptance exists; that is not workflow acceptance coverage. |

## Verification ledger

Add exact commands, exit status, tested revision or working-tree state, and
limitations below as checks complete. Never infer passing results from old reports.
