# MailMyPDF cloud development agent

This adds a supervised, unattended coding loop on GitHub, without requiring
the owner's phone or computer to remain online.

## What is implemented

- Workflow: [Cloud Agent](../workflows/cloud-agent-mailmypdf.yml), including its existing proposal job and a separate merge gate in the same workflow.
- Schedule: daily at **16:23 UTC**; manual launch through GitHub Actions
  `workflow_dispatch` is also supported. Its `automation_improvement` input
  runs the self-improvement pass immediately without selecting a coding issue.
- Daily self-improvement pass at **08:41 UTC**: inspect recent run evidence,
  improve one existing GitHub Actions automation (including this one), and
  update `main` directly after validation. It can modify existing workflows
  under `.github/workflows/` plus its own prompts, except the production
  deployment and secure-core job workflows. It cannot
  create duplicate workflows or delete an existing automation, and it refuses
  to overwrite a newer `main` commit.
- Queue: open issues **authored by repository owner** whose title starts with
  `[Cloud Agent]`. `[Cloud Agent] Workflow:` issues are processed first, then
  other tasks oldest-first (skipping tasks with an existing PR), one issue per run,
  and no more than **three simultaneous open agent PRs**.
- Execution: ephemeral Ubuntu GitHub Actions runner, Node 24, Claude Code CLI.
  The model receives only its Anthropic API key. GitHub write credentials are
  provided *after* model execution to the deterministic PR or direct-update step.
- Maximum estimated API spend per attempt: **$2**; maximum **14 model turns**;
  workflow duration 45 minutes. The model's client-side cost estimate is NOT
  a hard billing limit and may be exceeded. Do not rely on it as a provider
  spending cap. The daily coding and daily self-improvement attempts together
  could cost about $120/month if both reach their estimated maximum each day;
  set an Anthropic account budget and alerts too.
- Safeguards: no production credentials in agent step; changed-path blocklist;
  no external sends, deploys, customer charges, or live mailing. Coding changes
  are left as pull requests for independent review. Every three hours, the same
  workflow checks for approved, CI-green work without starting a paid model run.
  It merges at most one safe PR per pass and then waits for the new `main` CI.
  Self-improvement changes are limited to existing automations and related
  prompts; the direct-update step checks the current `main` commit,
  parses workflow files, tests the merge gate, and preserves manual production
  deployment controls before pushing.
- Three owner-created starter tasks are seeded: #178 (paid mailing readiness),
  #179 (synthetic conversion measurement), and #180 (ChatGPT onboarding).
  The first PR will not establish live payment or fulfillment readiness.

## REQUIRED one-time activation by repository owner

1. Create or use an Anthropic API account/key with billing controls.
   In GitHub open:
   `Settings → Secrets and variables → Actions → New repository secret`
   and add the secret **`ANTHROPIC_API_KEY`**. Never put the key in an issue
   or commit. Without this secret, scheduled runs only report that the agent
   is paused; they do not make model API calls.
2. In GitHub open:
   `Settings → Actions → General → Workflow permissions`.
   Enable **Allow GitHub Actions to create and approve pull requests**.
   This is needed for the workflow to **create** PRs with its scoped
   `GITHUB_TOKEN`. It does **not** allow the agent to approve its own PRs.
3. Protect `main` with at least one independent approval, dismissal of stale
   approvals, required strict CI checks, resolved conversations, and admin
   enforcement. Until all five controls exist, the merge gate pauses.
4. From `Actions → MailMyPDF Cloud Agent → Run workflow`
   run once with optional issue number `178` and inspect the run logs.
   The cron schedule subsequently runs while your computer is off.

## How to monitor

- GitHub [Actions](../../actions/workflows/cloud-agent-mailmypdf.yml):
  each run reports no issue, missing credentials, failures, or a PR.
- Open [pull requests](../../pulls) and filter by branch `cloud-agent/issue-*`.
- The daily self-improvement run reports the exact commit pushed to `main`, or
  the validation reason it made no change.
- The PR is **not** a production deployment. A PR created by `GITHUB_TOKEN`
  may not start PR CI; its checks must actually run and pass through an
  independently authorized route before the merge gate will act.

## Limits / failure behavior

- The queue skips any issue that already has an agent PR, including closed PRs;
  after three open agent PRs it pauses until an owner reviews them. To retry an
  abandoned issue, create a fresh owner-authored task rather than duplicating a
  previously attempted PR.
- If the model exits with an error, runs out of budget, or touches a protected
  path, the job stops before pushing its changes.
- If `main` protection rejects a direct update, the self-improvement run fails
  without bypassing the rule. Existing PR review and CI gates continue to apply
  to coding changes.
- If PR creation is disabled in repository settings, code may reach the
  `cloud-agent/issue-<number>` branch but the job fails at PR creation.
  Configure the setting and rerun only after checking for a pre-existing branch.
- GitHub schedules are not strict real-time guarantees; they can be delayed or
  dropped. Inactive public repositories can have schedules disabled after
  60 days without repository activity.
- The deterministic gate accepts only owner-authored PRs or the bounded agent's
  PRs; it rejects sensitive paths and requires a fresh independent approval,
  all reported checks green, and an up-to-date base. It never deploys, spends
  funds, or approves mail on behalf of a user.
- GitHub Actions is a cloud runner, **not** a perpetual Astra chat session.
  The implementation uses Claude Code's API under your own credentials.
  Model usage and GitHub limits depend on their providers and your plan.

## Pause or disable

Remove/disable the `ANTHROPIC_API_KEY` repository secret or disable the
workflow under GitHub Actions. Removing the key stops paid model work (scheduled
preflight checks may still execute). Do not expose the key while troubleshooting.

## Merge and deployment boundaries

The merge gate supplies the reviewed head SHA to GitHub's atomic merge request,
so a later push cannot slip past review. It merges only one PR per run. The
manual `Deploy MailMyPDF Worker` workflow remains separate and must pass its
credential, production environment, preflight, and post-deploy checks. A merge
does not trigger a production deployment.
