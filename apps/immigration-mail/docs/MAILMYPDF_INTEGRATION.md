# MailMyPDF Integration

Immigration Mail is a separate product and repository. MailMyPDF is the shared mailing/fulfillment platform.

## Existing MailMyPDF capabilities used by this adapter

MailMyPDF already exposes versioned v1 APIs for:

- authenticated document upload
- communication creation
- idempotent physical mailing requests
- communication retrieval/status
- Lob fulfillment and proof-of-service infrastructure

Its vertical contract also defines a standard workflow from intake through checkout, fulfillment, tracking, and proof, plus `VerticalOrderMetadata` for identifying the originating vertical. fileciteturn40file0L2-L2

## Immigration Mail integration contract

The server-side adapter in `src/platform/mailmypdf.ts` calls:

- `POST /api/v1/documents`
- `POST /api/v1/communications`
- `GET /api/v1/communications/:id`

Every communication is tagged with:

```text
vertical = immigration-mail
product = immigration-mail
```

An idempotency key is mandatory so retries cannot accidentally produce duplicate physical mailings. MailMyPDF's communications API explicitly requires this behavior. fileciteturn53file0L2-L2

## Secrets

Set these only as server-side Cloudflare secrets/environment variables:

```text
MAILMYPDF_API_URL=https://<mailmypdf-production-domain>
MAILMYPDF_API_KEY=<tenant-api-key>
```

Never expose `MAILMYPDF_API_KEY` to browser code, public environment variables, analytics, logs, or client bundles.

## Tenant model

MailMyPDF's v1 platform has tenant-scoped API authentication and tenant onboarding. fileciteturn54file0L2-L2 fileciteturn55file0L2-L2

Immigration Mail should use a dedicated MailMyPDF tenant/API key rather than sharing the main application's secret. This keeps the vertical isolated while allowing MailMyPDF to provide the shared fulfillment layer.

## Document flow

1. Immigration Mail receives the user's final document.
2. Server uploads it to MailMyPDF's private document service.
3. MailMyPDF returns a document ID and SHA-256 record.
4. Immigration Mail creates a communication referencing that document.
5. MailMyPDF performs address verification, fulfillment, tracking, and proof processing.
6. Immigration Mail stores only the identifiers/status needed for the user's experience.

MailMyPDF's document endpoint validates file type/size and computes a server-side SHA-256 hash. fileciteturn57file0L2-L2

## What remains to configure

The code integration is now in place, but live fulfillment must not be enabled until:

- a dedicated MailMyPDF tenant exists for Immigration Mail
- the tenant API key is stored as a server secret
- the production MailMyPDF API URL is confirmed
- a sandbox/test mailing succeeds
- Stripe/payment ownership is explicitly decided
- webhook/status synchronization is implemented
- Immigration Mail authentication and authorization are enforced on all server actions

No Lob credentials are copied into Immigration Mail. Lob remains behind MailMyPDF.
