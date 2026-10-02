# Persistent Factory Job orchestrator

The workflow factory control plane persists supervised work as versioned jobs rather than treating planning, certification, and build preparation as unrelated requests.

## Safety model

A factory job is a deterministic state snapshot with an append-only transition history. The database stores the canonical JSON snapshot plus indexed status/stage columns. Every transition supplies the expected revision; a stale concurrent writer is rejected before a second transition can be recorded.

Factory tables are service-role only. RLS is enabled and no anonymous or authenticated browser policies are granted. Studio routes must first resolve a verified administrator and attribute that actor to the durable event.

## Current automatic stages

The supervised runner automates only behavior already proven by shared packages:

1. `intake` validates and persists the problem description.
2. `match` runs the canonical reuse planner against the current registry and live connector tool surface.
3. `certify` re-runs canonical chat certification for a selected existing workflow.
4. A certified existing workflow stops at explicit review before completion.
5. A problem that requires a new template stops at `template_review`. The reviewer must persist a supported family, canonical workflow ID, and label.
6. The deterministic `build` planner regenerates the materialization recipe and moves the job to `acceptance`; it does not touch the filesystem.
7. The first machine executor is local-admin-only and supports reviewed `records-request` recipes. It creates an isolated branch/worktree from fresh `origin/main`, generates a non-indexable scaffold/profile/spec, runs the existing materializer, commits only allow-listed files locally, and persists branch/commit evidence.
8. `acceptance` runs materialization drift, shared workflow factory/chat tests, exact generated-workflow certification, Records Request tests/acceptance, and a completely clean-tree check.
9. Passing generated builds stop at `publication_review`.

The executor never pushes, creates a pull request, merges, deploys, charges, or mails. A Notice Response recipe can be reviewed and persisted, but machine execution remains blocked until a structured Notice Response profile adapter exists.

## Durable API

Studio exposes admin-only endpoints under `/api/studio/workflows/jobs` to create/list jobs, inspect one job and its events, resume implemented deterministic stages, approve a review boundary, and cancel a job.

Creating a job immediately runs all currently implemented deterministic stages until the first review/build boundary. A job can then be left and resumed later from the durable queue.

## Build evidence

The durable Factory Job keeps the reviewed deterministic build recipe separately from execution evidence. Optional `buildArtifact` data records the isolated branch, base SHA, local commit SHA, spec/config/profile paths, exact changed-file list, acceptance commands/results, and build timestamp. Older `mailmypdf.factory-job/v1` snapshots without that field remain valid.

Generated Records Request profiles live in a separate machine-owned registry. Existing core family profiles are not spliced or rewritten. Generated landing copy is deliberately a non-indexable scaffold and requires later editorial/publication review.

## Next executor

The next slice is the **publication/PR executor**: take a passing generated proposal at `publication_review`, verify the persisted local branch/commit still matches the recorded artifact, push only that branch, create a pull request containing the acceptance evidence, and stop for explicit merge/publication review. Merge and deployment remain separate explicit actions.


## Pull request publication boundary

After a generated Records Request proposal passes the local supervised acceptance suite, Studio exposes one explicit **Create GitHub PR** action.

The publication executor remains a machine-level Studio operation:

- localhost plus verified administrator access is required;
- the retained local proposal branch must still point to the exact accepted commit;
- the fetched remote default branch must still equal the exact base commit used during acceptance, otherwise the proposal must be rebuilt;
- an existing remote proposal branch is reused only when it already points to the accepted commit;
- an existing open pull request for the same head/base is reused on retry;
- GitHub PR metadata is persisted in the durable Factory Job before the job completes.

Publication means **push the accepted proposal branch and open a pull request for human code review**. It does not merge the pull request, deploy production, charge a customer, or submit mail.


## Reviewed Notice Respond family adapter

Notice Respond now has a supervised factory adapter parallel to Records Request, with an additional review requirement because notice-specific analysis and drafting rules can be legally consequential.

- A new Notice Respond template cannot be approved without a structured reviewer-authored `noticeProfile`.
- The profile explicitly supplies notice identity, primary-document schema, source purpose, allowed response modes, evidence kinds, explanation requirements, requested-action default, analysis instructions, and drafting instructions.
- The factory validates and preserves that profile. It does not infer legal authority, deadlines, mailing destinations, remedies, eligibility, appeal rights, or response modes.
- Generated profiles are stored separately from the hand-authored core IRS profiles in machine-owned generated profile registries.
- The shared Notice Respond runtime/factory artifact resolves generated canonical IDs through the same manifest and runtime-policy contracts as core profiles.
- The isolated executor runs materialization drift, workflow/chat certification, Notice Respond unit tests, Notice Respond acceptance tests, and a clean-tree check before publication review.
- Generated landing copy remains scaffold-only and non-indexable.
- The shared Notice Respond UI no longer falls back to IRS-specific issuer or recipient labels when a generated non-IRS notice profile is used.

Publication still means opening a GitHub pull request for the exact accepted commit. Merge and deployment remain separate.
