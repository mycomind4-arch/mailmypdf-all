# MailMyPDF agent operating instructions

## Product objective

Build one dependable MailMyPDF application and a supervised workflow factory.
Customers must be able to discover a workflow, authenticate without losing their
destination, start or resume an owned matter, prepare evidence and documents,
review and approve the exact output, pay, mail, track, and retain proof.
Public visitors, authenticated users, and administrators require intentional,
consistent shells and server-enforced access boundaries throughout the ecosystem.
Studio coordinates Codex/Claude work and verifies real workflow/PDF outcomes.
The intended factory starts with a user's problem, composes a private matter plan,
and proposes privacy-reviewed reusable templates. Read
`context/PROBLEM_TO_WORKFLOW.md` when working on factory architecture or discovery.

## Required starting context

Read `context/CURRENT_WORK.md` first, then `context/FACTORY_STATUS.md`, then the relevant sections of `context/MASTER.md`
and applicable nested instructions. Inspect actual code and git status before
editing. Old chat reports, commit counts, and archive tags are evidence to examine,
not proof that a feature is missing, integrated, or production-ready.

## Canonical workspace and preservation

- The only authorized working copy is `/Users/macdizzle/dev/mailmypdf-all`, on `main`.
- Do not create branches, worktrees, clones, or standalone platform/Studio copies.
- Serialize changes to this checkout. Do not launch the existing worktree-based
  swarm until its architecture is reconciled with this constraint or the user changes it.
- Preserve user changes and archival tags. No resets, force pushes, bulk deletion,
  or whole-file conflict choices without reviewing the actual differences.
- GitHub synchronization is separate from verification. Push only within the
  current task's authorization and after reviewing the diff and relevant checks.

## Systematic repair loop

1. Select the highest-priority open item in `context/FACTORY_STATUS.md` that fits
   the user's current request. P0 security precedes P1 broken journeys, then P2
   consistency and P3 polish. Finish a bounded item before opening another.
2. Identify its shared root cause and a concrete failing journey/check.
3. Make the smallest durable repair, retaining useful later improvements.
4. Run focused regression checks. For UI changes inspect the actual browser;
   for PDF changes run the acceptance engine and inspect the generated PDF.
5. Recheck the integrated working tree and affected neighboring journeys.
6. Record files, command/result, limitations, and next item in the status file.
   Commit verified changes separately. Never call an unrun check a pass.

## Completion and cost controls

- Distinguish: implemented, locally verified, environment-blocked, and production-verified.
- A build, route file, agent success message, or simulated payment does not establish
  customer readiness. Missing tests are missing coverage, not successful acceptance.
- Preserve human approval, ownership, source provenance, payment idempotency,
  and exact-document approval boundaries. Do not weaken them to make tests pass.
- Use targeted file reads/tests; broaden only for a demonstrated dependency or failure.
- Do not run paid model swarms, real mailing, live payment, or deployment as a test.
- Explain genuine blockers with evidence; do not leave a broad success claim when
  requested work or acceptance criteria remain unfinished.
