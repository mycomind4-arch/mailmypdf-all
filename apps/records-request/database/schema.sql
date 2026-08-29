PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS requests(
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  jurisdiction TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','review','approved','queued','submitted','tracking','completed','failed')),
  owner_id TEXT,
  audit_tail_hash TEXT,
  purpose TEXT,
  scope_json TEXT,
  approved_artifact_json TEXT,
  approved_artifact_hash TEXT,
  approved_at TEXT,
  approved_by TEXT,
  requested_at TEXT,
  response_due_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_items(
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date_start TEXT,
  date_end TEXT,
  custodian TEXT,
  system_hint TEXT,
  format TEXT,
  status TEXT NOT NULL DEFAULT 'unanswered' CHECK (status IN ('unanswered','requested','received','reviewed','complete','incomplete'))
);

CREATE TABLE IF NOT EXISTS communications(
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  direction TEXT NOT NULL,
  channel TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  evidence_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productions(
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  received_at TEXT NOT NULL,
  agency_description TEXT,
  file_count INTEGER DEFAULT 0,
  production_hash TEXT,
  completeness_status TEXT NOT NULL DEFAULT 'unreviewed',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS evidence(
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  production_id TEXT REFERENCES productions(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  acquired_at TEXT,
  document_date TEXT,
  content_hash TEXT,
  page_reference TEXT,
  extracted_text TEXT,
  provenance_json TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','verified','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS findings(
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL,
  rule_id TEXT,
  policy_version TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actions(
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events(
  id TEXT PRIMARY KEY,
  request_id TEXT REFERENCES requests(id),
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system','user','admin','scheduled_job','api_call')),
  actor_id TEXT,
  payload_json TEXT NOT NULL,
  previous_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS fulfillment_attempts(
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','failed')),
  provider TEXT NOT NULL DEFAULT 'mailmypdf',
  provider_reference TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider,idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_items_request ON request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_comms_request_date ON communications(request_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_evidence_request ON evidence(request_id);
CREATE INDEX IF NOT EXISTS idx_findings_request ON findings(request_id,status);
CREATE INDEX IF NOT EXISTS idx_actions_request_due ON actions(request_id,due_at);
CREATE INDEX IF NOT EXISTS idx_requests_status_updated ON requests(status,updated_at);
CREATE INDEX IF NOT EXISTS idx_requests_owner_status ON requests(owner_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_requests_owner_updated ON requests(owner_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_approved_artifact_hash ON requests(approved_artifact_hash);
CREATE INDEX IF NOT EXISTS idx_fulfillment_events_request ON fulfillment_events(request_id,received_at);
CREATE INDEX IF NOT EXISTS idx_fulfillment_attempts_request ON fulfillment_attempts(request_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_provider_event
  ON audit_events(actor_type,actor_id,event_type)
  WHERE event_type = 'mailmypdf_webhook';
