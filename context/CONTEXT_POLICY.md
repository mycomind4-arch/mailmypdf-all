# Context Retrieval Policy

Purpose: maximize reasoning quality while minimizing duplicated/stale tokens.

## Default bootstrap

For a new task, load:

1. `context/MASTER.md`
2. `context/CURRENT_STATE.md`
3. `context/REPO_MAP.md`
4. The user/task request

Then identify the smallest affected subsystem before retrieving anything else.

## Retrieve in layers

### Hot context
Target: roughly 2k–10k tokens before code retrieval.

Include:
- task/goal
- acceptance criteria
- constraints
- affected repo/app/package
- directly relevant current-state facts
- applicable ADR/contract identifiers

### Warm context
Retrieve only when relevant:
- accepted ADRs
- API/auth/payment/fulfillment contracts
- workflow specs
- schema/migrations
- recent checkpoint for the subsystem
- relevant tests

### Code context
Search by execution path, symbol, route, package, or failure. Prefer the smallest set of files that can establish the behavior.

For example, a payment-to-mailing task should trace checkout → webhook/return → order/payment state → fulfillment → mailing provider → persistence/idempotency, rather than loading the full application.

### Cold context
Do not load by default:
- old audits
- phase-completion summaries
- full workflow inventories
- old standalone vertical repos
- unrelated verticals
- archived experiments
- git history
- prior conversations

Retrieve cold context only to answer a specific comparison, provenance, regression, migration, or historical question.

## Context budget guidance

These are targets, not hard limits:

- Small bug/question: 2k–8k relevant tokens.
- Focused feature: 8k–20k.
- Cross-package feature: 15k–35k.
- Architecture decision: 15k–40k.
- Full audit: scan broadly, but continuously compress findings; do not keep the whole repo hot at once.

More context is not automatically better. Prefer high relevance and current evidence.

## Task lifecycle

1. Build a task packet from `TASK_PACKET_TEMPLATE.md`.
2. Retrieve only affected sources.
3. Implement/analyze.
4. Run the narrowest meaningful verification, then broader verification where practical.
5. Save durable outcomes:
   - architectural decision → ADR
   - operational truth/blocker → `CURRENT_STATE.md`
   - detailed implementation handoff → checkpoint
   - reusable behavior/contract → spec or contract
6. Do not save raw chain-of-thought or conversation transcripts.

## Staleness controls

- Put dates on snapshots/checkpoints.
- Prefer statements such as “last verified on YYYY-MM-DD” over timeless claims.
- Do not copy a status fact into multiple files unless one is an index linking to the source.
- When a durable fact changes, update its source of truth and the small index/snapshot only if needed.

## Multi-repo rule

A task should start in one canonical repo. Add another repo to context only when the execution path crosses that boundary or a deliberate comparison/integration is required.

Standalone vertical repositories are cold/reference sources because their production counterparts live in `mailmypdf-all/apps/verticals/*`.

## Agent handoff rule

A handoff should contain only:
- goal
- completed work
- verified evidence
- changed files
- decisions
- blockers/unknowns
- next action

Never require the next session to reread an entire chat to continue correctly.