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
