# MailMyPDF cloud development agent

This adds a **review-only**, unattended coding loop on GitHub, without requiring
the owner's phone or computer to remain online.

## What is implemented

- Workflow: [Cloud Agent](../workflows/cloud-agent-mailmypdf.yml).
- Schedule: daily at **16:23 UTC**; manual launch through GitHub Actions
  `workflow_dispatch` is also supported.
- Queue: open issues **authored by repository owner** whose title starts with
  `[Cloud Agent]`, processed oldest-first (skipping tasks with an existing PR), one issue per run,
  and no more than **three simultaneous open agent PRs**.
- Execution: ephemeral Ubuntu GitHub Actions runner, Node 24, Claude Code CLI.
  The model receives only its Anthropic API key. GitHub write credentials are
  provided *after* model execution to the deterministic branch/PR step.
- Maximum estimated API spend per attempt: **$2**; maximum **14 model turns**;
  workflow duration 45 minutes. The model's client-side cost estimate is NOT
  a hard billing limit and may be exceeded. Do not rely on it as a provider
  spending cap. One daily attempt could cost about $60/month if the maximum
  is reached on every day; set an Anthropic account budget and alerts too.
- Safeguards: no production credentials in agent step; changed-path blocklist;
  no external sends, deploys, customer charges, automatic merge or live mailing.
  The code proposal is left as a pull request for human review.
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
   `GITHUB_TOKEN`. It does **not** configure this workflow to approve or
   merge its own PRs.
3. From `Actions → MailMyPDF Cloud Agent (review-only) → Run workflow`
   run once with optional issue number `178` and inspect the run logs.
   The cron schedule subsequently runs while your computer is off.

## How to monitor

- GitHub [Actions](../../actions/workflows/cloud-agent-mailmypdf.yml):
  each run reports no issue, missing credentials, failures, or a PR.
- Open [pull requests](../../pulls) and filter by branch `cloud-agent/issue-*`.
- The PR is **not** a production deployment. Review diffs and run existing
  CI/release gates before merging anything. GitHub may require manual approval
  to run workflows for a PR created by `GITHUB_TOKEN`.

## Limits / failure behavior

- The queue skips any issue that already has an agent PR, including closed PRs;
  after three open agent PRs it pauses until an owner reviews them. To retry an
  abandoned issue, create a fresh owner-authored task rather than duplicating a
  previously attempted PR.
- If the model exits with an error, runs out of budget, or touches a protected
  path, the job stops before pushing its changes.
- If PR creation is disabled in repository settings, code may reach the
  `cloud-agent/issue-<number>` branch but the job fails at PR creation.
  Configure the setting and rerun only after checking for a pre-existing branch.
- GitHub schedules are not strict real-time guarantees; they can be delayed or
  dropped. Inactive public repositories can have schedules disabled after
  60 days without repository activity.
- No unattended agent may activate live Stripe/Lob behavior, approve mail on
  behalf of a user, deploy, spend arbitrary funds, or merge to `main`.
- GitHub Actions is a cloud runner, **not** a perpetual Astra chat session.
  The implementation uses Claude Code's API under your own credentials.
  Model usage and GitHub limits depend on their providers and your plan.

## Pause or disable

Remove/disable the `ANTHROPIC_API_KEY` repository secret or disable the
workflow under GitHub Actions. Removing the key stops paid model work (scheduled
preflight checks may still execute). Do not expose the key while troubleshooting.

## Future enhancement once the first PR succeeds

Add an independent review agent, CI reconciliation, and automatically move to
the next vetted issue. Keep each role least-privileged and production actions
behind user/customer approval.
