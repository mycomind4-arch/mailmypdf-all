# Workflow Factory: Reference Journey Graduation

## Purpose

MailMyPDF's catalog, start-page registrations, chat schemas, and proven
customer outcomes are **different** states. This contract makes those
distinctions visible in Studio. Do not derive live mailing readiness from a
manifest, a passing mock, a green CI badge, or a marketing page.

The canonical catalog currently contains 449 workflows. The factory must
remain deterministic, fail closed, reviewable, and able to certify each
workflow independently before advertising it as executable in chat.

## Three gold-standard journeys

| Journey | Current contract evidence | Offline fixtures | Graduation still required |
| --- | --- | --- | --- |
| Conversational letter | Actual named MCP tool surface, not a specialized manifest | `mcp-conversational-letter-e2e-harness.test.mjs`, `mcp-direct-mail.test.ts` | Signed-in account, saved-address revision, exact PDF/envelope, price, immutable approval, sandbox and supervised provider canaries, proof of mailing |
| IRS CP14 response | Canonical `notice-respond/cp14-response` manifest and runtime chat contract | `notice-workflow-factory.test.ts`, `workflow-runtime.test.ts` | A representative notice PDF, deadline/fact checks, safe review/approval, correct supporting documents, payment-to-provider audit trail |
| Public records request | Canonical `records-request/public-records-request` manifest and chat contract | `records-request-draft-runtime.test.ts`, `mcp-connector.test.ts` | Request-first narrative, agency/jurisdiction rules, user fact confirmation, PDF letter, mailing proof and follow-up workflow |

Each case needs successful **positive**, **negative**, **unauthorized**,
**stale-approval**, **duplicate-request**, and **provider-failure** scenarios.
Use synthetic or consented documents and mail only to deliberate test
addresses in provider-sanctioned environments. Never charge or send from CI.

## What the factory reports

`buildFactoryGraduationReport(availableTools)` in
`packages/workflows/src/factory-graduation.ts` produces an immutable summary,
a detailed queue, and the three references. Status is intentionally separated:

1. **MCP tools available**: the required connector tool names exist. This
   alone applies to ordinary conversational mailing.
2. **Manifest + chat contract certified**: a specialized workflow agrees on
   fields, documents, gates, and actual available connector tools.
3. **Acceptance verified**: a separate record of a successful, reviewed
   offline representative scenario, not inferred by this report.
4. **Live fulfillment verified**: an observed payment/webhook/print/mail/proof
   canary with operator review. Never inferred by this report.

The first two are computed; the last two are explicitly reported as
`not-verified-by-this-report` until a trusted, separately audited evidence
system is implemented.

## Factory milestones and queue order

- **Repair chat certification**: fix the exact missing connector tool or
  manifest/field/gate diagnostic.
- **Register chat contract**: finish the genuine runtime policy and bind it
  to the existing platform manifest. Never fabricate a policy just to pass.
- **Promote local intake**: reuse existing domain analytical logic as a
  reviewed platform runtime with concrete input schema and acceptance cases.
- **Build platform runtime**: for catalog-only workflows, author and review
  a specification, manifest, safe runtime, source handling, outputs, gates,
  scenario fixtures, and website/chat affordances.

Queue items sort first by unfinished milestone, then canonical ID. The
reference journeys get priority if ever regressed. All actions are **supervised**.

## Where to see the work

- `GET /api/studio/workflows/readiness`: admin-only catalog readiness,
  diagnostics, reference contracts, and factory graduation queue.
- Studio Command Center: concise reference-journey and queue panels.
- `.github/workflows/reference-journeys-ci.yml`: offline reference-journey
  gate. Its success does **not** prove a live payment or a letter delivered.
- `packages/workflows/tests/factory-graduation.test.ts` and
  `mailmypdf/tests/factory-graduation-wiring.test.ts`: deterministic
  invariants and proof that live MCP tool names are actually present.

## Graduation criteria for a new workflow

Before expanding the public indexed catalog or marking a workflow
chat-executable, require: a canonical unique ID, reviewed source authority,
a complete manifest, schema-bound runtime, enforced document and approval
gates, tool-specific error handling, deterministic output evidence,
owner-scoped persistence, multi-step simulated acceptance, and a correctly
scoped SEO page. Publishing and charging are separate explicit approvals.

The next factory implementation should persist test attestations against
the exact spec/manifest hash, introduce generated PR previews, and support
small supervised batches without bypassing CI or operator approval.
