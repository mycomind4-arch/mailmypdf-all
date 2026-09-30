# Persistent Factory Job orchestrator

The workflow factory control plane persists supervised work as versioned jobs rather than treating planning, certification, and build preparation as unrelated requests.

## Safety model

A factory job is a deterministic state snapshot with an append-only transition history. The database stores the canonical JSON snapshot plus indexed status/stage columns. Every transition supplies the expected revision; a stale concurrent writer is rejected before a second transition can be recorded.

Factory tables are service-role only. RLS is enabled and no anonymous or authenticated browser policies are granted. Studio routes must first resolve a verified administrator and attribute that actor to the durable event.

## Current automatic stages

The supervised runner automates only behavior the repository can prove:

1. `intake` validates and persists the problem description.
2. `match` runs the canonical reuse planner against the current registry and live connector tool surface.
3. `certify` re-runs canonical chat certification for a selected existing workflow.
4. A certified existing workflow stops at explicit review before completion.
5. A problem that requires a new template stops at `template_review`.
6. Template review must persist a structured build request. The first build-capable family is `records-request`; the reviewer supplies the workflow id and label and explicitly approves that family choice.
7. `build` is a **local authenticated-admin machine action**. It fetches fresh `origin/main`, creates an isolated git worktree/branch, writes only allow-listed factory proposal files, materializes canonical/routes, commits the proposal locally, and persists the branch/commit/file evidence on the durable Factory Job.
8. `acceptance` runs materialization drift, shared factory/chat tests, exact generated-workflow certification, Records Request tests, Records Request acceptance, and a clean-tree check. Failed checks persist and fail the job.
9. A passing generated workflow stops at `publication_review`.

The build executor never pushes, creates a pull request, merges, deploys, charges, or mails. Publication remains a separate executor and review boundary.

## Durable API

Studio exposes admin-only endpoints under `/api/studio/workflows/jobs` to create/list jobs, inspect one job and its events, resume implemented deterministic stages, approve a review boundary, and cancel a job.

Creating a job immediately runs all currently implemented deterministic stages until the first review/build boundary. A job can then be left and resumed later from the durable queue.

## Current build executor scope

The first executor intentionally supports **Records Request** templates only. That family is fully profile-driven: generated profile enrollment can reuse the shared manifest/runtime/chat contract without inventing legal rules in the executor.

Generated profile data is isolated in a machine-owned registry. Hand-authored core family profiles are not spliced or rewritten. Generated public copy is a non-indexable `contentStatus: "scaffold"` landing config that must be reviewed before publication.

A build branch is retained locally after its temporary worktree is removed. The durable Factory Job stores the branch name, base SHA, commit SHA, materialized spec/config/profile paths, changed-file list, and acceptance results.

## Next executor

The next slice is the **publication/PR executor**: take a passing generated branch at `publication_review`, show the exact artifact/check evidence, push only that branch, create a pull request with the persisted acceptance summary, and stop for explicit merge/publication review. Merge and deployment remain separate explicit actions.

Additional build families should be added by family-level adapters, not workflow-specific branches in the executor.
