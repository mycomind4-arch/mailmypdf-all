# MailMyPDF document retention and cleanup

MailMyPDF accepts customer PDFs before payment so it can calculate pricing and create a checkout session. Uploaded documents are private operational data and must not be retained indefinitely.

## Enforced in this release

### Unpaid drafts without a Stripe Checkout Session

- Default retention: **24 hours from order creation**.
- Configurable with `MAILMYPDF_DRAFT_RETENTION_HOURS` from 1 to 168 hours.
- The cleanup job selects only rows that are still `draft`, are older than the cutoff, and have no `stripe_session_id`.
- Each candidate is conditionally claimed as `cancelled` before deletion so a concurrent checkout cannot also own it.
- Order events, order metadata, and the private `order-pdfs` object are removed.
- A failed stage is returned by the cleanup endpoint and written to server logs.
- Storage-deletion failures include the private storage path in the authenticated cleanup response for operator repair.

Run the cleanup endpoint with an authorization header:

```text
Authorization: Bearer <MAILMYPDF_CLEANUP_SECRET>
```

`MAILMYPDF_CLEANUP_SECRET` must contain at least 32 characters. The endpoint supports `GET` and `POST` at `/api/internal/cleanup-drafts`. Add `?dryRun=1` to count eligible rows without deleting them.

## Required deployment schedule

Invoke the cleanup endpoint at least hourly from a trusted scheduler. Treat any non-200 response as an operational incident and retain the response or server log until every reported storage path is removed.

## Retention policy for other states

These periods are the approved target policy. They are not yet automatically enforced by this first cleanup tranche:

| Order state | Target retention for customer PDF | Reason |
| --- | ---: | --- |
| `draft` with an active Stripe session | Until session reconciliation, then no more than 24 hours after expiration | Avoid deleting a document while payment completion may still be pending. |
| Paid or fulfillment-retry states | Until mailing succeeds or the order is refunded/cancelled, plus 30 days | Permit controlled retry, support, and provider reconciliation. |
| `mailed`, `in_transit`, or `delivered` | 30 days after `mailed_at` | Short support and delivery-dispute window. |
| `cancelled` or `refunded` | 7 days after final status | Permit confirmation and support while minimizing document retention. |
| Permanently failed orders | 30 days after the final failed state | Permit provider investigation and customer support. |

The next retention tranche must reconcile Stripe sessions and implement deletion for these non-draft states before public launch.

## Storage boundary

- The `order-pdfs` bucket must remain private.
- Browser clients must never receive broad storage-list or public-read access.
- Downloads and provider submissions must use server-authorized access only.
- Service-role credentials remain server-only.
- Cleanup credentials must never be exposed in client bundles or URLs.

## PDF safety boundary

Before storage, both pricing preview and order creation use the same server validator. It rejects oversized, malformed, encrypted, active-content, embedded-file, excessively complex, zero-page, over-10-page, and excessively dimensioned PDFs.

This reduces risk but is not an antivirus guarantee. Public launch still requires distributed rate limiting, per-IP and per-email quotas, bot protection, and production monitoring.
