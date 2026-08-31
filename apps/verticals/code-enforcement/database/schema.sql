PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  apn TEXT,
  jurisdiction TEXT,
  latitude REAL,
  longitude REAL,
  zoning TEXT,
  legal_description TEXT,
  source_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id),
  case_number TEXT,
  agency TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TEXT,
  closed_at TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  acquired_at TEXT,
  document_date TEXT,
  content_hash TEXT,
  page_reference TEXT,
  extracted_text TEXT,
  provenance_json TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_evidence_id TEXT REFERENCES evidence(id),
  confidence TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS violations (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  code_reference TEXT,
  allegation TEXT NOT NULL,
  observed_at TEXT,
  compliance_due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  cure_description TEXT,
  evidence_ids_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL,
  rule_id TEXT,
  policy_version TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  human_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  owner TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id),
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  payload_json TEXT NOT NULL,
  previous_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_property ON cases(property_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_events_case_date ON events(case_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_findings_case_status ON findings(case_id, status);
CREATE INDEX IF NOT EXISTS idx_actions_case_due ON actions(case_id, due_at);
