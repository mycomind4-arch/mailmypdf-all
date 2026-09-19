# FairProcessMaps Integration Contract

## Boundary

FairProcessMaps is the intelligence and case system. MailMyPDF is the document execution system.

FairProcessMaps owns:
- case identity
- evidence and findings
- response/defense documents
- communication purpose
- recipient intent
- case timeline

MailMyPDF owns:
- document preparation for physical mail
- payment
- Lob submission
- USPS tracking
- fulfillment state
- proof of mailing/delivery

FairProcessMaps must not access MailMyPDF's database, Stripe credentials, or Lob credentials.

## Communication lifecycle

```text
FairProcessMaps
  Case
   ↓
  Response Document
   ↓
  Communication Request
   ↓
MailMyPDF
  validate → pay → queue → submit → track → prove
   ↓
  signed webhook
   ↓
FairProcessMaps Case Timeline
```

## Current API contract

MailMyPDF's existing v1 endpoints are used directly for the first integration slice:

```text
POST /api/v1/documents
POST /api/v1/communications
GET  /api/v1/communications/:id
```

FairProcessMaps uploads the source response document, then creates the communication using the same idempotency key it stored on its case communication.

The MailMyPDF job ID is the MailMyPDF communication ID returned by the API. Provider credentials remain server-side.

## Idempotency

Every caller-created communication must supply a stable idempotency key scoped to its tenant/integration. Retrying the same request must return the existing communication and must never trigger a second physical-mail submission.

The idempotency key is persisted and protected by a database uniqueness constraint. Application-level duplicate checks alone are insufficient because concurrent requests can race.

## Webhooks

MailMyPDF already supports signed tenant webhooks through `proof_tenants.webhook_url` and `proof_tenants.webhook_secret`.

Configure the FairProcessMaps callback as:

```text
https://<fairprocessmaps-domain>/api/v1/integrations/mailmypdf/webhook
```

Use the same random webhook secret in both systems. MailMyPDF signs the body as:

```text
HMAC-SHA256("<unix_timestamp>.<raw_json_body>", webhook_secret)
```

and sends:

```text
X-ProofOfService-Signature: t=<timestamp>,v1=<hex>
X-ProofOfService-Event: <event_type>
```

FairProcessMaps verifies the signature, records the provider event ID exactly once, updates the case communication, and appends a case timeline event.

Supported lifecycle events include:

- `communication.created`
- `communication.sent`
- `communication.in_transit`
- `communication.delivered`
- `communication.undelivered`
- `communication.returned`
- `communication.refused`
- `signature.captured`
- `response_window.expired`
- `proof_bundle.ready`

Webhook failures must never roll back physical-mail fulfillment. MailMyPDF retains retry records for failed webhook delivery.
