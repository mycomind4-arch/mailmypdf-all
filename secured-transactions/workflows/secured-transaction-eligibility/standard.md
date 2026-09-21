# Secured-Transaction Eligibility — Workflow Standard

Updated: 2026-09-20

## Purpose

Collect a person's account of a proposed or existing transaction, distinguish the parties and property, and identify records and questions requiring review before any legal eligibility decision.

## Current output

Six guided sections: situation, people, exchange, property, agreements, and review. Outputs are a readable intake summary, an open-question checklist across the canonical nine gates, and a downloadable/reopenable versioned JSON draft. A text summary can also be downloaded.

## Current maturity

Manifest maturity remains `wired`. The top-level TanStack host mounts the intake at `/dashboard/workflows/secured-transactions/secured-transaction-eligibility/start`. This is a working intake, not production legal analysis or a completed secured-transaction process.

All answers and typed source labels are user reports. The guided intake never produces a verified gate, even when every field is answered. A reported dispute is sent to the shared eligibility engine as contradicted; other reports remain unverified. Dates, amounts, document names, and locations are not inferred into legal conclusions.

Progress is in memory until explicitly downloaded; the UI does not silently store sensitive answers in browser storage. Draft import validates workflow/schema version, allowed fields, choice values, and size. Derived findings are recalculated rather than trusted from a file. The shared `workflow-ui` package owns radio controls, draft-file actions, confirmation prompts, layout, and styling. Workflow questions and gate mapping remain here.

Account-backed saving, actual document uploads/review, and automatic handoff to workflow 2 are **not connected**. The older owner/version-scoped matter adapter remains available but is not invoked by this UI. Its tests do not prove browser-to-database persistence. Do not expose its trusted verified-evidence input directly as a user intake API.

Next dependency: connect the guided draft to the authenticated, owner-scoped matter runtime and source-document pipeline, then rebuild workflow 2 using the same party facts. Do not mark the sequence launch-ready or delete the existing adapters/engines on the strength of this UI rebuild.

Navigation uses TanStack's documented `useBlocker` resolver pattern to protect unsaved answers: https://tanstack.com/router/latest/docs/framework/react/guide/navigation-blocking. Router navigation and draft replacement use the shared in-page confirmation prompt rather than `window.confirm`, which stalled the local preview browser during testing. Reloading or closing the tab still relies on the browser's native before-unload warning. Downloads target a separate browsing context as a fallback for embedded browsers that ignore `download`. Download initiation is not proof that the user retained the file: the UI asks them to keep their JSON draft and does not clear the leave-page warning merely because a download was triggered.

## Implementation boundaries

- Preserve source provenance for material facts and findings.
- Reuse shared identity/capacity, secured-transaction, jurisdiction-rule, registry-adapter, intelligence, workflow, document, and proof packages.
- Keep search variants separate from authoritative names.
- Keep incomplete or contradictory evidence explicit.
- Require human review for consequential findings and outputs.
- Do not manufacture an obligation, authorization, collateral right, filing basis, priority position, or jurisdiction conclusion that the supported evidence and rules do not establish.
