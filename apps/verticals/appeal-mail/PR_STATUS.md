# Appeal Mail — Production Packet Pipeline Status

## Merged to main (2026-09-01)

- Replaced the superseded hand-written `simple-pdf.ts` fulfillment dependency with `pdf-lib` packet assembly.
- Added authenticated `/api/packets/build` with appeal ownership checks and validation of page operations against submitted parts.
- Added packet page operations for ordering, removal, and rotation, persisted in the case packet record.
- Added a reusable packet editor to the workflow workspace for final draft edits and supporting-document insertion.
- Added locked final packet metadata, SHA-256 hashes, page count, source document identities, and recipient data with recipientHash.
- Added generic Stripe fulfillment against the locked packet document rather than rebuilding a PDF in the webhook.
- Added final-draft integrity verification before mailing.
- Added durable webhook idempotency via Supabase mailing-row checks (provider_order_id deduplication) — failed fulfillment remains retryable across restarts.
- Added recipient persistence into the locked packet — build.ts requires and stores all recipient fields; the webhook reads recipient exclusively from the stored packet.
- Added authenticated dashboard APIs for cases and mailings and wired the dashboard UI to them.
- Added packet-builder, webhook-idempotency, and recipient-persistence test coverage.
- Added a shared control-plane AI task runner and moved the dynamic workflow analysis route to resolve provider configuration centrally.
- Reconciled workflow/status documentation against the audited 41 catalog / 36 executable code reality.

## Not yet complete

- Full PDF.js thumbnail/page-level editor (current editor operates on packet parts, not individual pages).
- AI revision integration for manual draft edits.
- Universal migration of every workflow-specific AI route to the shared task runner.
- CI-verified test/build/lint run on the merged head.
- Authenticated end-to-end verification against live services.
