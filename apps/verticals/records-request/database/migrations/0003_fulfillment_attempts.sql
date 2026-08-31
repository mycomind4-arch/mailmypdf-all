CREATE TABLE IF NOT EXISTS fulfillment_attempts (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'failed')),
  provider TEXT NOT NULL DEFAULT 'mailmypdf',
  provider_reference TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_attempts_request
  ON fulfillment_attempts(request_id, created_at DESC);
