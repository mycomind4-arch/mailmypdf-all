-- Migration 0002: Ownership, Fulfillment Idempotency, Webhook Replay Protection, Audit Chain
-- Adds ownership columns, fulfillment attempts, webhook event deduplication,
-- and strengthens the audit chain for cryptographic integrity.

-- ─── Ownership: add owner and organization to requests ───
ALTER TABLE requests ADD COLUMN owner_id TEXT;
ALTER TABLE requests ADD COLUMN organization_id TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_owner ON requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_requests_org ON requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_requests_owner_status ON requests(owner_id, status);

-- ─── Fulfillment idempotency: track every attempt locally ───
CREATE TABLE IF NOT EXISTS fulfillment_attempts (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','accepted','rejected','delivered','failed','returned')),
  provider_submission_id TEXT,
  tracking_number TEXT,
  proof_id TEXT,
  document_sha256 TEXT,
  error_message TEXT,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_fulfillment_request ON fulfillment_attempts(request_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_idem ON fulfillment_attempts(idempotency_key);

-- ─── Webhook replay protection: deduplicate by event ID ───
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  source TEXT NOT NULL DEFAULT 'mailmypdf',
  status TEXT,
  payload_hash TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_webhook_request ON webhook_events(request_id);

-- ─── Audit chain: add sequence number for ordering ───
ALTER TABLE audit_events ADD COLUMN seq INTEGER;
CREATE INDEX IF NOT EXISTS idx_audit_request_seq ON audit_events(request_id, seq);

-- ─── Request items: add ownership-scope fields ───
ALTER TABLE request_items ADD COLUMN status_detail TEXT;

-- ─── Communications: add provider message ID ───
ALTER TABLE communications ADD COLUMN provider_message_id TEXT;

-- ─── Productions: add source tracking ───
ALTER TABLE productions ADD COLUMN source_webhook_event_id TEXT;
