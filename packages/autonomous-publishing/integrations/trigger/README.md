# Trigger.dev integration

This directory contains the production orchestration template for Studio autonomous publications.

It is intentionally kept outside `src/` until `@trigger.dev/sdk` is added through pnpm and the frozen lockfile is regenerated. Do not weaken CI by installing with a non-frozen lockfile.

## Intended flow

1. Trigger.dev scheduled task starts from the publication manifest.
2. Studio runs the publishing pipeline with the durable SQL run store.
3. The pipeline stops at `awaiting_approval` with the exact verified/rendered edition persisted.
4. Trigger.dev creates/waits on a human approval waitpoint.
5. On approval, Studio calls `publishApprovedEdition()` using the persisted artifact.
6. The approved artifact is delivered through listmonk/web publisher and analytics are recorded.
7. On rejection or timeout, nothing is published.

Trigger.dev v4 supports declarative timezone-aware schedules and durable human-in-the-loop waitpoints. The example in this directory is the target integration once the SDK dependency is installed.
