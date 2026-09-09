# MailMyPDF Context Index

This directory is the small, high-signal entry point for humans and AI agents working on the MailMyPDF ecosystem.

## Read order

For most tasks, read only:

1. `MASTER.md` — stable ecosystem facts and boundaries.
2. `CURRENT_STATE.md` — short operational snapshot and known blockers.
3. `REPO_MAP.md` — where a change belongs.
4. The specific contract, ADR, spec, test, or source files needed for the task.

Do **not** load every audit, phase summary, repository, or workflow into context by default.

## Context tiers

- **Hot** — this directory plus the task packet and directly affected code/tests.
- **Warm** — relevant ADRs, contracts, workflow specs, and recent checkpoints.
- **Cold** — historical audits, phase summaries, old standalone vertical repos, experiments, and git history. Retrieve only when needed.

## Source precedence

When sources disagree, use this order unless the current task explicitly says otherwise:

1. Current user/task instruction.
2. Current code, tests, schema, and runtime configuration on the target branch.
3. Accepted architecture/contracts/ADRs.
4. `CURRENT_STATE.md`.
5. Recent checkpoints and audits.
6. Historical plans, phase summaries, standalone migration repos, and old chat context.

A stale document must never override current executable code or a newer accepted decision.

## Working rule

**Store broadly. Retrieve narrowly. Think locally. Save decisions permanently.**

After a material task, update only the smallest durable artifact that changed: current state, an ADR, a contract/spec, or a checkpoint. Do not paste the full conversation into the repository.

See `CONTEXT_POLICY.md` for the operating procedure and `TASK_PACKET_TEMPLATE.md` for task handoffs.