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
| P0 | Audit server admin and matter ownership boundaries | Further closed this session (no new commit hash yet — see below). Prior finding: `d3021de` fixed a real, confirmed self-service admin privilege escalation in `appeal-mail`/`benefits-appeal`'s `auth-guard.ts` (client-editable `user_metadata.role` trusted before `user_roles`). This session read every vertical's `auth-guard.ts` in full (dispute-mail, notice-respond, immigration-mail, private-office, appeal-mail) — confirmed all five are correct: role resolution goes only through the server-side `user_roles` table (or, for private-office/Studio, the separate `studioAccessError` local-loopback+same-origin gate, confirmed still present on all 12 `/api/studio/**` route files). Then did a real per-route ownership read (not the prior presence-of-string grep) of every mutating route with a dynamic resource ID across appeal-mail's ~80 templated workflow `approve.ts`/`draft.ts` files (verified via a whitespace-tolerant regex that every one enforces `appeal.user_id === user.id` plus optimistic version locking on update), notice-respond's `/api/cases/$caseId(/approve|/evidence)` (all queries scoped `eq("owner_id", user.id)`), dispute-mail's and immigration-mail's `approve.ts`/`checkout.ts`. Found and fixed one real gap: immigration-mail's `/api/checkout` stored a client-supplied `correspondenceId` on the new `mailing_intents` row with no ownership check (dispute-mail's equivalent `caseId` check already existed) — a signed-in user could attach another user's correspondence ID as a reference on their own order. Low severity (the mailed draft/recipient still come only from the properly owner-scoped `approvals` record, so no cross-user data was ever returned or mailed) but a real integrity gap; fixed to match dispute-mail's pattern. `pnpm vitest run` for immigration-mail: 2614/2614 passing (no prior coverage existed for this route either way — none added given no existing test pattern for these route files to extend safely); `tsc --noEmit` clean. Core `/api/v1/*` routes read (`dispute-mail/finalize.ts`, `communications/index.ts`, `appeal-reply/mail-appeal.ts`) — these are intentionally anonymous/guest order-creation endpoints (order+token, not user-owned), not an ownership gap. Also read every payment/internal-cron mutation path this session: `apps/mailmypdf/src/routes/api/internal/{proof-processor,proof-window-expiry}.ts` (bearer-secret gated, no user-suppliable resource ID), `apps/mailmypdf/src/routes/api/public/payments/webhook.ts` (Stripe SDK signature verification, event-ID dedup, exact-amount invariant against the approval-bound price before marking paid), and `apps/verticals/appeal-mail/src/routes/api/stripe-webhook.ts` (SDK signature verification, checks the payment gate's `owner_id`/`workflow_id`/`stripe_session_id` against the session metadata before marking a draft-unlock paid, hash-verifies draft/recipient before fulfillment). All confirmed correct, no changes needed. **Closing this P0 as substantively done**: every auth-guard, every dynamic-ID mutating route with cross-user risk in every vertical, and every payment/webhook mutation path has now been read in full and is either correct or was fixed (immigration-mail correspondence ownership, this session). Remaining unaudited surface is routine same-vertical CRUD with low cross-user blast radius (e.g. records/other verticals' own list/detail endpoints already grep-clean per the prior pass) — treat as low-risk, not zero-risk, and re-open if a specific route becomes suspect. |
| P1 | Safe login/confirmation destinations | Closed for core `/auth`, `/auth/confirm`, `_authenticated/route.tsx`, `_authenticated/dashboard/route.tsx`, commit `3a44b1c`. `safeAuthDestination()` rejects external/protocol-relative/auth-loop targets; auth-guard race with `ensureSupabase()` fixed; shell no longer trusts `user_metadata.role`. Verified: `auth-navigation.test.ts` 2/2, full app suite 598+130 passing. Still open: password recovery flow and vertical-level auth flows (verticals run their own local auth, per the shell-duplication finding below) haven't been audited against this same standard. |
| P1 | Stable shell across core and verticals | In progress. `context/NAV_AUTH_SHELL_CONTRACT.md` now holds the route × role × shell matrix (seed version, 2026-09-14) — 3 confirmed inconsistent shell patterns in core (dashboard/admin/legal-defense), verticals confirmed to run their own local shell copies rather than the core app's. Extend the matrix per vertical before further consolidation. |
| P1 | Verify Studio/PDF reference workflow | Recorded, run 0005 (commit `bbe0941`). `node packages/workflow-acceptance/bin/studio.mjs workflow test car-insurance-appeal --fixture rear-end-liability-dispute --json`: status `passed`, `mailReady: true`, all 11 checks pass, zero quality findings. Artifacts committed under `apps/verticals/appeal-mail/tests/acceptance/car-insurance-appeal/runs/.../0005/`. Caveat unchanged: this simulates Stripe/Lob and does not certify live fulfillment — only 1 of ~100 catalog workflows (`car-insurance-appeal`) has a registered acceptance test at all (`packages/workflow-acceptance/registry/workflows.json`); the other ~99 workflows' "production" status badges are unverified by this engine. **Second workflow now registered and run for real** (`claim-denial-letter`, scenario `homeowner-storm-damage-denial`, commit `061e7d1`): `node packages/workflow-acceptance/bin/studio.mjs workflow test claim-denial-letter --fixture homeowner-storm-damage-denial --json`. Building it surfaced three real, confirmed defects, two fixed project-wide, one flagged and deliberately left unfixed so the test reports the true state:
  1. **Signature placeholder** (commit `14328ea`): the readiness review treated an unresolved `[Your Name]` placeholder as a valid signature in 24 of 34 appeal-mail workflows. Fixed at the shared `runReadinessReview()` call site (warns now, doesn't silently pass) — this is a mitigation, not a root fix; the draft.ts routes still append the literal placeholder unconditionally. **Deliberately not fixed further**: `claim-denial-letter`'s run 0003 still fails `pdfPreflight` on this exact defect (`PDF_PLACEHOLDER_PRESENT`) — left as-is rather than special-cased away, so the test result stays honest. Root-fixing the 24 workflows' draft.ts routes (likely: use the account's real name, or block approval until the customer supplies one) is still open and needs a product decision, not just a code fix.
  2. **Evidence/grounds linkage** (commits `7e6d852`, `d039d50`): `src/domain/evidence.ts`'s `unsupportedGrounds()`/`evidenceForGround()` (read by the shared readiness review) key off `evidence[i].groundIds`, not the `ground.supportingEvidenceIds` field 29 of 34 workflows' `analyze.ts` routes were setting instead (which nothing reads). Every such appeal scored two guaranteed readiness warnings regardless of actual quality — confirmed via `claim-denial-letter`'s score going from 68 (rejected, needs ≥80) to passing with the identical fixture, before/after the fix. Fixed in all 29 affected workflows.
  3. **Uploaded evidence never mailed** (commits `061e7d1`, `d039d50`): `car-insurance-appeal` was the *only* workflow that retained the customer's uploaded document (Supabase Storage + hash) so it could be re-enclosed in the mail-ready packet; the other 33 silently dropped it even when the drafted letter said it was enclosed. Confirmed via the acceptance engine's `requestedUploads` check (real hard failure: `PACKET_UPLOAD_MISSING`). Fixed in 23 workflows via a new shared helper (`src/platform/evidence-retention.ts`).
  Still open: `administrative-decision-appeal`, `denied-claim`, `ssdi-appeal` use a structurally different, hand-rolled evidence/grounds model (no `createEvidence()`, `grounds` always `[]`, no `runReadinessReview` usage) — none of the three fixes above were safe to apply without first understanding that divergent path, so none were touched. `administrative-decision-appeal`'s own `approve.ts` additionally never sets `approvedDraftHash`/`approvedRecipientHash` that its own `checkout.ts` requires before allowing payment — reads as a separate, more severe "checkout may never succeed" defect, not investigated further. Note: appeal-mail's `pnpm vitest run` has a large pre-existing baseline of ~50 failing test files (mostly stale "gold" pricing-lock assertions) unrelated to this session's changes — flagged, not fixed, out of scope. Full-suite diff confirmed zero test files changed pass/fail status across every change in this entry. |
| P1 | Records workflow regression failures | Closed, commit `85b8a5d`. Baseline 29 failing tests / 25 files. Root cause was 3 compounding bugs in shared matching engines used by 30-50 of the vertical's workflow files (unfiltered generic auto-derived keywords; a reference-pattern exclusion wrongly gated on the record already having *any* category; police-records-analysis.ts's filename match having no reference-pattern guard at all, a too-low 1-keyword match threshold, and a REFERENCE regex missing the bare word "referenced"). This was a real accuracy bug (told requesters a production was complete when categories were actually missing), not cosmetic. Now 8/282 failing, each individually confirmed unrelated to gap detection (manifest schema field, 2 stale content-string assertions, 2 pre-existing validation-array assertion-format issues, 1 narrower category-taxonomy content overlap — see commit message for detail on all 8). |
| P1 | Immigration provider declaration | Closed, commit `4618994`. `pnpm vitest run` for immigration-mail: 2614/2614 passing. Regression check surfaced one unrelated pre-existing stale test (`mailmypdf-gold-contract.test.ts` asserted `"/v1/documents"` and explicitly must-not-contain `"/api/v1/documents"`) — confirmed against the real server routes (`apps/mailmypdf/src/routes/api/v1/documents/index.ts`) that `/api/v1/documents` is the actual live endpoint and fixed the test to match. |
| P1 | Crawler endpoints served from stale static assets | Closed this session (see ledger entry 2026-09-21). Investigated as a suspected SSR module-init/TDZ defect in `mailmypdf/src/routes/sitemap[.]xml.ts`; it is **not** one. `mailmypdf/public/sitemap.xml` and `public/robots.txt` were checked-in static files, and the Cloudflare Workers entry short-circuits `if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest)` before the router runs, so both SSR routes were unreachable dead code in production. Proof independent of runtime: the served body carried 10 URLs no registry can produce and omitted 8 `staticRoutes` literals the handler always emits. Removed both static files; extracted `src/lib/sitemap.ts` + `src/lib/robots.ts` so the route sets are directly assertable. Also fixed a second, more severe live defect found in the same file: the static `Disallow: /send` prefix-blocked 27 of the 35 `SEO_PAGES` landing routes the sitemap advertises (now anchored `/send$`). `[fix-ssr-chunk-cycle]` was a red herring — it patches an unrelated chunk and the sitemap route was never in the cycle. |
| P2 | Committed `main` does not build from a clean checkout | Open. Found while trying to build this worktree from `0f966b93`. Three independent blockers, all pre-existing: (1) `mailmypdf/vite.config.ts` aliases tslib to `../../node_modules/...` and `src/lib/publication-admin.functions.ts` imports `../../../../Projects/Publications/catalog` — both stale by one level since `f6ece981` relocated `apps/mailmypdf/` to `mailmypdf/`; the user's uncommitted working tree already contains both one-line fixes, so this is invisible there. (2) `packages/*/dist` is gitignored and `mailmypdf`'s `prebuild` builds only 5 of the ~12 packages the app imports, so `@mailmypdf/workflow-ui`, `workflows`, `pricing`, `packet-builder`, `forms` and others must be built by hand first. (3) `packages/fulfillment` and `packages/audit` inherit `noEmit: true` from the root tsconfig, so their `build` script exits 0 and emits nothing — their `dist` in the user's checkout is stale output from before that setting. Fixes (1) are included in this session's commit because the build could not be verified without them; (2) and (3) are untouched. |
| P2 | Complete selected archive recovery | FairProcess review, registry/CI reconciliation; retain later functionality. |
| P2 | Swarm obeys one-copy/main constraint | Partially addressed, commit `ddce5a5`. Real finding: the swarm had never actually been run in this repo (confirmed: zero worktrees, zero `agent/*` branches, nothing under `.agent-runs` on disk), but had no cleanup path at all — every run/session would have leaked its worktree and branch forever, unbounded. Added cleanupWorktree/cleanupRun/closeChatSession (auto for merged/cancelled runs, manual endpoints for needs_human/failed runs and chat sessions), verified against disposable temp repos (3/3), never the real checkout. **Still unresolved, still open, still the user's call:** the design fundamentally still creates a disposable git worktree + branch per batch run and per chat session, and merges into a persistent `agent/integration` branch — this is exactly the pattern `AGENTS.md`'s "no branches, no worktrees, one checkout" rule targets. This change makes that pattern safe-to-exist-and-clean-up, not policy-compliant. Do not launch the swarm's batch/dispatch mode until the user explicitly decides whether per-run branches are an acceptable exception or the architecture needs to change to operate serialized in the single checkout. |
| P2 | Agent completion reflects integrated acceptance | Open. Tester falls back to a vertical suite when no workflow acceptance exists; that is not workflow acceptance coverage. |

## Verification ledger

Add exact commands, exit status, tested revision or working-tree state, and
limitations below as checks complete. Never infer passing results from old reports.


### 2026-09-21 — sitemap.xml / robots.txt asset shadowing

Runtime fidelity first: the earlier report was taken under `wrangler dev
--compatibility-date 2026-09-04`, forced because the installed workerd
(1.20260828.1, via wrangler 4.127.1) predates the Worker's required
`compatibility_date: 2026-09-18`. Re-ran on wrangler 4.135.0 / workerd
1.20260918.1 (installed outside the repo, project lockfile untouched), which
starts on the real date with **no downgrade flag**.

- `pnpm run build` (mailmypdf, worktree `hungry-bhaskara-062926`) — exit 0,
  `[fix-ssr-chunk-cycle] broke 1 cycle(s)`, after the two relocation path fixes
  and hand-building the unbuilt workspace packages.
- `wrangler dev --config .output/server/wrangler.json --local` on
  compatibility_date 2026-09-18, `MAILMYPDF_BASE_URL` supplied via `.dev.vars`:
  - `GET /sitemap.xml` → 200, `application/xml; charset=utf-8`, **72 `<loc>`**
    (was 47 from the static file). All 14 `PUBLIC_VERTICALS` landing routes and
    all 14 `/workflows` routes present; all 8 previously-absent `staticRoutes`
    (`/write`, `/bulk`, `/templates`, `/ecosystem`, `/fair-process`,
    `/future-self`, `/proof-of-service`, `/pro`) present.
  - `GET /robots.txt` → 200, `text/plain; charset=utf-8`, served by the route,
    no longer prefix-blocking the `/send-*` landing pages.
- `npx tsx --test tests/*.test.ts` — 150 tests, 148 pass, 2 fail. Baseline at
  `HEAD~1` of the same tree: 143 tests, 141 pass, 2 fail. Same two failures
  (`ai-gateway-disclosure.test.ts` → `provider failure containment`, a
  `ReferenceError: context is not defined` in the test itself). +7 new tests,
  all passing, zero regressions.
- `node --test tests/*.test.mjs` — 605 tests, 584 pass, 21 fail; byte-identical
  failure set to the pre-change baseline run on the same tree. Zero regressions.
- `npx tsc --noEmit` — 0 errors in the changed files. The repo-wide baseline
  (large, concentrated in `../appeal-mail/`) is unchanged and untouched.

Limitations and open items, not fixed here:

- **The missing `<title>` is real, not a downgrade artifact.** On the faithful
  runtime `/notice-respond/workflows`, `/legal-defense`,
  `/notice-respond/workflows/cp14-response`, `/notice-respond/workflows/cp504-response`
  and `/legal-defense/workflows/wrongful-stolen-vehicle-arrest` all return 200
  with **no `<title>` element at all**. Separate defect, still open.
- The dynamic sitemap drops 10 URLs the stale file advertised
  (`/send-a-letter-online`, `/send-pdf-by-mail`, `/proof-of-mailing`,
  `/respond-to-a-government-notice`, …). `seo-pages.ts` documents these as
  synonym routes that "should redirect to one of these canonical intents", so
  the omission is by design — but only `/mail-paperwork-online` actually 308s;
  the rest return 200 with no `rel=canonical`. Canonicalization of those
  synonym routes is an open editorial decision, not addressed here.
- `workflowAuthorityPages()` returns 100 pages with **0 indexable** at this
  revision (all DRAFT bar one EXECUTABLE that does not clear the gate), so the
  workflow-authority contribution to the sitemap is currently empty by content
  policy, not by defect. The uncommitted working tree has 1 indexable.
- Nothing was deployed and no production sitemap was verified.
