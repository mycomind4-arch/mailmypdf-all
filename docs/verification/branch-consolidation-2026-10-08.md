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

The six approved retirements would leave 33 heads: main, 13 open-PR heads,
and 19 other preserved histories. All 13 open PRs reported merge conflicts
at audit time; their changes require reconciliation with current main.
Production hardening #152, reference journeys #153, pricing #126 and binary
SSA template review #156 remain open. Other preserved work includes factory,
SSA, connector, architecture, backup and generated PDF attempts.

Issue #158 tracks the remaining review. No application deployment, payment,
mailing, or change to customer prices is part of this cleanup.
