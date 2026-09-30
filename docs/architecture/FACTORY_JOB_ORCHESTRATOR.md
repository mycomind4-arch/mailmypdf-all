# Persistent Factory Job orchestrator

The workflow factory control plane persists supervised work as versioned jobs rather than treating planning, certification, and build preparation as unrelated requests.

## Safety model

A factory job is a deterministic state snapshot with an append-only transition history. The database stores the canonical JSON snapshot plus indexed status/stage columns. Every transition supplies the expected revision; a stale concurrent writer is rejected before a second transition can be recorded.

Factory tables are service-role only. RLS is enabled and no anonymous or authenticated browser policies are granted. Studio routes must first resolve a verified administrator and attribute that actor to the durable event.

## Current automatic stages

The first runner deliberately automates only behavior already proven by shared packages:

1. `intake` validates and persists the problem description.
2. `match` runs the canonical reuse planner against the current registry and live connector tool surface.
3. `certify` re-runs canonical chat certification for the selected existing workflow.
4. A certified existing workflow stops at explicit review before the job completes.
5. A problem that requires a new template stops at `template_review`. Approval moves it to `build`, where the current runner stops because no reviewed build executor exists yet.

The runner never fabricates materialization, test, acceptance, or publication success.

## Durable API

Studio exposes admin-only endpoints under `/api/studio/workflows/jobs` to create/list jobs, inspect one job and its events, resume implemented deterministic stages, approve a review boundary, and cancel a job.

Creating a job immediately runs all currently implemented deterministic stages until the first review/build boundary. A job can then be left and resumed later from the durable queue.

## Next executor

The next factory slice should implement the `build` stage without weakening review gates. It should consume an approved template-review job and produce a reviewed family/profile/spec proposal, write only to an isolated branch, run materialization and factory/chat certification, execute the applicable acceptance suite, persist all diagnostics/artifact references back to the job, and stop at publication review. Merge/deployment remains a separate explicit action.


## Isolated acceptance executor

The next supervised slice materializes approved new Records Request templates in an isolated GitHub branch rather than the deployed working tree.

- New autonomous template creation is deliberately limited to the generic Records Request family. Notice, appeal, and other authority-sensitive families still require a richer reviewed family profile before they can enter this executor.
- The reviewed recipe creates a non-indexable scaffold `config.ts` plus `workflow.spec.json`. Public copy remains unpublished until later review.
- The executor reads the canonical registry from the live base commit, refuses to overwrite any existing workflow-local file, generates the static route wrappers plus updated canonical registry/inventory, commits them atomically, and opens a pull request.
- The persistent Factory Job stores the exact repository, base commit, branch, generated commit, PR number, and PR URL.
- Acceptance is keyed to the exact generated commit SHA and requires the Shared capability, Records Request, Public workflow landing, and Workspace UI workflows to report success.
- Missing checks remain pending. Any required failure fails the job closed. Only complete success advances to explicit publication review.
- Publication review approves the tested PR as ready for publication; it does not merge or deploy the PR.
