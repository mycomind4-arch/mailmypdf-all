# FairProcessMaps Integration Contract

MailMyPDF is the execution layer for FairProcessMaps. The applications remain separate products and repositories.

## Boundary

FairProcessMaps owns case intelligence, evidence, procedural analysis, defense strategy, and response documents.

MailMyPDF owns document mailing, payment, address verification, provider submission, tracking, fulfillment state, and durable proof.

FairProcessMaps must never access MailMyPDF's database, Stripe credentials, Lob credentials, or internal storage directly.

## Communication Intent

The integration should represent a requested mailing as an idempotent communication intent.

Conceptual request:

```json
{
  "idempotency_key": "case-communication-unique-key",
  "external_case_id": "fairprocess-case-id",
  "purpose": "response_to_notice",
  "matter_reference": "case-reference",
  "document": {
    "external_id": "fairprocess-document-id",
    "sha256": "immutable-document-hash"
  },
  "recipient": {
    "name": "Recipient Name",
    "address_line1": "123 Main St",
    "address_line2": null,
    "city": "Eureka",
    "state": "CA",
    "postal_code": "95501",
    "country": "US"
  },
  "mail_type": "certified"
}
```

The real API contract should use a versioned endpoint and an authenticated service credential. The exact provider fields remain internal to MailMyPDF.

## Idempotency

A repeated request with the same idempotency key must return the existing MailJob rather than create a second physical mailing.

Idempotency must be enforced server-side with a unique database constraint, not only in application memory.

## Response

The initial response should contain:

- MailJob identifier
- current execution state
- accepted timestamp
- external case reference
- provider-independent tracking/proof fields when available

## Webhooks / Events

MailMyPDF should publish signed, replay-safe lifecycle events back to FairProcessMaps.

Minimum events:

- `mail.created`
- `mail.payment_completed`
- `mail.submitted`
- `mail.accepted`
- `mail.in_transit`
- `mail.delivered`
- `mail.failed`
- `mail.cancelled`
- `mail.refunded`
- `mail.proof_available`

Events must include the MailJob ID, idempotency key, event ID, event timestamp, current state, and provider-independent identifiers.

## Security

- Authenticate service-to-service requests.
- Validate request bodies with a strict schema.
- Never accept provider credentials from FairProcessMaps.
- Do not allow caller-selected provider IDs to bypass MailMyPDF validation.
- Verify document ownership before fulfillment.
- Verify payment before physical submission.
- Make webhook handling replay-safe.
- Preserve an immutable audit trail for state changes.

## Product Boundary

FairProcessMaps should be able to say:

> Send this response by certified mail and attach the resulting proof to Case X.

MailMyPDF should be responsible for everything required to execute and prove that instruction.
