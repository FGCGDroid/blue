/**
 * 3.0 基础 schema（M2）。
 *
 * 从 2.0 lib/store.js 的 SCHEMA 原样搬入，保持 17 张表的表名/列名不变。
 * 不要在这里“顺手重构”表结构；迁移契约见 docs/3.0-contract.md。
 */

export const BASE_SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS engagements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  owner TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incidents_engagement ON incidents (engagement_id, status, severity);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  incident_id TEXT,
  task_id TEXT,
  alert_id TEXT,
  actor TEXT NOT NULL DEFAULT 'commander',
  decision TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'medium',
  evidence TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_engagement ON decisions (engagement_id, created_at);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  dedupe TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'host',
  address TEXT NOT NULL DEFAULT '',
  port INTEGER,
  service TEXT NOT NULL DEFAULT '',
  criticality TEXT NOT NULL DEFAULT 'medium',
  owner TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  evidence TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_scope',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (engagement_id, dedupe)
);
CREATE INDEX IF NOT EXISTS idx_assets_engagement ON assets (engagement_id, criticality);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  asset_id TEXT,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'open',
  confidence TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT '',
  task_id TEXT,
  incident_id TEXT,
  cve TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_findings_engagement ON findings (engagement_id, status, severity);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  external_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'medium',
  task_id TEXT,
  incident_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assignee TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  raw TEXT NOT NULL DEFAULT '',
  event_time TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (engagement_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_alerts_engagement ON alerts (engagement_id, status, severity);

CREATE TABLE IF NOT EXISTS decoys (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'canary_file',
  name TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  note TEXT NOT NULL DEFAULT '',
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (engagement_id, token)
);
CREATE INDEX IF NOT EXISTS idx_decoys_engagement ON decoys (engagement_id, status, kind);

CREATE TABLE IF NOT EXISTS decoy_hits (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  decoy_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'high',
  alert_id TEXT,
  at TEXT NOT NULL,
  event_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_decoy_hits_engagement ON decoy_hits (engagement_id, at);

CREATE TABLE IF NOT EXISTS iocs (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ip',
  value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (engagement_id, type, value)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'monitor',
  title TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'P2',
  status TEXT NOT NULL DEFAULT 'queued',
  risk_level TEXT NOT NULL DEFAULT 'low',
  requires_approval INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  approval_note TEXT,
  scope TEXT NOT NULL DEFAULT '',
  constraints TEXT NOT NULL DEFAULT '[]',
  expected_output TEXT NOT NULL DEFAULT '{}',
  assignee TEXT NOT NULL DEFAULT '',
  asset_id TEXT,
  alert_id TEXT,
  incident_id TEXT,
  acceptance TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dispatched_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_engagement ON tasks (engagement_id, status, priority);

CREATE TABLE IF NOT EXISTS timeline (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  at TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL DEFAULT 'note',
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  prev_hash TEXT,
  hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_timeline_engagement ON timeline (engagement_id, at);

CREATE TABLE IF NOT EXISTS telemetry_sources (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'jsonl',
  path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  cursor INTEGER NOT NULL DEFAULT 0,
  events_total INTEGER NOT NULL DEFAULT 0,
  alerts_total INTEGER NOT NULL DEFAULT 0,
  last_poll_at TEXT,
  last_event_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (engagement_id, name)
);
CREATE INDEX IF NOT EXISTS idx_telemetry_sources_engagement ON telemetry_sources (engagement_id, status);

CREATE TABLE IF NOT EXISTS controls (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  control_key TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'detection',
  status TEXT NOT NULL DEFAULT 'unknown',
  evidence TEXT NOT NULL DEFAULT '',
  checked_at TEXT NOT NULL,
  UNIQUE (engagement_id, control_key)
);
CREATE INDEX IF NOT EXISTS idx_controls_engagement ON controls (engagement_id, status);

CREATE TABLE IF NOT EXISTS audit_anchors (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  head_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  public_key TEXT NOT NULL,
  key_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_anchors_engagement ON audit_anchors (engagement_id, created_at);

CREATE TABLE IF NOT EXISTS response_actions (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  incident_id TEXT,
  task_id TEXT,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  rollback TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  evidence TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'commander',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_response_actions_engagement ON response_actions (engagement_id, status);

CREATE TABLE IF NOT EXISTS detection_rules (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  selection TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'all',
  tags TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (engagement_id, rule_key)
);
CREATE INDEX IF NOT EXISTS idx_detection_rules_engagement ON detection_rules (engagement_id, enabled);
`
