# Proof-of-Service API Reference

Base URL: `https://mailmypdf.com/api/v1`

Authentication: `Authorization: Bearer sk_live_...` (all endpoints except `/verify`)

## Documents

### POST /documents
Upload a document for proof-of-service mailing. SHA-256 hash computed server-side.

**Request:**
- Content-Type: `multipart/form-data`
  - `file`: the document (PDF, PNG, or JPEG, max 10MB)
- OR Content-Type: `application/json`
  - `content`: base64-encoded file contents
  - `filename`: string
  - `mime_type`: string (optional, defaults to `application/pdf`)

**Response (201):**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "filename": "notice_of_violation.pdf",
  "mime_type": "application/pdf",
  "sha256": "a3f5b2c1...",
  "size_bytes": 45678,
  "source": "uploaded",
  "template_id": null,
  "created_at": "2026-08-02T13:00:00Z"
}
```

### GET /documents/:id
Retrieve a document's metadata and cryptographic hash.

## Communications

### POST /communications
Create a communication record with hash chain, then send via Lob.

**Request:**
```json
{
  "document_id": "uuid",
  "legal_reference": {
    "type": "ordinance",
    "citation": "Humboldt County Code § 314-7",
    "description": "Code violation notice — 30-day cure period",
    "response_window_days": 30,
    "notes": "Optional context"
  },
  "recipient": {
    "name": "Jane Owner",
    "address_line1": "123 Example St",
    "address_line2": null,
    "city": "Eureka",
    "state": "CA",
    "postal_code": "95501",
    "country": "US"
  },
  "mail_type": "certified",
  "matter_reference": "Humboldt-CE-2026-0042",
  "matter_type": "code_enforcement",
  "metadata": {},
  "from_address": {
    "name": "Humboldt County Code Enforcement",
    "line1": "825 5th St",
    "city": "Eureka",
    "state": "CA",
    "postal": "95501"
  }
}
```

**Response (201):** Full communication record including custody chain.

### GET /communications
List communications. Query params: `matter_reference`, `status`, `limit` (max 500), `offset`.

### GET /communications/:id
Retrieve a full communication record including the hash-linked custody chain.

### GET /communications/:id/proof
Generate the proof bundle — the exportable evidence package.

**Response:**
```json
{
  "id": "pb_uuid",
  "communication_id": "uuid",
  "document_sha256": "a3f5b2c1...",
  "document_filename": "notice_of_violation.pdf",
  "sent_at": "2026-08-02T13:01:00Z",
  "carrier": "usps",
  "tracking_number": "9405 5036 9930 0000 0000 00",
  "mail_type": "certified",
  "delivered_at": "2026-08-04T15:30:00Z",
  "signature_image_url": "https://lob.com/sig/abc.png",
  "legal_reference": { ... },
  "response_window_status": "within_window",
  "response_window_ends": "2026-09-01T13:01:00Z",
  "custody_chain": [
    { "timestamp": "...", "event_type": "created", "event_hash": "...", "prior_event_hash": null },
    { "timestamp": "...", "event_type": "sent", "event_hash": "...", "prior_event_hash": "..." },
    { "timestamp": "...", "event_type": "delivered", "event_hash": "...", "prior_event_hash": "..." }
  ],
  "bundle_sha256": "e7d9a1f3...",
  "generated_at": "2026-08-04T16:00:00Z"
}
```

## Templates

### POST /templates
Create a reusable notice template.

**Request:**
```json
{
  "name": "30-Day Cure Notice",
  "description": "Standard code violation cure notice",
  "vertical": "code_enforcement",
  "body_html": "<h1>Notice of Violation</h1><p>Property: {{property_address}}</p>...",
  "variables": ["property_address", "violation_type", "cure_deadline"],
  "default_legal_reference": {
    "type": "ordinance",
    "citation": "Humboldt County Code § 314-7",
    "description": "30-day cure period",
    "response_window_days": 30
  }
}
```

### GET /templates
List templates. Query param: `vertical`.

### POST /templates/:id/render
Render a template with caller-provided variables. Generates a PDF, hashes it, returns a Document.

**Request:**
```json
{
  "variables": {
    "property_address": "123 Example St, Eureka, CA 95501",
    "violation_type": "Unpermitted structure",
    "cure_deadline": "September 1, 2026"
  }
}
```

**Response (201):** A ProofDocument record (same as POST /documents).

## Tenants

### POST /tenants
Create a new tenant and receive an API key. **Platform key required.**

**Request:**
```json
{
  "name": "Humboldt County Code Enforcement",
  "webhook_url": "https://fairprocess.example.com/webhooks/proof",
  "webhook_secret": "a_secure_secret_string",
  "lob_api_key": "live_xxx"
}
```

**Response (201):**
```json
{
  "tenant_id": "uuid",
  "api_key": "sk_live_abc123...",
  "message": "Store this API key securely. It will not be shown again."
}
```

## Public Verification

### GET /verify/:trackingNumber?document_hash=:hash
**No authentication required.** Verify a proof-of-service send without trusting the sender.

Returns only verification-relevant data: send/delivery timestamps, mail type, carrier, custody chain hash verification. **No PII, no tenant data, no legal strategy.**

## Internal Endpoints

### POST /api/internal/proof-webhook-retries
Process pending webhook delivery retries. Protected by `MAILMYPDF_CLEANUP_SECRET`.

### POST /api/internal/proof-window-expiry
Check for expired response windows and dispatch `response_window.expired` webhooks. Protected by `MAILMYPDF_CLEANUP_SECRET`.

## Webhooks

Proof-of-Service dispatches signed webhooks to the tenant's configured webhook URL.

**Headers:**
- `X-ProofOfService-Signature`: `t={timestamp},v1={hmac_sha256}`
- `X-ProofOfService-Event`: event type

**Event types:**
- `communication.sent` — communication submitted to carrier
- `communication.in_transit` — letter in transit
- `communication.delivered` — letter delivered to recipient
- `communication.undelivered` — delivery failed
- `communication.returned` — letter returned to sender
- `response_window.expired` — legal response window expired
- `proof_bundle.ready` — proof bundle generated

**Signature verification:**
```
expected = HMAC-SHA256(webhook_secret, "{timestamp}.{body}")
```

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "type": "validation_error",
    "message": "Missing required field: recipient.name",
    "code": "VALIDATION_ERROR",
    "field": "recipient.name"
  }
}
```

| Status | Code | Description |
|--------|------|-------------|
| 401 | UNAUTHORIZED | Missing or invalid API key |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 400 | VALIDATION_ERROR | Invalid input |
| 422 | LOB_ERROR | Lob API error |
| 500 | INTERNAL_ERROR | Server error |
