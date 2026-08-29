ALTER TABLE requests ADD COLUMN approved_artifact_json TEXT;
ALTER TABLE requests ADD COLUMN approved_artifact_hash TEXT;
ALTER TABLE requests ADD COLUMN approved_at TEXT;
ALTER TABLE requests ADD COLUMN approved_by TEXT;

CREATE INDEX IF NOT EXISTS idx_requests_approved_artifact_hash ON requests(approved_artifact_hash);
