ALTER TABLE requests ADD COLUMN audit_tail_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_owner_updated ON requests(owner_id, updated_at DESC);
