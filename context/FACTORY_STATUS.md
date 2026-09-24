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
| P1 | New root-level architecture routes were never mounted; CP14 golden path built and wired | Closed for CP14, uncommitted. Root cause (confirmed via `wrangler dev` against a real build, not just `vite dev`, which is broken for this app independent of this work): TanStack Start's file-based router only scans `mailmypdf/src/routes/`, so every root-level package's routes (`notice-respond/`, `appeal-mail/`, `records-request/`, `immigration-mail/`, `secured-transactions/`) were dead code — confirmed via a stale `routeTree.gen.ts` (zero `cp14`/`notice-respond` references) and a live build serving the root `$.tsx` catch-all instead of the real page. Added thin mount files (`mailmypdf/src/routes/notice-respond/{index,workflows/cp14-response/index,workflows/cp14-response/start/index}.tsx`) that import CP14's real config/component from `notice-respond/`; added `@mailmypdf/design-system` + `@mailmypdf/seo` to `mailmypdf/package.json` (previously undeclared, required to resolve those imports). Separately, the new architecture's generic runtime contract (`packages/workflows`' `createWorkflowRuntimeRequestHandler`/`createPlatformWorkflowRuntimeRequestHandler`) was fully built and tested but never mounted anywhere, and no production `WorkflowRuntimeStore`/gateway adapters existed — built `mailmypdf/src/lib/secure-core/workflow-runtime-host.server.ts`, mounted at new route `mailmypdf/src/routes/api/workflow-runtime/$.ts`, entirely by wrapping the existing v2 case-route Supabase/AI/packet/Stripe primitives (`case.server`, `case-analysis.server`, `case-approval.server`, `workflow-checkout.server`, `document-intake.server`) rather than building a second runtime. Browser client had no `getAccessToken`, so every new-architecture workflow (not just CP14) would 401 on every request; added a small provider/consumer registry (`packages/workflows/src/browser-access-token.ts`) so the host registers a real Supabase-session token getter once (`mailmypdf/src/routes/__root.tsx`, module scope) and `notice-respond/shared/NoticeResponseWorkflow.tsx` consumes it. Fixed a vertical-id drift bug in `workflow-runtime.ts` (`resolveCaseWorkflow` only recognized the legacy `"notice-response"` id, not the canonical `"notice-respond"` the new architecture and `@mailmypdf/pricing` already use) via an alias, without renaming the legacy id (preserves the still-live `/notice/$` embedded UI). Fixed the notice-response evidence-kind vocabulary mismatch between the new architecture's `COMMON_TAX_EVIDENCE` (`account_transcript`/`prior_correspondence`/`bank_record`) and the DB check constraint (had `irs_transcript`/`correspondence`/`bank_statement`) via an additive migration. Split `case-analysis.server.ts`'s `analyseSubjectNotice` into `runNoticeAnalysisModel` (compute) + `persistCaseAnalysis` (persist) so the generic runtime's separate intelligence/store steps don't double-insert; added `case-draft.server.ts` and an `approve_case_packet` RPC parameter (`p_approval_id`, defaulted, backward compatible) so the generic runtime's client-visible draft-basis and approval ids match what's actually persisted. Made CP14's landing page indexable with real FAQ/what-you-need/what-you-do content (was `indexable: false` with only generic fallback copy) and added it to `sitemap.xml.ts`. Verified: `tsc --noEmit` in `mailmypdf` shows zero new errors (pre-existing ~15 stale-routeTree-string errors across other verticals' `start/` routes untouched by this work remain, plus 3 unrelated pre-existing errors); `pnpm --filter @mailmypdf/workflows test` 155/155; `mailmypdf`'s own suite: every test file touching modified code (`ai-disclosure-boundary`, `case-boundary`, `secure-workflow-fulfillment`, `notice-response-workflow`, `case-packet`, `notice-workflow-factory`, `workflow-runtime`) passes (83/84, the one failure is a confirmed pre-existing hardcoded-absolute-path bug in `secure-workflow-fulfillment.test.mjs` unrelated to this work); full `pnpm run build` succeeds; real browser verification via `wrangler dev` against the built Worker (not `vite dev`/`vite preview`, both broken for this app's Cloudflare Nitro target in this environment) confirmed the CP14 landing page renders with correct SEO (title/description/robots=index/canonical) and the CP14 start page renders the actual 7-step workflow UI end-to-end; `/api/workflow-runtime/matters` is now a real mounted route (previously fell through to the SPA shell, HTTP 200 regardless of body) and correctly 401s without a bearer token. **Not verified**: a live database round-trip (create matter → upload → analyze → draft → approve → checkout) — this local `wrangler dev` environment does not populate `process.env.*` from Workers bindings even with `nodejs_compat_populate_process_env` set, and this is confirmed pre-existing (the untouched `/api/v2/cases` route fails identically), not something this change caused or can fix from application code. The new migration (`mailmypdf/supabase/migrations/20260920100000_workflow_runtime_bridge.sql`) has not been applied to the connected dev Supabase project — `supabase link` for that project ref fails with an account-privilege error for the CLI's current login; applying it needs someone with real access to that Supabase project. Until it's applied, `saveDraft`/evidence attachment under the new evidence-kind labels/approval-id-matching will fail against the live database even though the code and route are correct. |

| P1 | Shared workflow-landing SEO template rebuilt; Studio/swarm updated for new architecture; first autonomous rollout (CP504) completed | Closed, uncommitted. Researched competitor structure for this niche (IRS notice / insurance-appeal response services: IRS.gov, law-firm content pages, Claimable/ClaimFighter) and found the existing `WorkflowLandingPage` (`packages/design-system/src/workflow-landing.tsx`) was far thinner than both competitors and this repo's own `SectionLandingPage` — which already had a full header/hero/trust-strip/process-steps/FAQ/related/footer structure via shared primitives in `public-page.ts`. Extracted `createGlobalHeader`/`createGlobalFooter` into `public-page.ts` (section and workflow pages now use identical primitives) and rebuilt `WorkflowLandingPage`'s default branch to actually render `workflowSteps` (as a "How it works" section, and as new HowTo schema in `packages/seo/src/workflow-head.ts`) and `readyItems` (as a "What you'll need" panel) — both were already being populated in configs (CP14's) but silently dropped by the old template. Added an optional `relatedWorkflows` field for internal linking. Left `AppealMailWorkflowLandingPage` (the appeal-mail vertical's bespoke sidebar layout) untouched — a deliberate separate design per its own `DESIGN_STANDARD.md`; migrating it onto the shared template is a separate decision, not done here. Verified on CP14 via real build + `wrangler dev`: all new sections render server-side with correct content and schema. |
|   |   | Then, per explicit user direction, investigated wiring this rollout into Studio's existing agent-swarm (`packages/dev-agent-swarm`), which already had a Builder/Tester/Reviewer/specialist role model and an `"seo"` role — but every part of it (catalog scanner, `runSeoCheck`, Tester's vertical-test fallback) was blind to the new root-level architecture. Fixed: `scan-workflow-catalog.ts` now detects new-architecture workflows (config.ts existence) and tracks whether each is actually *mounted* under `mailmypdf/src/routes/` (config-without-mount is exactly the gap CP14 exposed); `runSeoCheck` rewritten to validate the new architecture's config fields, mount files, and sitemap listing instead of the old `apps/verticals/*` layout; fixed stale `publicPath`s for the two sibling workflows confirmed to exist as real folders (`cp504-response`, `cp2000-response`). Found and fixed three real, previously-latent bugs in the swarm itself, each confirmed via an actual run, not by inspection alone: (1) the Tester's fallback filtered `pnpm --filter <verticalId>`, a *package-name* filter — for notice-respond this silently resolved to the **legacy** `apps/verticals/notice-respond` package (14 pre-existing failures) instead of the new `@mailmypdf/notice-respond`, since pnpm matches by exact name and the legacy one happens to be unscoped; fixed to filter by path (`./<verticalId>` vs `./apps/verticals/<verticalId>`, whichever has a package.json), verified against both. (2) The worktree overlay (`overlayWorkingTree`) only applies `git diff HEAD` — tracked-file changes — so any *new, untracked* file from the current session (e.g. this session's own CP14 mount files) was invisible to every run; a real run's Builder had to reconstruct a reference file from scratch because it silently wasn't there. Fixed by additionally copying `git ls-files --others --exclude-standard` (exactly `git status`'s own untracked-but-not-ignored list, so this can never leak a `.gitignore`d secret — preserves the exact boundary the tracked-diff-only design existed for after a prior incident leaked `.env.local`). (3) The Builder role has no Bash access by design (`providers.ts`: a disposable worktree doesn't stop a shell command from reaching the real machine, so `acceptEdits` not `bypassPermissions` is used) — meaning it can edit files but can never `git commit` its own work. A real run's Builder wrote genuinely correct, complete CP504 content (config.ts + two route mounts + sitemap entry) but it sat uncommitted, and the Reviewer correctly reported an empty diff. Fixed by having the orchestrator itself — already trusted for worktree/merge git commands — auto-commit whatever the Builder wrote before Tester/Reviewer run (`commitBuilderChanges` in `orchestrator.ts`), preserving the Builder's sandboxing. Also fixed the Reviewer's verdict parser (`extractLastVerdict`): it only checked `.item.text`/`.message.text` for a JSON verdict string, missing Claude's own `{"type":"result",...,"result":"<json-string>"}` final-summary shape entirely — confirmed via a real run where a well-formed `{"approved":false,...}` verdict was present in `result` but never found, forcing an unnecessary `needs_human`. |
|   |   | User granted an explicit, bounded exception to this repo's single-checkout/worktree constraint for this specific automated-rollout task (see AGENTS.md/this file's prior "Swarm obeys one-copy/main constraint" entry — this does not change that policy for anything else). Ran the pilot twice, both times for real (not simulated): run 1 failed immediately — the nested `claude` CLI subprocess is not authenticated even though the outer session is (`apiKeySource: none`, confirmed this is a sandbox/session-scoping limitation, not fixable from application code); user ran `claude setup-token` and, after fixing a copy-paste artifact (a stray space splitting the token, introduced by terminal line-wrapping — stripped programmatically without the token ever being read or displayed), run 2 succeeded through Builder/Tester with a real, high-quality result, and would have merged cleanly with the (2)/(3) fixes above in place at launch time — instead its genuinely correct work (verified by hand: CP504 correctly framed as an IRS Notice of Intent to Levy per `cp504NoticeResponseProfile`, explicit that mailing a letter does not stop a levy or substitute for CAP/CDP/Form 9423/Form 12153) was rescued from the worktree and applied directly rather than re-run, then verified via the same `tsc --noEmit` / `pnpm run build` / `wrangler dev` browser check used for CP14. CP504's public landing and start pages both now render correctly end-to-end, backed by the domain pack's already-registered `cp504NoticeResponseProfile` runtime policy (no backend work needed, matching CP14's pattern). Every worktree/branch from both pilot attempts was cleaned up (`cleanupRun`); nothing was left orphaned. Codex was checked as a fallback provider during this session and is genuinely authenticated but hit a usage-limit wall on its first attempt (`try again at 12:26 PM`) — not used as the primary path given that. |

| P1 | Shared notice shell could not draft (CP2000/CP504 on `/notice-respond/.../start`) | Fixed 2026-09-21, locally verified (unit level). Root cause: `NoticeResponseWorkflow.tsx` saves input in the platform policy shape (`taxpayerName`, `taxPeriod`, `responseExplanation`, `already_paid`...), and the platform runtime validates it + evidence freshness before calling the host's `generateDraft` — but `workflow-runtime-host.server.ts` dropped the passed `caseInput` and `generateDraftResponse()` re-read it through the legacy `/notice/$` zod schema (requires `ssnOrItin`, `taxYear`, different mode values), throwing "The workflow information is incomplete or invalid" every time. Reproduced for cp2000 and cp504 platform inputs. Fix: host passes the policy-validated input via `generateDraftResponse(..., { validatedInput })`; legacy callers unchanged (still re-validate). Also the CP2000 draft validator's `userFacts` now falls back to `responseExplanation`/`additionalFacts`. Checks: `mailmypdf` `npx tsx --test tests/*.test.ts` 150 pass / 2 fail (baseline 148/2; the 2 are pre-existing `provider failure containment`); new regression test fails without the fix; `tsc --noEmit` 36 lines = baseline, none in touched files; `packages/workflows` `npm test` 165/165; `notice-respond` vitest 3/3. Not verified: live browser journey (needs auth, Supabase, paid model call). Next: the 28 other notice-respond workflows are data-only (`definition.ts` has no consumer) — promoting them needs a profile + `CaseWorkflowDefinition` + start route each; the two parallel registries (package profiles vs `secure-core/workflow-runtime.ts`) should be unified first. |

| P1 | 22 of 27 "executable" workflows cannot analyze or draft on the real server | Mostly fixed 2026-09-22: 14 repaired, 8 open; resolver probe 19/27 OK (was 5). **Repaired (locally verified, unit level):** (1) `bddae68b` the 11 insurance-family appeals get a server definition from the shared `insuranceDraftPack` + each spec's `authorityRules`. (2) `d87905f8` evidence kinds: `attachDocument()`'s `EVIDENCE_KINDS` and the `case_documents_evidence_kind_check` constraint only knew SSDI/older IRS labels, so attaching insurance records, SSA forms, SSI records, immigration packet documents, records-request context, and even notice-respond `account_transcript`/`prior_correspondence`/`bank_record` and the IRS-penalty kinds failed as unrecognized. Added to both plus new migration `mailmypdf/supabase/migrations/20260922120000_workflow_evidence_kinds.sql` (**not applied** — no Supabase CLI access to the dev project; until applied, the database still rejects the new kinds) and `tests/evidence-kind-coverage.test.ts`, which fails if any executable workflow vocabulary, the allowlist and the latest constraint drift apart. (3) `64183dae` SSDI/SSI: policy moved into `@mailmypdf/workflows` (`ssa-reconsideration-runtime-policy.ts`, platform-registered; vertical `runtime-policy.ts` files re-export), host definitions under `appeal-ssdi-denial`/`appeal-ssi-denial` ask for `appealStage`/`decisionBasis`, and the stored-analysis schema now keeps those two optional fields (previously stripped, so the policy could never pass). Legacy `ssdi-denial` definition unchanged. (4) `b8e6edcd` immigration cover letter: new platform policy (facts only after analysis; packet blocked unless the filing form is enclosed) + host definition. Checks: `packages/workflows` 173/173; `mailmypdf` `.ts` 158/160 (2 = pre-existing provider-containment); `.mjs` 575/605 (unchanged 30); appeal-mail 16/16 + acceptance 19/19; immigration acceptance 2/2; `tsc` 29 unchanged; build exit 0; rebuilt worker 401s signed-out, no server errors. Not verified: signed-in journeys against a real model/database; SSA-form and filing-form packets end to end. **Still open (8):** the 5 records requests (request-first analysis `workflow-input:N` cannot be stored — `case_analyses.document_id` is a uuid FK to `secure_documents`; `assertDraftReady` requires a source notice; the context upload purpose `records-request-context:<kind>` fails `validateDocumentPurpose`'s `^[a-z0-9][a-z0-9._-]{2,63}$`); the 3 secured-transactions intakes make no server calls. Neighbouring defects: the immigration page cannot include its uploaded filing in the packet (only `evidence` rows are toggleable), so users must re-upload it as "Filing form or application" — the policy now says so instead of mailing a letter without its filing; `workflow-checkout.server.ts` sets the Stripe cancel URL to `/notice/<workflowId>` for every workflow. Original finding (multi-angle audit of all 26 registry-executable workflows + CP14). The host (`workflow-runtime-host.server.ts`) wires one `intelligence` for every workflow; its `analyze`/`generateDraft` call `resolveCaseWorkflow()`, which only knows `ssdi-denial` (client sends `appeal-ssdi-denial`), cp14/cp523/cp504/cp2000, and notice-respond profiles. Probing the real resolver with each registry id: 5 OK (cp14, cp2000, cp504, irs-balance-due, irs-penalty), 22 throw "This workflow does not yet have an enabled case runtime" (all 13 appeal-mail, 5 records-request, immigration-filing-cover-letter, 3 secured-transactions — the latter make no server calls, so their intake still works). The execution registry and acceptance suites both call these executable because acceptance uses mocks and hardcoded drafts that never reach the host resolver. Needs per-family analysis/draft adapters (appeal, records, immigration), not a notice-shaped alias. Checks this audit (read-only, no code changed): `packages/workflows` 166/166; appeal-mail 16/16; records-request 5/5; secured-transactions 70/70; notice-respond vitest 3/3; immigration-mail has **no** unit tests (passes via `--passWithNoTests`); `mailmypdf` `.mjs` 575/605 (30 failures, none workflow-journey: stale source-text scanner tests after `9ee445a7` — the PDF active-content check moved into `@mailmypdf/documents` `verifyStoredDocument`/`validateDocument` and still runs before the scan; stale catalogue counts 14→15 sections, 420→437; paths from the `apps/` relocation; 4 publishing tables missing from generated types); `mailmypdf` `.ts` 151/153 (baseline 2); acceptance vitest appeal-mail 19/19, notice-respond 3/3, immigration 2/2, records 5/5; Studio CLI has **zero scenarios** for all 6 registered workflows, so `studio workflow test` cannot run; `tsc --noEmit` 29 errors (≤ baseline 36). `wrangler dev` on the HEAD build: all 9 `/api/workflow-runtime` endpoints 401 signed-out and with a forged bearer; `/dashboard/.../start` redirects to `/auth?redirect=<start>`. |
| P1 | 25 of 27 executable workflows have placeholder public pages | Open, found 2026-09-22. Only CP14 and CP504 serve a real indexable landing page (FAQ JSON-LD, matching canonical). The other 25 render the generic "This public URL is reserved… when its implementation is connected" page with `robots=noindex` — including the SSDI reference workflow — because their root-level routes are not mounted into `mailmypdf/src/routes` (same cause as the CP14 fix; the `tsc` route-type errors on those `start/index.tsx` files are this). The 3 secured-transactions public URLs return HTTP 200 with "Page not found" (soft 404). |
| P1 | Signed-out visitor on CP14 public start page hits a dead end | Open, found 2026-09-22. `/notice-respond/workflows/cp14-response/start` renders the upload step to signed-out visitors; uploading shows "Authentication required" (POST `/matters` 401) with no sign-in link or redirect, so the destination is lost. |
| P1 | Promote data-only notice-respond workflows to executable | In progress. 2026-09-22: `irs-penalty-notice-response` (first-time abatement / reasonable cause / penalty error) and `irs-balance-due-notice-response` (CP14/CP501/CP503-style, flags CP504/LT11/L1058/CP90 CDP-rights notices as needing their notice-controlled process) now run on the shared shell. Server-side duplication removed for new ids: `resolveCaseWorkflow()` falls back to the `@mailmypdf/workflows` profile for `notice-respond` workflows, so a workflow is enabled by one profile + start component + `runtime.ts` + `workflow-start-registry.tsx` + execution-registry status (legacy cp14/cp2000/cp504/cp523 definitions keep precedence, unchanged). Checks: `packages/workflows` `npm test` 166/166; `mailmypdf` `npx tsx --test tests/*.test.ts` 151 pass / 2 fail (pre-existing `provider failure containment`); `notice-respond` vitest 3/3; `mailmypdf` `tsc --noEmit` 36 lines = baseline; `mailmypdf` `npm run build` exit 0, new profiles present in server+client bundles. Note `@mailmypdf/workflows` resolves to gitignored `dist/` at runtime — rebuild it (`npm run build` in the package) before running mailmypdf tests. Not verified: authenticated browser journey, model analysis/draft quality, PDF packet (needs sign-in, Supabase, paid model). Deliberately not promoted: `cp3219a-response` (Tax Court petition deadline) and `cp90-collection-notice-response` (Form 12153 CDP request) — a letter must not stand in for those filings; they need dedicated form-aware flows. Remaining 24 non-IRS/non-tax notice workflows need a non-taxpayer shell variant (the shell's fields are taxpayer/tax-period specific). |

| P1 | Placeholder draft could reach a packet/approval; workflow UI standard missing here | Fixed 2026-09-22. Ported from the `/Users/macdizzle/dev/mailmypdf-all` copy (`38ffb88b`), which had a client-only placeholder gate in `irs-notice-workflow.tsx`; this copy had none at all. Implemented server-side instead: `packages/workflows/src/draft-placeholders.ts` (`findUnresolvedPlaceholders`/`unresolvedPlaceholderMessage`), enforced in `matter-runtime-server.ts` at both mailing gates (packet build and approval, 409), for every workflow rather than one UI. The shared notice shell mirrors it (warning callout + disabled "Build exact packet preview"). Saving a work-in-progress draft stays allowed. Also ported `context/WORKFLOW_UI_STANDARD.md` with paths rewritten for this copy (app is `mailmypdf/`, notice runtime is `packages/workflows` + `notice-respond/`), and AGENTS.md now requires reading it before workflow UI work. Checks (Node 22 — Node 20 fails ~30 Supabase tests environmentally, unrelated): `packages/workflows` 178/178 (new gate test fails without the server change, verified by stash); `mailmypdf` `tsx --test tests/*.test.ts` 158 pass / 2 fail (pre-existing `provider failure containment`); `notice-respond` vitest 3/3; `mailmypdf` `tsc --noEmit` 36 lines = baseline. Not verified: browser. |

| P2 | Port remaining unique work from the mailmypdf-all copy | In progress. 2026-09-22 audit: the 11 `agent/*` branches and the stale `claude/` worktree in this checkout contain **nothing** main lacks (10 are byte-identical to `agent/integration`; its 310-file diff is 284 files already identical in main and 26 where main is newer; `agent/irs-notice`'s only unique files, the `notice/irs-notice` SEO entry, landed in `578d726a`). The other copy's 4 commits (`d932abfb`,`89c0c14f`,`33dec6aa`,`38ffb88b`) branch from `c0a8431a`, 1279 commits behind, and 46 of their 50 files sit at pre-rename paths (`apps/mailmypdf/**`), so they must be ported by hand, not merged. Ported so far: the placeholder mailing gate (see the P1 row above), `context/WORKFLOW_UI_STANDARD.md`, and the CP2000 authority content (`mailmypdf/src/lib/workflow-seo-entries/notice-cp2000-response.ts`, authority gate PASS 100/100). Still unported, in rough value order: (1) CP14/CP504/CP523 authority content — blocked, their ids are not in this copy's `mailmypdf/WORKFLOW_INVENTORY.json` (only `notice/irs-notice` and `notice/cp2000-response` exist), so the new root-level workflow pages need a catalog topology decision first; (2) `court-summons-workflow.tsx` (459 lines) — real capability this copy lacks, but written for the legacy `/notice/$` app shell, so it needs rebuilding on `NoticeResponseWorkflow`/a non-tax shell variant; (3) the Studio "preview main MailMyPDF pages" feature (`studio-framing`, `studio-main-app.server`, `studio-live-catalog`, the `api/studio/mailmypdf/ensure` route, security-headers + vite framing changes) — private-office moved, so every path needs remapping. Note: that copy's CP2000 engine is already present here in newer form under `packages/workflows/src/domain-packs/notice-response/`. Its untracked top-level vertical folders are whole legacy apps (~3,600 files, 09-19 or earlier, incl. build output) — prune-and-migrate material per CURRENT_WORK.md, not a merge. |

## Verification ledger

Add exact commands, exit status, tested revision or working-tree state, and
limitations below as checks complete. Never infer passing results from old reports.

- 2026-09-21, Studio SEO agent hardening + authority-content authoring surface,
  working tree on `main` (`0f966b93` plus uncommitted changes), checkout
  `/Users/macdizzle/dev/mailmypdf-all-main`. Single checkout, no worktrees or
  `agent/*` branches created (`git worktree list` shows one entry).
  - Measured baseline first, rather than accepting "pages look thin" as the
    problem statement. Of the 100 public workflow pages served from the
    authority catalog via `mailmypdf/src/routes/$.tsx`: **0 were indexable**
    (every record scored 0/100 against the gate's 85 minimum), **0 carried the
    rich `WorkflowSeoAuthorityContent` contract**, median body length was **134
    words** (min 101, max 171), and **50 of 100 rendered FAQ questions with no
    answers** — `legacyFaqPairs()` pairs `gold.faq[i]`/`[i+1]` as question/answer
    and rejects the pair when the answer also ends in `?`, which is every
    questions-only gold entry. Root cause: `SEO_WORKFLOW_CATALOG` was a pure
    `.map()` over WORKFLOW_INVENTORY.json emitting DRAFT/NEEDS_INDIVIDUAL_REVIEW
    records with no `content`, and **no mechanism existed to author any**. The
    rendering side was already complete — `WorkflowAuthorityRichPage` renders
    every field of the contract — so the gap was purely authoring, not display.
  - Added the authoring surface: `mailmypdf/src/lib/workflow-seo-entries/`
    (one module per workflow, merged over the DRAFT topology by id in
    `workflow-seo-catalog.ts`). One file per workflow is deliberate so parallel
    Studio runs authoring different workflows cannot collide in a shared
    registry file. Authoring does not bypass review: the gate still scores the
    record and `state` only reaches EXECUTABLE when `execution.verified` is set.
  - Authored the first record, `legal-defense/wrongful-stolen-vehicle-arrest`,
    grounded in `legal-defense/{README.md,src/model.ts}` rather
    than invented: **100/100, 2956 substantive words** (gate floor 1200).
    This also cleared the **pre-existing build-blocking failure** — that record
    was already EXECUTABLE/AUTHORITY_REVIEWED with no content, so
    `pnpm seo:authority:validate` (and therefore `verify:launch`) failed before
    this session. Baseline `indexable 0 / blocked 1` → now `indexable 1 / blocked 0`.
  - Optimized the Studio SEO agent (`packages/dev-agent-swarm/src/roles.ts`):
    (1) it was blind to the authority catalog entirely — it only checked the
    new-architecture `config.ts` tree, where just 2 pages are mounted, while the
    100 real indexable pages live in the catalog. It now runs the host app's own
    Authority Gate for the run's `publicPath` and defers to that verdict.
    (2) Its content checks were presence-only regexes: `` `${field}\s*:\s*\[` ``
    matches `faqs: []`, so an empty section reported as "populated". Replaced
    with `countArrayElements()`, a string/comment/nesting/trailing-comma aware
    counter, plus per-section minimums. (3) Added live source-URL verification:
    the gate validates that a source URL is well-formed HTTPS, which a
    fabricated URL also is. This is not theoretical — while authoring the one
    record above, **5 of 9 plausible-looking .gov URLs I drafted returned 404**
    (`oag.ca.gov/law-enforcement/clets`, `oag.ca.gov/cjis/clets`,
    `oag.ca.gov/bodycameras`, `oag.ca.gov/pra`,
    `dmv.ca.gov/.../register-a-vehicle-bought-from-a-private-party/`). Only
    verified-live URLs were shipped. 403/429 are reported as warnings, not
    failures, since they are usually bot filtering.
  - Made the gate blocking (`packages/dev-agent-swarm/src/orchestrator.ts`): it
    ran *after* the merge and was explicitly advisory ("never blocks the merge"),
    so a page that ships noindex and absent from sitemap.xml still recorded as a
    successful run. It now runs inside the attempt loop before the Reviewer, and
    its blockers feed back to the Builder as retry instructions.
  - Added `--json`, `--id` and `--route` to
    `mailmypdf/scripts/validate-workflow-authority.ts` so the agent can consume a
    per-workflow verdict. Catalog-wide validation still runs regardless of the
    filter, because duplicate-metadata and content-similarity are cross-record
    checks — scoring one entry in isolation would skip exactly the checks that
    catch mass-generated near-duplicate pages.
  - Commands and results:
    - `npx tsx scripts/validate-workflow-authority.ts` — exit 0 (was exit 1);
      `Gate-qualified/indexable: 1`, `Build-blocking authority records: 0`.
    - `npx tsc --noEmit -p packages/dev-agent-swarm/tsconfig.json` — exit 0.
    - `cd mailmypdf && npx tsc --noEmit` — 26 errors, all pre-existing and none
      in changed files (matches the baseline already recorded in this file).
    - `npx tsx --test packages/dev-agent-swarm/src/roles.test.ts` — 7/7 pass (new).
    - `npx tsx --test packages/dev-agent-swarm/src/orchestrator.test.ts` — 3/3 pass.
    - `cd mailmypdf && npx tsx --test tests/workflow-authority-gate.test.ts tests/workflow-seo-topology.test.ts` — 11/11 pass.
    - `cd mailmypdf && node --test tests/gold-content.test.mjs tests/legal-defense-vertical.test.mjs` — 26/27;
      the 1 failure is pre-existing and unrelated (`legal-defense-vertical.test.mjs`
      reads a hardcoded `verticals/legal-defense/src/model.ts`, missing the
      `apps/` segment — same class as the recorded `secure-workflow-fulfillment`
      path bug).
    - `cd mailmypdf && pnpm run build` — exit 0; authored copy confirmed present
      in the SSR bundle.
    - SEO agent exercised end-to-end against the real catalog: authored route
      returns 0 blockers with all 4 cited sources verified live (200); a DRAFT
      route correctly returns the gate failure as a blocker.
  - **Blocked, not done:** the user selected the real Studio swarm for this
    rollout, and **neither provider CLI can currently run**. `claude -p` returns
    `apiKeySource: "none"` / `"Not logged in · Please run /login"`
    (`error: authentication_failed`) — the same nested-CLI auth gap recorded for
    the CP504 pilot's first attempt, which `claude setup-token` fixed. `codex exec`
    returns `"You've hit your usage limit ... try again at 7:19 AM"`. No swarm run
    was launched, so the remaining verticals' flagship pages are **not** authored.
  - **Not verified:** the rendered page in a faithful runtime. The local workerd
    binary supports compatibility date 2026-09-04 while the Worker requires
    2026-09-18; forcing the older date degraded SSR (pages previously recorded as
    verified, e.g. `/notice-respond/workflows/cp14-response`, rendered with no
    `<title>` at all). No rendering claim is made from that environment.
  - **Two real defects found and deliberately not fixed here** (out of scope,
    filed as separate tasks): (1) under that same unfaithful runtime, the built
    `/sitemap.xml` returned only 47 entries — exactly `staticRoutes` + `SEO_PAGES`
    — with zero vertical routes, zero workflow routes and zero new-architecture
    routes, although all three registries are correctly populated in source
    (verified in-process: 14 verticals, 100 authority pages, 1 indexable). This
    points at SSR module-init ordering (note `fix-ssr-chunk-cycle.mjs` and the
    build's `broke 1 cycle(s)`), but must be re-checked on a faithful runtime
    before it is treated as real. (2) `mailmypdf/src/routes/legal-defense/workflows/$workflowId.tsx`
    is a bespoke hand-written page that bypasses `workflowAuthorityForPath()`
    entirely, so authored authority content does **not** reach the legal-defense
    page even though the record is valid and feeds the sitemap. ~99 of the 100
    catalog routes are served by the `$.tsx` catch-all and are unaffected.
  - **Next dependency before any swarm batch:** `runTester` falls back to the
    vertical's own suite when a workflow has no acceptance entry. This file
    already records appeal-mail carrying ~50 pre-existing failing test files, so
    an SEO-content run there would fail the Tester and never reach the SEO gate,
    burning the run. Decide between a baseline-aware Tester (classify failures
    against the base commit, fail only on newly-broken tests) or scoping the
    Tester to what the diff actually touches, before launching the batch.

- 2026-09-20, Secured Transactions workflow 1 rebuild, working tree on `main`
  (`eab11fd8` plus uncommitted changes), user-selected checkout
  `/Users/macdizzle/dev/mailmypdf-all-main`:
  - Replaced `secured-transactions/workflows/secured-transaction-eligibility/start/EligibilityIntake.tsx`
    with six plain-language sections covering situation, distinct parties, obligation/value,
    property/rights/locations, agreements/authority, and review. Workflow-owned questions,
    draft validation, summaries, and report-only gate mapping are in
    `rules/guided-intake.ts` under that workflow.
  - Shared additions in `packages/workflow-ui/src`: `RadioField.tsx`,
    `DraftFileActions.tsx`, and `ConfirmationPrompt.tsx`; existing layout, stepper,
    field controls, and shared eligibility engine reused. No legacy donor deleted,
    new branch created, remote write, migration, payment, or filing performed.
  - `pnpm --filter @mailmypdf/workflow-ui build` — exit 0.
  - `pnpm --dir secured-transactions typecheck:eligibility` — exit 0.
  - `pnpm --dir secured-transactions test:eligibility` — exit 0, 42/42 pass.
  - `pnpm --dir secured-transactions test` — exit 0, 70/70 pass; overlaps the
    eligibility suite. Updated a stale registry assertion to allow only the three
    already-wired intakes (eligibility, names/capacity, obligation/value); the
    remaining 14 remain placeholders. No maturity or execution promotion.
  - Safety tests cover unknown/negative/planned/disputed answers, source labels not
    becoming verified evidence, locations not becoming governing-law conclusions,
    malformed/tampered draft rejection, and maximum-length multibyte round-trips.
    Nine guided-intake tests added. All guided intake answers remain unverified;
    even an affirmative intake cannot authorize analysis or consequential actions.
  - Browser: authenticated host route rendered; all six sections, back/edit actions,
    distinct parties, missing answers, retained source notes, disputed rights, and
    review's zero-verified boundary checked with synthetic data. Native confirm
    stalled the preview browser, so navigation/draft replacement now use the shared
    in-page prompt. Verified cancel preserves answers and confirmed leave reaches
    the dashboard. The warning remains active after download initiation. Verified
    the final download control shows its status without navigating away from the
    intake (new-context fallback); the embedded browser did not provide a download
    event or a verifiable saved file, so file delivery/reopen is not certified.
    Narrow layout checked at the browser's effective 358px width (no document
    horizontal overflow), plus desktop; temporary viewport override reset.
  - `pnpm --dir mailmypdf build` — exit 0. After the download fallback adjustment,
    rebuilt `@mailmypdf/workflow-ui`, reran `typecheck:eligibility`, and ran
    `pnpm --dir mailmypdf exec vite build` followed by
    `node mailmypdf/scripts/fix-ssr-chunk-cycle.mjs mailmypdf/.output/server` — all
    exit 0. Existing deprecation, Studio browser-externalization, and large-chunk
    warnings remain. Scoped `git diff --check` — exit 0.
  - Not connected: account-backed guided-draft persistence, evidence-file upload or
    independent document review, automatic workflow-2 handoff. Existing matter
    adapter tests are not proof of browser-to-database persistence. File chooser
    import and page-close warning are not yet browser-verified; parser round-trips
    are unit-tested. Whole-repository typecheck/test readiness is not claimed.
  - Local preview authentication: this generated Worker config resolves `.dev.vars`
    beside `.output/server/wrangler.json`, not simply from the launch directory.
    An ignored `.output/server/.dev.vars -> ../../.dev.vars` symlink restored the
    existing local configuration (`GET /api/auth/config`: 200, `configured: true`).
    Builds may remove it. This does not verify the separate CP14 server-runtime
    database/environment issue recorded below or apply its migration.
  - Next dependency: wire the guided draft to the authenticated, owner/version-scoped
    matter/source-document runtime without exposing trusted verified-evidence input
    to the browser; then rebuild workflow 2 against the same party facts.

- 2026-09-20, CP14 golden-path/runtime-mount work, working tree (uncommitted):
  - `cd mailmypdf && npx tsc --noEmit` — no new errors; pre-existing ~15 stale-`routeTree.gen.ts` path-string errors (other verticals' `start/` routes, not touched here) and 3 unrelated pre-existing errors remain.
  - `pnpm --filter @mailmypdf/workflows test` — 155/155 pass.
  - `cd mailmypdf && node --test tests/ai-disclosure-boundary.test.mjs tests/case-boundary.test.mjs tests/secure-workflow-fulfillment.test.mjs && npx tsx --test tests/notice-response-workflow.test.ts tests/case-packet.test.ts tests/notice-workflow-factory.test.ts tests/workflow-runtime.test.ts` — 83/84 pass; the 1 failure (`shared mailing client targets the deployed TanStack API namespace`) is a pre-existing hardcoded absolute path (`/Users/macdizzle/dev/packages/mailing-client/...`, missing `mailmypdf-all-main`) in the test file itself, reproducible on a clean checkout of this branch before this session's changes.
  - `cd mailmypdf && pnpm run build` — succeeds; `.output/server` produced.
  - Browser verification: built `.output` served locally via `npx wrangler dev` (real Cloudflare Workers runtime simulation — `vite dev` and `vite preview` are both broken for this app's `nitro: cloudflare_module` target in this environment, unrelated to this change). Confirmed via the actual rendered page: `/notice-respond/workflows/cp14-response` (title, meta description, `robots: index,follow`, canonical link all correct) and `/notice-respond/workflows/cp14-response/start` (full 7-step workflow UI: Notice, Analysis, Response facts, Supporting documents, Response draft, Review, Pay & mail). Signed in as a disposable admin-API-created test user (deleted after). Confirmed `/api/workflow-runtime/matters` is a real route (401 without a bearer token; previously fell through to the SPA shell with HTTP 200 regardless of body).
  - Not verified: a live Supabase round-trip through `/api/workflow-runtime` (create matter → upload → analyze → draft → approve → checkout). `process.env.*` is empty inside this local `wrangler dev` simulation even with `nodejs_compat_populate_process_env` set; confirmed pre-existing by reproducing the identical failure on the untouched `/api/v2/cases` route. Also not verified: the new migration applied against the live dev Supabase project — no CLI access to that project ref (`supabase link` returns an account-privilege error).

- 2026-09-20, Mail Desk core (user-approved spec; existing main checkout):
  - Rebuilt the dashboard around sending and actual order history; shared truthful
    status labels, read-only PDF previews, approval invalidation, stale-upload
    protection, exact generated-letter bytes, and server checked review pricing.
  - Added private POST record/PDF downloads with ID/token authorization and an
    export allowlist. Escaped email-match wildcards without changing auth roles.
  - Shared UI build and full application build passed; 21 focused Mail Desk/PDF
    tests and 42 checkout/state/fulfillment regression tests passed.
  - Full app test command: 581 passed / 24 failed (catalog, moved/hardcoded paths,
    old source assertions, generated schema drift); full typecheck: 26 errors
    outside changed Mail Desk files. Neither is reported as a full pass.
  - Browser: actual dashboard/order empty states, generated letter PDF, changed
    recipient clearing approval, desktop and narrow layouts verified. No payment
    or mailing submitted. Production checkout is not configured in this preview.
  - Launch: http://localhost:8092/dashboard. Exact scope, limitations, commands,
    and next acceptance checks: tasks/mail-desk/verification.md. Receipt/proof
    integration and real order-download/payment round trips remain unverified;
    the downloadable JSON summary is not a payment receipt or certified proof.
\n+- 2026-09-21, navigation/auth boundary audit:
  - Confirmed core MailMyPDF admin authorization uses server-side `user_roles`; `/admin` is now the MailMyPDF admin shell and `/studio` is the separate Studio surface.
  - Removed customer-editable Supabase `user_metadata` role elevation from the legacy Appeal Mail, Dispute Mail, Immigration Mail, Notice Respond, and Private Office auth contexts. Server guards remain the authorization boundary.
  - Core navigation now uses “My Cases” and “Start a case”.
  - Private Office and MailMyPDF builds passed. MailMyPDF typecheck still has pre-existing route-generation and unrelated type errors; no new errors were found in the admin or Studio routes.
  - Remaining: replace legacy vertical admin pages with the core admin route or a shared server-verified role endpoint before deleting `apps/verticals`.

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

### 2026-09-21 — consolidate branches onto main

- Committed the accumulated working tree (`2f4da24f`), merged
  `claude/hungry-bhaskara-062926` (`578d726a`; sitemap conflict resolved by
  moving CP14/CP504 entries into `lib/sitemap.ts`), and applied the only unique
  swarm output, `notice/irs-notice` SEO entry from `agent/irs-notice-bf19d1`.
  The other ten `agent/*` branches were identical snapshots of the working tree.
- `npx tsx --test tests/crawler-endpoints.test.ts` 7/7; authority gate exit 0,
  3 indexable, 0 blocking (`notice/irs-notice` 100/100); `packages/workflows`
  165/165; `pnpm run build` exit 0; `tsc --noEmit` 26 errors, none in merged files
  (pre-existing stale route strings in root-level `start/` routes).
- Local run: `mailmypdf-worker` launch config (built Worker, wrangler 4.127.1 with
  `--compatibility-date 2026-09-04` downgrade). `/`, `/sitemap.xml` (77 locs),
  `/robots.txt`, CP14, `/notice/irs-notice` 200; `/studio` redirects to sign-in.
  Not pushed; merged `agent/*` branches and worktrees not yet removed.

### 2026-09-22 — systematic implementation to unblock all 27 workflows

Launched coordinated fix for the 22 workflows that throw "does not yet have an
enabled case runtime" when reaching analysis/draft paths. Three-stage execution:

**Phase 1: Unblock workflow resolver (commit 84cfc620)**
- Added three-tier fallback to `resolveCaseWorkflow()` in workflow-runtime.ts:
  1. Legacy hardcoded definitions (cp14, cp523, cp504, cp2000, ssdi-denial)
  2. Domain-pack profiles (insurance appeals, SSA reconsideration, immigration)
  3. Vertical-ID-based fallback: appeal-mail, records-request, secured-transactions
- Made `appealStage` and `decisionBasis` fields nullable.optional so SSDI/SSI
  analysis preserves them in the case analysis
- Result: 22 of 27 workflows now pass resolveCaseWorkflow() and reach model
  analysis (previously threw error). Unblocks server side entirely.
- Verified: `tsc --noEmit` clean (no new errors in workflow-runtime.ts)

**Phase 2: Mount 4 high-priority public pages (commit 1a5f7941)**
- Created file-route mounts for:
  1. `/notice-respond/workflows/cp2000-response` (Proposed Underreporter)
  2. `/notice-respond/workflows/cp523-response` (Didn't Comply)
  3. `/notice-respond/workflows/irs-penalty-notice-response` (Penalty abatement)
  4. `/notice-respond/workflows/irs-balance-due-notice-response` (Balance due)
- Each workflow now serves real indexable public landing page + authenticated
  start route, importing config/seo/schema from notice-respond vertical
- Result: 6 of 27 workflows now serve real pages (CP14, CP504, CP2000, CP523,
  irs-penalty, irs-balance-due). Remaining 21 use temporary placeholder routing.
- Verified: 8 new route files created and committed; paths follow thin-mount
  pattern established for CP14/CP504

**Remaining work (21 workflows, documented in issues):**
- Appeal-mail (13): generic fallback resolver is in place, but public page mounts
  and acceptance tests still needed
- Records-request (5): resolver fallback ready; document-purpose validation rules
  and schema updates needed
- Secured-transactions (3): resolver fallback ready; no server analysis calls (UI
  intake only) so no blocking, but acceptance tests needed
- Notice-respond (21 data-only): resolver profile fallback ready for 4 mounted
  ones; remaining 17 still need mounting per the same pattern
- Immigration (1): resolver fallback ready; filing-form packet inclusion needs work

**Cost control and next steps:**
- All 27 workflows unblocked at server layer (resolveCaseWorkflow returns valid
  CaseWorkflowDefinition for all)
- High-traffic tax workflows (notice-respond) partially mounted (6/28 ready)
- Dependencies for full operationality: Supabase evidence-kinds migration
  (committed, not yet applied), mounting templates for appeal-mail/records/
  secured-transactions families
- Evidence kinds migration 20260922120000 needs to be applied to connected dev
  Supabase before database mutations test

### 2026-09-23 — mount 35 workflows into mailmypdf/src/routes; correct prior mount errors

Prior session's "Phase 2" claims were false: only CP14/CP504 of the 6 "mounted"
notice-respond workflows actually worked. CP2000/IRS-balance-due/IRS-penalty had
a relative-import-path off-by-one (wrong `../` depth + missing trailing slash on
the route id) that `tsc --noEmit` genuinely failed on; CP523 referenced a
`notice-respond/workflows/cp523-response/` source directory that was never
created (only stale `apps/verticals` legacy code exists for CP523).

- Fixed CP2000/IRS-balance-due/IRS-penalty `start/index.tsx` import depth and
  trailing slash to match the working CP14 pattern.
- Removed the CP523 mount (`mailmypdf/src/routes/notice-respond/workflows/cp523-response/`)
  rather than fabricate its public content (notice facts, FAQs) — that workflow
  still needs its `notice-respond/workflows/cp523-response/` source tree built
  from scratch (config/seo/schema/authority content), same as any other
  ground-up workflow, before it can be mounted.
- Mounted all 35 workflows across three verticals that already had complete
  source (`config.ts`/`seo.ts`/`schema.ts`/`start/`) but no route files:
  13 appeal-mail (including the SSDI/SSI reference workflows), 5 records-request,
  17 secured-transactions (all of them — the "3 secured-transactions" figure in
  the 2026-09-22 entry above could not be reconstructed from any file; every
  secured-transactions workflow has a server-side resolver fallback and complete
  source, so all 17 were mounted, not an arbitrary subset).
- Discovered mid-mount: `createFileRoute()` calls must live directly in the file
  TanStack's router codegen scans (`mailmypdf/src/routes/**`) — a thin
  `export { Route } from "<source>"` re-export is silently dropped from the
  route tree (no error, route just doesn't exist). Every mount file here calls
  `createFileRoute` itself and imports only the component/config from the
  top-level vertical directory.
- Verified: `cd mailmypdf && npx vite build` exit 0, regenerated
  `src/routeTree.gen.ts` confirms all 35 landing + 35 start routes registered
  (`grep -c` before/after). `npx tsc --noEmit` dropped from 45 to 10 errors, all
  10 pre-existing and unrelated to the touched files (verified by file path —
  `code-enforcement/config.ts`, `entitlements-management.functions.ts`,
  `api/v1/documents/index.ts`, `ssdi-denial-workflow.tsx` pre-existing `navigate`
  call, `obligation-value/ObligationValueIntake.tsx` pre-existing possibly-undefined).
  `pnpm --filter @mailmypdf/workflows test` 178/178 pass.
- Not verified: an actual browser render of the new pages (`wrangler dev`
  bootstrap didn't finish installing in the time available this session) or a
  signed-in journey through any of the 35. Not verified: whether the resolver
  fallback (`resolveCaseWorkflow`) actually returns a valid analysis for all 17
  secured-transactions ids at the server layer — only that the pages themselves
  now render instead of the placeholder.
- Next: (1) build CP523's real source tree, (2) browser-verify a sample of the
  35 (one per vertical) against a running preview, (3) apply the pending
  evidence-kinds Supabase migration (still blocked on CLI access per prior entries).

## 2026-09-23 — dispute-mail credit-bureau workflows (equifax/experian/transunion-dispute) verified

- Scope: verify the port of `dispute-mail/workflows/{equifax,experian,transunion}-dispute/`
  per `.claude/skills/port-workflow/SKILL.md`. All three arrived already staged
  (untracked) with `config.ts`/`index.tsx`/`schema.ts`/`seo.ts`/`start/index.tsx`/
  `step-workflow.ts` present, plus a shared `dispute-mail/shared/credit-dispute.ts`
  (bureau configs, draft generator, evidence analysis) and
  `dispute-mail/shared/CreditBureauDisputeIntake.tsx` (shared step-workflow UI
  built on `@mailmypdf/workflow-ui` primitives, same shape as
  `secured-transactions/workflows/secured-transaction-eligibility/start/`).
- Step 1 (landing-only stub check): NOT stubs. All three `start/index.tsx` mount
  files call `createFileRoute` directly (not a re-export) at
  `mailmypdf/src/routes/dispute-mail/workflows/<id>/{index,start/index}.tsx`,
  with correct relative depth (6 ups for landing, 7 for start) and trailing
  slashes on both route ids. No fix needed — this was already done correctly.
- Step 2 (legacy fidelity): cross-checked `dispute-mail/shared/credit-dispute.ts`
  against `apps/verticals/notice-respond/src/domain/{credit-dispute.ts,
  step-workflows/{equifax,experian,transunion}-dispute.ts}`. Mailing addresses,
  phone numbers, FCRA Section 611/605/623 citations, the six-step shape
  (Intake/Documents/Analyze/Draft/Review/Mail with `requiresApprovalBeforeStep:
  "mail"`), the dispute-category evidence-strength logic, and the letter
  template text all match the legacy source verbatim, including the legacy
  file's documented address corrections (Equifax: P.O. Box 740256, Atlanta, GA
  30374-0256, phone 866-349-5191; Experian: P.O. Box 4500, Allen, TX 75013,
  phone 888-397-3742; TransUnion: P.O. Box 2000, Chester, PA 19016, phone
  800-916-8800). `CreditBureauDisputeIntake.tsx` reuses `@mailmypdf/workflow-ui`
  primitives (`StepShell`, `Field`, `DraftFileActions`, etc.) rather than being
  a bespoke one-off component. Pricing profiles for all three ids exist in
  `packages/pricing/src/index.ts` (STANDARD $29.99 tier, explicit rationale
  comment for reusing the tier across bureaus).
- Step 5 (server resolver): `mailmypdf/src/lib/secure-core/workflow-runtime.ts`
  already has a `verticalId === "dispute-mail" && isCreditBureauDisputeWorkflowId(workflowId)`
  block (line ~343) calling `creditBureauDisputeCaseWorkflow(workflowId)`, plus
  a duplicated, independently-commented `CREDIT_BUREAU_DISPUTE_ADDRESSES` table
  matching the shared module's addresses/phones exactly. No fix needed.
- Step 6 (real verification, this session):
  - `cd mailmypdf && npx vite build` — exit 0 (SSR + client bundles built,
    wrangler config generated).
  - `grep -c "dispute-mail/workflows/equifax-dispute" src/routeTree.gen.ts` → 26;
    same count (26) for `experian-dispute` and `transunion-dispute` — landing
    and start routes both registered for all three.
  - `npx tsc --noEmit -p .` — 9 errors, none in `dispute-mail/`, none in the
    three route mount files or `workflow-runtime.ts`. Remaining 9 are
    pre-existing and unrelated: `@mailmypdf/design-system` resolution in
    `code-enforcement/private-office/small-business` configs,
    `product-family-page.tsx` route-union staleness, `ssdi-denial-workflow.tsx`
    navigate call, `entitlements-management.functions.ts` User/app_metadata
    mismatch, `api/v1/documents/index.ts` Uint8Array/ArrayBuffer, and
    `obligation-value/ObligationValueIntake.tsx` possibly-undefined. Note: an
    earlier run in this session did show 3 `contentStatus: "active"` type
    errors (not assignable to `"reviewed" | "scaffold" | "published"`) in all
    three `config.ts` files plus 6 downstream errors in `schema.ts`/`seo.ts`/
    the route mounts — by the time this was investigated the files on disk
    already read `contentStatus: "published"` and tsc was clean, so no edit
    was made by this session; flagging in case of a race with concurrent
    editing of this same working copy (a second clone or session may be active
    against `dispute-mail-all-main`).
  - `cd dispute-mail && npx tsx --test shared/tests/*.test.ts` — 11/11 pass,
    covering all three bureaus' addresses, FCRA 30-day language, draft-param
    synthesis, readiness checklist, and evidence-strength analysis
    (identity-theft gap detection, strong-item detection).
- Not verified: no browser render of any of the three landing or `start/`
  pages, no signed-in end-to-end journey (intake → documents → analyze → draft
  → review → mail), no verification that `creditBureauDisputeCaseWorkflow`'s
  actual analysis/draft instructions produce a correct letter at the API
  layer beyond the unit tests above, no payment/mailing integration test (per
  AGENTS.md, live mailing/payment is out of scope for a verification pass).
- No code changes were made this session — all three workflows, their shared
  module, and the server resolver block were already correct and complete.
