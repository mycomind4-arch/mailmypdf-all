# Branch consolidation — 2026-10-08 continuation

Audited all 39 remote heads against `main` at
`3528bc228d371edaec3e2df65a487a36d9363b6d` using complete Git history,
merge bases, final changed-file content, and stable commit patch IDs.
The initial cleanup already removed 62 incorporated branches. This pass
retires superseded histories without reintroducing old application code.

## Reviewed retirements

| Branch | Evidence |
| --- | --- |
| `build/identity-capacity-foundation` | All 11 patch IDs are present in main. Eight foundation files are byte-identical; exports and workspace references retain the foundation and later engines. |
| `build/identity-capacity-foundation-v2` | Same final foundation tree and 11 patch-equivalent commits; main extends this implementation. |
| `verify/identity-capacity-ci` | Only changes README. Main preserves its documented evidence/review boundaries and documents the later engine suite. |
| `verify/search-strategy` | Only adds the search-strategy coverage sentence already present in main's README. |
| `verify/search-strategy-v2` | Identical documentation patch to the preceding branch. |
| `factory/catalog-family-planner` | Its two authored files were integrated by PR #149. Main adds a correct indexable sectionFallback type and source-driven registry tests instead of obsolete 441-count assertions. |

Exact tips, audited main SHA, current main blob fingerprints and reasons are
recorded in `.github/scripts/reviewed_branch_retirements.json`. Each retirement
requires a verified remote `archive/branch-cleanup-2026-10-08/<branch>` tag before
exact-SHA leased deletion. Existing conflicting tags are never overwritten.
Open PR heads/bases, protected branches, moved tips, changed main evidence,
rewritten main history and failed archives remain preserved.

The Action runs guard tests before making changes. Local verification:
22 regression tests passed; all six entries passed evidence verification
against the fetched repository. The Action's remote archive/deletion logs are
the authority for completed deletion, not this approved manifest.

## Remaining queue

The completed Action [37831447800](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37831447800)
passed all 22 guard tests and archived/deleted all six heads with zero failures.
Independent `git ls-remote` verification confirmed all archive tags point to their
exact reviewed tips and the deleted heads are absent. **33 remote branches remain:**
main, 13 open-PR heads, and 19 other preserved histories. All 13 open PRs reported merge conflicts
at audit time; their changes require reconciliation with current main.
Production hardening #152, reference journeys #153, pricing #126 and binary
SSA template review #156 remain open. Other preserved work includes factory,
SSA, connector, architecture, backup and generated PDF attempts.

Issue #158 tracks the remaining review. No application deployment, payment,
mailing, or change to customer prices is part of this cleanup.

Do not treat PR #89 as redundant solely from its title: its old prebuild command
includes document-intelligence and registry-adapters, while the current prebuild
selector dependency closure does not include those packages. PR #133 also adds
workflow-artifact-plan and gold-slice test files absent from main. These findings
justify continued preservation and focused integration review.

## Further reviewed retirements — 2026-10-08

Two additional non-PR branch heads were retired through the exact-tip archive
and lease-guarded deletion workflow, with both Actions successful:

| Retired branch | Evidence and durable archive | Verification |
| --- | --- | --- |
| `fix/cp2000-public-landing` | Every line of its CP2000 workflow config is already included in `main`, which adds official guidance and safe-response detail. The branch's notice-specific shared landing component was superseded by the generic template in `main`. Original tip `7e5891569a64de5eb21508d262452aa6ba01cee4`, archived under `archive/branch-cleanup-2026-10-08/fix/cp2000-public-landing`. | [Successful Action 37834140817](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37834140817); remote branch absent; archive tag SHA verified. |
| `backup/github-main-before-local-replace` | Its only unique path against its merge base was a historical `pnpm-lock.yaml`. The current lockfile remains on `main`; original backup tip `4ad3359a9e02f0e4d32a9c00d73642ec6538ca99` is preserved under `archive/branch-cleanup-2026-10-08/backup/github-main-before-local-replace`. | [Successful Action 37834294011](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37834294011); remote branch absent; archive tag SHA verified. |

**New snapshot: 31 remote branches = 1 main + 13 open-PR heads + 17 other preserved histories.**
The first two further retirements changed only GitHub branch/archive references and
the reviewed-retirement manifest, not application runtime behavior.

The remaining seven `automation/normalize-trusted-workflow-assets-<run-id>`
heads still have individually different binary Git blobs even where byte lengths
match; retain them until #156's trusted PDF provenance and outputs are reviewed.
The legacy `build/core-new-architecture-bridge` head refers to removed
`apps/mailmypdf/*` paths absent from current `main`, and other unverified
changes to `packages/workflows/*`; it remains preserved for architectural
reconciliation rather than being force-merged or deleted.

## Further integration and retirement — 2026-10-08

### Plugin annotations: PR #160

[PR #160](https://github.com/mycomind4-arch/mailmypdf-all/pull/160) was
squash-merged to `main` as commit `6ff4c6c59297eba09b4372a874c126b6ab7705a8`
with **20/20 CI jobs successful**. The canonical plugin submission validator
now cross-checks each of 38 MCP tools' documented True/False safety claims
against its published annotations, and protects consequential tool boundaries.

The historic `feature/plugin-annotation-justifications` review branch covered
only 15 tools. All 15 original annotation values were independently verified
to match the current 38-tool submission materials. Its exact historical tip
`e00d3d32d37bf2ae9ffe0eea2c5e9e6ef8ea8358` has been archived at
`archive/branch-cleanup-2026-10-08/feature/plugin-annotation-justifications`
and the branch head was removed by a passing guarded cleanup run.

### Build script: PR #89

[PR #89](https://github.com/mycomind4-arch/mailmypdf-all/pull/89)
was **closed, not merged**: it edited only the retired
`apps/mailmypdf/package.json` prebuild. The current canonical host at
`mailmypdf/package.json` already builds all 18 of the old PR's dependencies
(including document-intelligence and registry-adapters), via dependency-aware
workspace filters. Its tip `b71de27a753d33e5f0453540c447b77908db5fac`
was archived under
`archive/branch-cleanup-2026-10-08/chat/mailmypdf-prebuild-runtime-deps`.
[Action 37835279999](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37835279999)
confirmed a successful guarded branch cleanup.

### Architecture documentation: PR #161

[PR #161](https://github.com/mycomind4-arch/mailmypdf-all/pull/161)
was squash-merged as `339ec310bab61d7416210045d14e2b2f4d4f12ac`.
`MAILMYPDF_APPLICATION_TOPOLOGY.md` now correctly identifies `mailmypdf/`
as the single TanStack host, all 15 top-level sections, the canonical
`mailmypdf/src/lib/section-registry.ts`, and the explicitly noncanonical
`apps/verticals/**` donors. No runtime components were modified.
Its short-lived review branch was pruned on successful
[Action 37835823028](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37835823028).

### Snapshot and preservation boundaries

**Verified: 29 remote branches = 1 main + 12 open PR heads + 16 other
preserved histories.**

- Preserve #88 for its remaining distinct topology policy/checks until reviewed
  against the now-corrected canonical document. Do not merge the old
  `apps/mailmypdf`/deprecated workspace content.
- Preserve #85 and #90: the P11 capability truthfulness changes are still
  absent from current `packages/workflows/src/pipeline-registry.ts`.
- Preserve #152, #153, #133, #124, #126, #99, #91, #86 and #156 pending
  conflicts, tests, provider security and binary provenance review.
- Preserve the seven run-suffixed SSA PDF branches; distinct binary blobs
  have not been verified against #156.
- Do not claim completion of production deployment, mailing tests, Stripe/Lob
  live transactions, or the 449-workflow factory from these repository
  cleanup changes.

## P11 and topology reconciliation — verified 2026-10-08

### P11 secured-transactions correction

[PR #162](https://github.com/mycomind4-arch/mailmypdf-all/pull/162)
was merged at `88cd2a19ccd8a7a9a59a52fe05487f7a02848a99`
with all six PR workflow suites green, including secured-transactions,
shared capability, Notice Respond, Records Request, SSDI Appeal and the
20-job workspace verification. The new P11 baseline requires
`findings`, `requirements`, `validation`, `blockingGate`, and
`review`. Specialist capabilities remain selected by each workflow.
The eligibility manifest now declares only its six exercised capabilities,
while the section registry still recognizes three wired intakes.

Old draft PRs [#85](https://github.com/mycomind4-arch/mailmypdf-all/pull/85)
and [#90](https://github.com/mycomind4-arch/mailmypdf-all/pull/90)
were closed unmerged after source comparison; their heads
`ba2caf78b153ecbefda729000c5443dc71de72b9` and
`3632bc4d9a1d264d4c082fd70295123d5d117247` were archived under
`archive/branch-cleanup-2026-10-08/<old-branch>` before removal.
[Action 37837046334](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37837046334)
completed successfully; both exact archive SHAs and absent remote heads
were verified independently.

### Canonical topology guard

[PR #163](https://github.com/mycomind4-arch/mailmypdf-all/pull/163)
merged at `8e8ea4e4cfd5aeb11e9289f7eb1a210dd21d9278` after
20/20 workspace jobs passed. It retains useful checks from old
topology PR #88: only canonical scoped names for activated section packages,
and no duplicate `apps/verticals/secured-transactions` implementation.
It does not restore the retired `apps/mailmypdf` host.

**Do not delete branch `chat/canonical-topology-source-of-truth` just yet.**
PR #88 is closed without merge, but contains separate legacy-donor build
and Private Office compound-workflow CI tests whose current coverage has
not been proven equivalent. The exact historic tip remains preserved under
its existing branch ref pending parity review. The current canonical
topology document (#161) and guard (#163) supersede its outdated host
references, not necessarily its entire legacy-test matrix.

### Deployment state is distinct from code verification

[Deployment run 37837370411](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37837370411)
failed **before deployment**, at the required-secret preflight gate.
Its missing GitHub Actions configuration includes Cloudflare account/token,
Supabase server secret, Lob webhook secret, background-job secrets and
sandbox payments webhook secret. The deployment job skipped uploading and
public verification. The successful branch/CI work above does **not**
establish a new production deployment; credentials require separate
authorized configuration and another verified deployment run.

### Latest independently verified snapshot

**27 remote branches = 1 permanent `main` + 9 open PR heads + 17
other preserved branch heads.** The two short-lived review branches from
#162 and #163 were also deleted by the successful safe-pruner workflow.
No distinct unreviewed branch was intentionally discarded.

## Legacy donor compatibility reconciled — PR #164

[PR #164](https://github.com/mycomind4-arch/mailmypdf-all/pull/164)
merged as `b912c6e30100f44724764d24edecb5d4af5f7feb`, adding
`.github/workflows/legacy-donor-compatibility.yml` alongside (not inside)
canonical `workspace-ui-ci.yml`. It preserves the legacy donor parity checks
from old PR #88, without reintroducing the retired `apps/mailmypdf` host.
It is triggered on donor changes and is also dispatchable.

The older PR named thirteen donors, but only ten still have extant package
manifests. The new matrix builds those ten, and runs the six legacy
Private Office compound-workflow, authorization and capability suites.
Three deleted legacy donor package directories are intentionally excluded:
`claim-proof`, `permit-reply` and `tenant-reply`. The canonical
top-level section roots remain separately verified in the current host.

The initial run exposed actual missing built workspace dependency exports,
notably `@mailmypdf/design-system/public`. A correct
`<package-name>^...` dependency-closure build now precedes each donor build.
[Action 37840372064](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37840372064)
completed with **10/10 jobs successful**, including all six Private Office
safety regression suites. This is a compatibility CI result, not a production
deployment or evidence that legacy donor apps should be deployed.

Old [PR #88](https://github.com/mycomind4-arch/mailmypdf-all/pull/88)
had already been closed unmerged. Its canonical host/topology portion was
superseded by #161 and #163; its donor checks are now reconciled by #164.
Exact historic head
`f089372f07b56264b78dcc774d3055532b6e066b` is preserved at
`archive/branch-cleanup-2026-10-08/chat/canonical-topology-source-of-truth`
and the branch head was deleted by
[successful guarded Action 37840857260](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37840857260).
The old branch and temporary #164 review branch are both absent.

**Verified snapshot: 26 remote branches = 1 main + 9 open PR heads +
16 other preserved histories.** The 16 preserved histories are not all safe
to retire yet. In particular, the generated-PDF runs and the factory and
CP14 runtime implementation heads still require review.

GitHub deployment preflight is still blocked by missing authorized secrets
per [run 37837370411](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37837370411).
Green build/CI does not establish deployment.

## Scheduled mailing partial-batch failure isolation — PR #165

[PR #165](https://github.com/mycomind4-arch/mailmypdf-all/pull/165)
was squash-merged at `4a135ed5b052615a7fe63d0e963442cc260ec333`.
It extracted one safety/reliability change from unmerged #152: the authenticated
`/api/internal/scheduled-mailings` POST handler now returns HTTP 500 with
`ok:false` and the existing request ID if a due batch reports any failed
individual schedule in `results[].error`. Previously the batch could
respond `ok:true` even though downstream work failed. Explicitly deferred
schedules do not trigger this error branch.

`mailmypdf/tests/jobs-are-scheduled.test.mjs` now verifies the failure
check occurs before the successful HTTP 200 response and accurately records
that `scheduled-mailings` is **not** an activated Worker cron job. This
test was added to `.github/workflows/workspace-ui-ci.yml`'s core payment/
fulfillment verification. [Workspace UI verification
37841264245](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37841264245)
completed with **20/20 jobs successful**; the public landing gate also
passed. No payment, Lob fulfillment, live deployment or automatic cron
activation was performed by this PR.

The temporary `hardening/scheduled-mail-batch-failures-20261008` review
branch was automatically retired by
[successful Action 37841718663](https://github.com/mycomind4-arch/mailmypdf-all/actions/runs/37841718663).
PR #152 and its implementation history remain open/preserved for distinct
unmerged hardening changes (deployment prerequisite gates, scheduled-worker
dispatch semantics, Stripe payment/webhook integration, secure remote file
allowlists, etc.). Do **not** retire or force-merge #152 as part of this change.

**Current independently verified snapshot: 26 remote branches = 1 main +
9 open PR heads + 16 other preserved histories.** Production deployment
remains unverified because required GitHub Actions secrets are missing;
the latest relevant deploy preflight failed without uploading the Worker.
