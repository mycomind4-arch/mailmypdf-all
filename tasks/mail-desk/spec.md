# Mail Desk: core sending experience

Status: approved by the user (“build it from the spec”); first increment implemented. Verification and remaining limits are in verification.md.
Date: 2026-09-20

## Objective

Make the top-level MailMyPDF application a coherent place to prepare, review,
pay for, and track a mailing. The entry point is “What do you need to send?”
with a PDF path and a letter-writing path. This is core MailMyPDF work, not
Secured Transactions or a new vertical.

## Assumptions for review

- Work in `/Users/macdizzle/dev/mailmypdf-all-main` on the existing `main`
  checkout. No branches, worktrees, clones, cleanup, or unrelated edits.
- Preserve existing pricing, authentication, Stripe payment safeguards, and
  mail-provider integration. Do not migrate the backend.
- Reuse the current PDF sending and letter-writing services. Put reusable UI
  in existing shared packages, not legacy `apps/verticals/**`.
- The first version includes the Mail Desk, document review, approval,
  checkout, truthful tracking, and an authorized downloadable mailing record.
  Saved contacts, templates, and one-click resend are later increments.
- No live charges, real mailings, production migrations, deployments, or
  pushes are part of implementation verification.

## User-visible acceptance criteria

1. The authenticated dashboard prioritizes sending a PDF, writing a letter,
   recent mailings, and items needing attention. Workflow discovery stays
   available but does not dominate this screen.
2. PDF selection includes review of every page and understandable validation
   results. An unsupported preview has an explicit fallback; a filename and
   page count alone do not count as document review. Never silently edit the
   customer's PDF or imply legal/content verification.
3. Sender, recipient, print options, delivery service, and the complete price
   are visible before approval. Address validation and postal deliverability
   are distinct claims. Proposed corrections require user acceptance.
4. Changing the document, addresses, or mailing options invalidates the
   previous approval. Invalid, still-validating, or superseded uploads cannot
   proceed using stale validation. Payment remains server-authoritative.
5. Tracking distinguishes unpaid, awaiting fulfillment, submitted, mailed,
   delivered, returned, cancelled, refunded, and failure states. Unknown
   states never imply success. A payment-return URL is not proof of payment.
6. Recovery instructions reflect the actual status and do not invite duplicate
   payment or duplicate mail submission. No automatic resend.
7. A private mailing record contains only verified order information and
   available artifacts: the stored PDF, addresses, recorded amount/payment
   evidence, provider confirmation, and available tracking/proof. Missing
   artifacts are explicitly unavailable. A summary is not labeled a payment
   receipt or certified proof. Delivery never means the recipient read it.
8. Responsive, keyboard-operable UI includes loading, empty, validation,
   missing-record, and failure states. Existing authenticated workflow routes
   and admin entry points remain intact.

## Verified starting points

- `mailmypdf/src/routes/send.tsx`: existing four-step PDF flow, server PDF
  validation, embedded Stripe checkout. No actual PDF page preview found.
  Approval state currently survives input changes; replacement uploads can
  leave a prior valid file available while validation runs.
- `mailmypdf/src/routes/write.tsx`: existing letter-writing entry point;
  detailed preview/approval inspection is still required.
- `mailmypdf/src/routes/_authenticated/dashboard/index.tsx`: dashboard with
  statistics, recent-order summaries, and prominent workflow shortcuts.
- `mailmypdf/src/routes/orders.$id.tsx`: private-link tracking. Its heading
  overstates progress for several unpaid, failed, or terminal states.
- `mailmypdf/src/lib/order-state-machine.ts`: existing lifecycle rules;
  presentation must cover all states without changing fulfillment authority.
- `mailmypdf/src/lib/user.functions.ts`: account order queries; drafts are
  excluded and statistics are capped at 200 records. Do not present these as
  complete lifetime totals or promise saved/resumable drafts without work.
- `mailmypdf/src/services/mail.service.ts`: order lookup checks ID and private
  token. Existing response selects all order fields; new record downloads
  need an explicit field allowlist, not a dump of this object.
- Existing proof-of-service code concerns communications. Its relationship
  to ordinary PDF orders must be verified before reuse is claimed.

## Technical structure and style

Use the installed React 19 / TanStack Start application and existing shared
design/workflow components. No new dependencies or database schema are
assumed. App-specific adapters belong under `mailmypdf/src/lib` and
`mailmypdf/src/components`; reusable presentation belongs in an appropriate
existing `packages/*` package. Tests belong beside shared code or in
`mailmypdf/tests`. Keep source files focused rather than enlarging `send.tsx`.

Follow existing named TypeScript exports and quoted imports, for example:

```ts
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}
```

Keep the current paper/navy design tokens and semantic HTML. Do not invent a
parallel design system, payment engine, order state machine, or auth layer.

## Commands and verification

Run from `/Users/macdizzle/dev/mailmypdf-all-main`:

```sh
pnpm --dir mailmypdf exec node --test tests/order-state-machine.test.mjs tests/checkout-boundary.test.mjs tests/payment-fulfillment-boundary.test.mjs
pnpm --dir mailmypdf exec tsx --test tests/pdf-safety.test.ts
pnpm --dir mailmypdf test
pnpm --dir mailmypdf exec tsc --noEmit
pnpm --dir mailmypdf build
```

Add behavior tests before implementation for status projection, stale upload
results, approval invalidation, record allowlists, and authorization failures.
Use mocked services for payment and fulfillment. Verify real browser desktop
and mobile layouts, keyboard navigation, PDF review, validation errors, and
actual record download. A build or download button alone is not completion.
Record pre-existing failures separately, with exact commands and outcomes.

## Security boundaries

- Always: authorize each record/document request; allowlist response fields;
  treat uploads as untrusted; retain size/page limits; keep server pricing and
  webhook authority; bind approval to the actual reviewed inputs; exclude
  private lookup tokens, internal metadata, and secrets from record exports.
- Ask first: schema changes, new dependencies/providers, changed auth or
  ownership rules, new sensitive-data storage, production operations.
- Never: expose credentials; treat frontend state as authorization; claim
  missing receipts/tracking/signatures exist; trigger real charges or mailing
  during tests; delete legacy work or alter concurrent Studio/vertical edits.

## Implementation ordering to validate after scope approval

1. Truthful shared order presentation and regression tests.
2. Mail Desk dashboard wired to actual account records.
3. Document preview, upload race handling, and review/approval invalidation.
4. Authorized mailing record using available stored artifacts.
5. End-to-end sandbox/browser verification and a limitations ledger.

Pause a slice if it requires a new schema, provider, dependency, or access
model. Surface that decision without widening the task or silently reducing
the success criteria. Do not call the entire product production-ready from
the completion of this increment.
