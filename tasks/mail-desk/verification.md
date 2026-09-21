# Mail Desk verification and handoff

## Implemented

- A sending-first authenticated dashboard, connected to the real account-order
  query with the existing authenticated-header transport. No invented activity,
  totals, or saved drafts. The needs-attention list explicitly covers at most
  the latest 50 non-draft orders. Workflows and admin navigation remain available.
- Shared `mailingStatus` presentation covers all known order states and unknown
  states conservatively. Tracking no longer claims unpaid/cancelled/failed orders
  are on their way. A payment-return parameter alone cannot confirm payment.
- Shared, read-only PDF page review reuses `PagePreviewGrid`; deletion is optional
  and absent in this review. The original file is downloadable for full-size or
  unsupported-preview review. No PDF content is silently edited.
- Typed letters use the existing packet-builder in the browser. The generated
  bytes are reviewed, then submitted through the existing PDF order service.
  They are not regenerated at payment. Legacy `createLetterOrder` remains for
  other callers. This path stores the resulting PDF, not editable letter text.
- Address/email format checks, replacement-upload generation guards, synchronous
  approval invalidation, and a submission lock protect the review interaction.
  Postal deliverability is explicitly not claimed.
- Pre-checkout pricing and checkout share the existing membership-price logic.
  An unchanged draft is reused, price changes require reapproval, and Mail Desk
  checkout passes the approved amount for server comparison (including existing
  Stripe sessions). Legacy callers can still omit this new optional field.
- Private record downloads: `POST /api/orders/$id/record`, with a token in the
  POST body, existing ID/token authorization, same-origin checking, no-store
  responses, explicit export fields, and order-owned storage-path checks.
  Downloads are a JSON order record and a separate original PDF, not a ZIP or a
  certified proof bundle. No provider is called to create a mailing.
- Account email matching escapes SQL LIKE wildcard characters while preserving
  case-insensitive, literal email ownership. No auth provider or role changed.

## Automated verification

- `pnpm --filter @mailmypdf/workflow-ui build`: passed.
- `pnpm --dir mailmypdf exec tsx --test tests/mail-desk.test.ts tests/mailing-record.test.ts tests/pdf-safety.test.ts`: **21 passed**.
- `pnpm --dir mailmypdf exec node --test tests/order-state-machine.test.mjs tests/checkout-boundary.test.mjs tests/payment-fulfillment-boundary.test.mjs`: **42 passed**.
- Full `pnpm --dir mailmypdf build`: passed, including SSR cycle repair.
- Final focused test rerun on 2026-09-21: **21 + 42 passed** after formatting.
- Final `vite build` and SSR cycle repair rerun on 2026-09-21: passed
  (`/tmp/mail-desk-build-final.log`).
- Focused lint of the new helpers, record endpoint, and dashboard is clean.
  Lint across all touched app source files additionally finds four pre-existing
  `no-explicit-any` errors in checkout, user profile functions, and order history;
  the same casts are present in HEAD. These were not suppressed.
- `pnpm --dir mailmypdf test`: **581 passed / 24 failed** in the `.mjs` stage;
  its `&&` prevented the subsequent full TypeScript-test stage. Focused TS tests
  above were run separately, not reported as a full TS-suite pass.
  Failures concern catalog expectations, hardcoded/moved secure-core paths,
  legacy Legal Defense imports, old address/scanning source expectations,
  shared mailing namespace expectations, and Supabase generated-schema drift.
  They were not removed or weakened to pass this task.
- Repository typecheck has unrelated vertical/router and Secured Transactions
  errors. The temporary new API route error disappeared after route generation;
  final check reports **26 errors outside the changed Mail Desk files**. No
  Mail Desk file diagnostics remain. This is not a repository-wide pass.

Local logs: `/tmp/mail-desk-focused.log`, `/tmp/mail-desk-regression.log`,
`/tmp/mail-desk-all-tests.log`, `/tmp/mail-desk-build-verified.log`,
`/tmp/mail-desk-typecheck-verified.log`. These are local verification output, not
portable repository artifacts.

## Browser verification

- Sample letter, sample sender/recipient: generated PDF displayed correctly;
  no console warnings/errors during that review.
- Changing recipient after selecting document approval cleared both approvals;
  checkout remained disabled. No payment or mailing was submitted.
- Narrow viewport: PDF stayed within the page width. Browser zoom affects the
  effective CSS width; record actual dimensions rather than claiming exact
  nominal breakpoint coverage.
- Final dashboard loaded the authenticated account's actual empty-order state;
  order-history link loaded its empty table. No console warnings/errors in
  either flow. Keyboard activation of the primary links worked.
- Desktop and effective 358px CSS-width dashboard verified visually; at 358px,
  document scroll width equals viewport width (no horizontal overflow).
  Letter review verified at effective 477px CSS width, also without overflow.
- Fresh local Worker preview: `http://localhost:8092/dashboard`, HTTP 200.
  Relaunched 2026-09-21; authenticated Mail Desk verified in browser tab 17.
  Preview process IDs are ephemeral; check port 8092 before starting another.

## Limitations / stop conditions

- This environment displays “Production checkout is not configured.” No live
  charge, provider submission, webhook delivery, or production fulfillment was
  tested. Do not describe this as production-ready.
- Download-handler responses and authorization were tested with synthetic
  fixtures. A real retained order PDF/payment receipt/delivery artifact has not
  been exercised in the browser. The UI explicitly says receipt and delivery
  proof artifacts are unavailable here; it does not invent them.
- The downloadable record reflects existing order data. It does not create a
  persisted cryptographic approval ledger. Retention can make the PDF unavailable.
- Address checking is format-only in this increment. A future postal correction
  UI must use the existing verifier and require acceptance of proposed changes.
- Saved contacts, account-saved draft resumption, templates beyond those already
  present, one-click resend, and a ZIP proof folder are not implemented here.
- Main checkout only. No branch, worktree, clone, deployment, push, or legacy
  deletion. Preserve concurrent Studio, migration, and vertical edits.

Storage download implementation follows the existing private bucket pattern and
[Supabase storage download documentation](https://supabase.com/docs/guides/storage/serving/downloads).
