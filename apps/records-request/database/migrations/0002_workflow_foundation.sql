PRAGMA foreign_keys=ON;

ALTER TABLE requests ADD COLUMN owner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_owner_status ON requests(owner_id,status,updated_at);

CREATE TABLE IF NOT EXISTS fulfillment_events(
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  request_id TEXT NOT NULL REFERENCES requests(id),
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,event_id)
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_events_request ON fulfillment_events(request_id,received_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_provider_event
  ON audit_events(actor_type,actor_id,event_type)
  WHERE event_type = 'mailmypdf_webhook';
