PRAGMA foreign_keys = ON;

-- Existing deployments: extend the current case/evidence model without
-- reclassifying any legacy content_hash as a cryptographic digest.
ALTER TABLE cases ADD COLUMN jurisdiction_pack_id TEXT;
ALTER TABLE cases ADD COLUMN jurisdiction_pack_version TEXT;

ALTER TABLE evidence ADD COLUMN retrieved_at TEXT;
ALTER TABLE evidence ADD COLUMN sha256_hash TEXT;
ALTER TABLE evidence ADD COLUMN mime_type TEXT;
ALTER TABLE evidence ADD COLUMN size_bytes INTEGER;
ALTER TABLE evidence ADD COLUMN original_filename TEXT;
ALTER TABLE evidence ADD COLUMN storage_key TEXT;
ALTER TABLE evidence ADD COLUMN evidence_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE evidence ADD COLUMN supersedes_evidence_id TEXT;
ALTER TABLE evidence ADD COLUMN immutable_at TEXT;
ALTER TABLE evidence ADD COLUMN withdrawn_at TEXT;
ALTER TABLE evidence ADD COLUMN withdrawal_reason TEXT;

ALTER TABLE findings ADD COLUMN policy_status TEXT;
ALTER TABLE findings ADD COLUMN citation TEXT;
ALTER TABLE findings ADD COLUMN source_url TEXT;
ALTER TABLE findings ADD COLUMN authority TEXT;
ALTER TABLE findings ADD COLUMN provisional INTEGER NOT NULL DEFAULT 1;
ALTER TABLE findings ADD COLUMN counsel_review_required INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS event_evidence_links (
  event_id TEXT NOT NULL REFERENCES events(id),
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  relationship TEXT NOT NULL DEFAULT 'supports',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, evidence_id, relationship)
);

CREATE TABLE IF NOT EXISTS violation_evidence_links (
  violation_id TEXT NOT NULL REFERENCES violations(id),
  evidence_id TEXT NOT NULL REFERENCES evidence(id),
  relationship TEXT NOT NULL CHECK (relationship IN ('supports', 'contradicts', 'context')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (violation_id, evidence_id, relationship)
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  connector_id TEXT NOT NULL,
  connector_version TEXT,
  jurisdiction_pack_id TEXT NOT NULL,
  jurisdiction_pack_version TEXT NOT NULL,
  source_url TEXT NOT NULL,
  query_json TEXT,
  retrieved_at TEXT NOT NULL,
  response_sha256 TEXT NOT NULL,
  raw_evidence_id TEXT REFERENCES evidence(id),
  http_status INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packet_exports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  packet_type TEXT NOT NULL,
  format_version INTEGER NOT NULL,
  renderer_version TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  readiness_score INTEGER NOT NULL,
  pdf_evidence_id TEXT REFERENCES evidence(id),
  exhibit_archive_evidence_id TEXT REFERENCES evidence(id),
  generated_by TEXT,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_sha256 ON evidence(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_case ON source_snapshots(case_id, retrieved_at);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_hash ON source_snapshots(response_sha256);
CREATE INDEX IF NOT EXISTS idx_packet_exports_case ON packet_exports(case_id, generated_at);
