/**
 * dsh-blue-team-mode —— SQLite 事实库
 *
 * 蓝队所有结论只认库里的记录：资产、告警、发现、IOC、任务、时间线。
 * 数据落在 `$DSH_HOME/blue/blue.db`，由 Host 平面唯一实例发布为 `ctx.blueTeam`，
 * 主会话与各执行角色共享同一份事实，避免"子智能体说做了、库里没有"。
 *
 * 零外部依赖：只用 node: 内置模块（node:sqlite，Node >= 22.13）。
 */
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import {
  ACTIVE_TASK_STATUSES, ALERT_OPEN_STATUSES, FINDING_OPEN_STATUSES, RISK_LEVELS,
  TASK_STATUS, TASK_STATUSES, canTransitionTask, postureOf, sqlIn,
} from './judge.js'

const SCHEMA = `
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

const PRIORITIES = ['P0', 'P1', 'P2', 'P3']
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const DECOY_KINDS = ['canary_file', 'canary_url', 'fake_admin', 'fake_credential', 'tarpit']
const DECOY_STATUSES = ['planned', 'active', 'retired']
const INCIDENT_STATUSES = ['open', 'investigating', 'contained', 'closed']
const INCIDENT_TRANSITIONS = {
  open: ['investigating', 'contained', 'closed'],
  investigating: ['open', 'contained', 'closed'],
  contained: ['investigating', 'closed'],
  closed: ['open'],
}
const DECOY_TRANSITIONS = {
  planned: ['active', 'retired'],
  active: ['retired'],
  retired: [],
}

/** 生成短 id：前缀 + 8 位十六进制。 */
function newId(prefix) {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** 稳定指纹（告警去重）。 */
function fingerprintOf(parts) {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32)
}

function now() {
  return new Date().toISOString()
}

function parseJson(text, fallback) {
  if (typeof text !== 'string' || text === '') return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function clampPriority(value, fallback = 'P2') {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return PRIORITIES.includes(normalized) ? normalized : fallback
}

function clampSeverity(value, fallback = 'medium') {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return SEVERITIES.includes(normalized) ? normalized : fallback
}

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function clampRisk(value, fallback = 'low') {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return RISK_LEVELS.includes(normalized) ? normalized : fallback
}

function asFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0
}

function clampStatus(value, fallback = 'queued') {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return TASK_STATUSES.includes(normalized) ? normalized : fallback
}

/** IOC 值归一化：域名/哈希/URL 主机名大小写不应产生重复行。 */
function normalizeIocValue(type, raw) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (type === 'domain' || type === 'hostname') return value.toLowerCase().replace(/\.$/, '')
  if (type === 'hash' || type === 'md5' || type === 'sha1' || type === 'sha256') return value.toLowerCase()
  if (type === 'ip') return value.toLowerCase()
  if (type === 'url') {
    try {
      const url = new URL(value)
      url.hostname = url.hostname.toLowerCase()
      return url.toString()
    } catch {
      return value
    }
  }
  return value
}

export class BlueStore {
  constructor(root) {
    if (typeof root !== 'string' || root.length === 0) throw new Error('blue store: root 不能为空')
    this.root = root
    mkdirSync(root, { recursive: true })
    this.db = new DatabaseSync(join(root, 'blue.db'))
    this.db.exec(SCHEMA)
    this.migrate()
    this.stmts = new Map()
    this.closed = false
  }

  /** 旧库补列：CREATE TABLE IF NOT EXISTS 不会给已有库加字段。 */
  migrate() {
    const columnsOf = (table) => new Set(this.db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name))
    const add = (table, additions) => {
      const columns = columnsOf(table)
      for (const [name, definition] of additions) {
        if (!columns.has(name)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
      }
    }
    add('tasks', [
      ['risk_level', "TEXT NOT NULL DEFAULT 'low'"],
      ['requires_approval', 'INTEGER NOT NULL DEFAULT 0'],
      ['approved_by', 'TEXT'],
      ['approved_at', 'TEXT'],
      ['approval_note', 'TEXT'],
      ['scope', "TEXT NOT NULL DEFAULT ''"],
      ['constraints', "TEXT NOT NULL DEFAULT '[]'"],
      ['expected_output', "TEXT NOT NULL DEFAULT '{}'"],
    ])
    add('findings', [
      ['confidence', "TEXT NOT NULL DEFAULT 'medium'"],
      ['source', "TEXT NOT NULL DEFAULT ''"],
      ['task_id', 'TEXT'],
      ['incident_id', 'TEXT'],
    ])
    add('alerts', [
      ['confidence', "TEXT NOT NULL DEFAULT 'medium'"],
      ['task_id', 'TEXT'],
      ['incident_id', 'TEXT'],
      ['event_time', 'TEXT'],
    ])
    add('tasks', [
      ['incident_id', 'TEXT'],
    ])
    add('iocs', [
      ['first_seen', "TEXT NOT NULL DEFAULT ''"],
      ['last_seen', "TEXT NOT NULL DEFAULT ''"],
    ])
    add('decoys', [
      ['expires_at', 'TEXT'],
    ])
    add('decoy_hits', [
      ['event_key', 'TEXT'],
    ])
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_decoy_hits_event ON decoy_hits (engagement_id, event_key) WHERE event_key IS NOT NULL')
    add('timeline', [
      ['prev_hash', 'TEXT'],
      ['hash', 'TEXT'],
    ])
    this.backfillTimelineHashes()
    this.db.exec("UPDATE iocs SET first_seen = COALESCE(NULLIF(first_seen, ''), created_at), last_seen = COALESCE(NULLIF(last_seen, ''), created_at)")
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_approval ON tasks (engagement_id, status, risk_level)')
  }

  /** 预编译语句缓存。 */
  sql(text) {
    let stmt = this.stmts.get(text)
    if (stmt === undefined) {
      stmt = this.db.prepare(text)
      this.stmts.set(text, stmt)
    }
    return stmt
  }

  close() {
    if (this.closed) return
    this.closed = true
    try { this.stmts.clear() } catch { /* ignore */ }
    try { this.db.close() } catch { /* ignore */ }
  }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const value = fn()
      this.db.exec('COMMIT')
      return value
    } catch (error) {
      try { this.db.exec('ROLLBACK') } catch { /* ignore */ }
      throw error
    }
  }

  /* ── meta ───────────────────────────────────────────────────────────────── */

  getMeta(key, fallback = undefined) {
    const row = this.sql('SELECT value FROM meta WHERE key = ?').get(key)
    if (row === undefined) return fallback
    try { return JSON.parse(row.value) } catch { return fallback }
  }

  setMeta(key, value) {
    this.sql('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value))
    return value
  }

  /* ── engagement ─────────────────────────────────────────────────────────── */

  openEngagement(name, scope = [], note = '') {
    const normalized = asText(name).trim()
    if (normalized === '') throw new Error('靶标/防守单位名称不能为空')
    const existing = this.sql("SELECT * FROM engagements WHERE name = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1")
      .get(normalized)
    if (existing !== undefined) {
      if (Array.isArray(scope) && scope.length > 0) {
        this.sql('UPDATE engagements SET scope = ?, note = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(scope), asText(note) || existing.note, now(), existing.id)
      }
      this.addTimeline(existing.id, {
        actor: 'commander',
        action: 'engagement_reuse',
        target: normalized,
        detail: '复用已存在的防守目标',
      })
      return this.getEngagement(existing.id)
    }
    const id = newId('ENG')
    const at = now()
    this.sql(`INSERT INTO engagements (id, name, scope, note, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)`)
      .run(id, normalized, JSON.stringify(Array.isArray(scope) ? scope : []), asText(note), at, at)
    this.addTimeline(id, { actor: 'commander', action: 'engagement_open', target: normalized, detail: asText(note) })
    return this.getEngagement(id)
  }

  getEngagement(idOrName) {
    if (typeof idOrName !== 'string' || idOrName === '') return null
    const row = this.sql('SELECT * FROM engagements WHERE id = ?').get(idOrName)
      ?? this.sql('SELECT * FROM engagements WHERE name = ? ORDER BY created_at DESC LIMIT 1').get(idOrName)
    return row === undefined ? null : this.toEngagement(row)
  }

  listEngagements() {
    return this.sql('SELECT * FROM engagements ORDER BY created_at DESC').all().map((row) => this.toEngagement(row))
  }

  toEngagement(row) {
    return {
      ...row,
      scope: parseJson(row.scope, []),
      stats: this.stats(row.id),
    }
  }

  /* ── incidents ──────────────────────────────────────────────────────────── */

  addIncident(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new Error('案件标题不能为空')
    const severity = clampSeverity(asText(input.severity, 'medium'))
    const status = INCIDENT_STATUSES.includes(asText(input.status)) ? asText(input.status) : 'open'
    const id = newId('INC')
    const at = now()
    this.sql(`INSERT INTO incidents (id, engagement_id, title, severity, status, owner, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, title, severity, status, asText(input.owner), asText(input.summary), at, at)
    this.addTimeline(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'incident_open',
      target: title,
      detail: `severity=${severity} status=${status}`,
    })
    return this.getIncident(id)
  }

  getIncident(id) {
    return this.sql('SELECT * FROM incidents WHERE id = ?').get(id) ?? null
  }

  listIncidents(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'severity', 'owner']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500)
    return this.sql(`SELECT * FROM incidents WHERE ${clauses.join(' AND ')}
      ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 WHEN 'contained' THEN 2 ELSE 3 END,
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC LIMIT ?`).all(...params, limit)
  }

  updateIncident(id, patch = {}) {
    const current = this.getIncident(id)
    if (current === null) throw new Error('案件不存在：' + id)
    const status = asText(patch.status, current.status)
    if (!INCIDENT_STATUSES.includes(status)) throw new Error('案件状态非法：' + status)
    if (status !== current.status && !(INCIDENT_TRANSITIONS[current.status] || []).includes(status)) {
      throw new Error(`案件状态不能从 ${current.status} 直接改为 ${status}`)
    }
    const severity = clampSeverity(asText(patch.severity, current.severity))
    const owner = asText(patch.owner, current.owner)
    const summary = asText(patch.summary, current.summary)
    this.sql('UPDATE incidents SET severity = ?, status = ?, owner = ?, summary = ?, updated_at = ? WHERE id = ?')
      .run(severity, status, owner, summary, now(), id)
    this.addTimeline(current.engagement_id, {
      actor: asText(patch.actor, 'commander'),
      action: 'incident_update',
      target: current.title,
      detail: `severity=${severity} status=${status}${owner ? ' owner=' + owner : ''}`,
    })
    return this.getIncident(id)
  }

  attachIncident(id, input = {}) {
    const incident = this.getIncident(id)
    if (incident === null) throw new Error('案件不存在：' + id)
    const targets = [
      ['alerts', input.alert_id],
      ['findings', input.finding_id],
      ['tasks', input.task_id],
    ].filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    if (targets.length === 0) throw new Error('至少给一个 alert_id/finding_id/task_id')
    const validated = []
    for (const [table, value] of targets) {
      const row = this.sql(`SELECT id, engagement_id FROM ${table} WHERE id = ?`).get(value.trim())
      if (row === undefined || row.engagement_id !== incident.engagement_id) {
        throw new Error(`${table} 记录不存在或不属于同一防守目标：${value}`)
      }
      validated.push({ table, id: row.id })
    }
    for (const row of validated) {
      if (row.table === 'tasks') {
        this.sql('UPDATE tasks SET incident_id = ?, updated_at = ? WHERE id = ?').run(id, now(), row.id)
      } else {
        this.sql(`UPDATE ${row.table} SET incident_id = ? WHERE id = ?`).run(id, row.id)
      }
    }
    this.sql('UPDATE incidents SET updated_at = ? WHERE id = ?').run(now(), id)
    this.addTimeline(incident.engagement_id, {
      actor: asText(input.actor, 'commander'),
      action: 'incident_attach',
      target: incident.title,
      detail: validated.map((item) => `${item.table}:${item.id}`).join(' '),
    })
    return { incident: this.getIncident(id), attached: validated }
  }

  addDecision(engagementId, input = {}) {
    const decision = asText(input.decision).trim()
    if (decision === '') throw new Error('决策内容不能为空')
    const confidence = asText(input.confidence, 'medium')
    if (!['low', 'medium', 'high'].includes(confidence)) throw new Error('置信度非法：' + confidence)
    for (const [table, value] of [['incidents', input.incident_id], ['tasks', input.task_id], ['alerts', input.alert_id]]) {
      if (typeof value !== 'string' || value.trim() === '') continue
      const row = this.sql(`SELECT id, engagement_id FROM ${table} WHERE id = ?`).get(value.trim())
      if (row === undefined || row.engagement_id !== engagementId) {
        throw new Error(`${table} 记录不存在或不属于当前防守目标：${value}`)
      }
    }
    const id = newId('DSN')
    this.sql(`INSERT INTO decisions (id, engagement_id, incident_id, task_id, alert_id, actor, decision, rationale, confidence, evidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, input.incident_id ?? null, input.task_id ?? null, input.alert_id ?? null,
        asText(input.actor, 'commander'), decision, asText(input.rationale), confidence, asText(input.evidence), now())
    this.addTimeline(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'decision',
      target: input.incident_id || input.task_id || input.alert_id || 'general',
      detail: `${decision} confidence=${confidence}`,
    })
    return this.sql('SELECT * FROM decisions WHERE id = ?').get(id)
  }

  listDecisions(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['incident_id', 'task_id', 'alert_id', 'actor']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500)
    return this.sql(`SELECT * FROM decisions WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit)
  }

  /* ── assets ─────────────────────────────────────────────────────────────── */

  addAsset(engagementId, input = {}) {
    const kind = asText(input.kind, 'host').trim() || 'host'
    const address = asText(input.address).trim()
    const name = asText(input.name).trim() || address || '未命名资产'
    if (address === '' && asText(input.name).trim() === '') throw new Error('资产至少需要 name 或 address')
    const port = Number.isInteger(input.port) ? input.port : null
    const criticality = asText(input.criticality).trim()
    const dedupe = fingerprintOf([kind, address.toLowerCase(), String(port ?? '')])
    const id = newId('AST')
    const at = now()
    const tags = Array.isArray(input.tags) ? input.tags : []
    this.sql(`INSERT INTO assets
      (id, engagement_id, dedupe, name, kind, address, port, service, criticality, owner, tags, evidence, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, dedupe) DO UPDATE SET
        name = excluded.name,
        service = CASE WHEN excluded.service <> '' THEN excluded.service ELSE assets.service END,
        criticality = CASE WHEN ? <> '' THEN ? ELSE assets.criticality END,
        owner = CASE WHEN excluded.owner <> '' THEN excluded.owner ELSE assets.owner END,
        tags = CASE WHEN excluded.tags <> '[]' THEN excluded.tags ELSE assets.tags END,
        evidence = CASE WHEN excluded.evidence <> '' THEN excluded.evidence ELSE assets.evidence END,
        status = CASE WHEN ? <> '' THEN ? ELSE assets.status END,
        updated_at = excluded.updated_at`)
      .run(
        id, engagementId, dedupe, name, kind, address, port,
        asText(input.service), criticality || 'medium',
        asText(input.owner), JSON.stringify(tags), asText(input.evidence),
        asText(input.status, 'in_scope'), at, at,
        criticality, criticality, asText(input.status), asText(input.status),
      )
    const asset = this.sql('SELECT * FROM assets WHERE engagement_id = ? AND dedupe = ?').get(engagementId, dedupe)
    this.addTimeline(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'asset_add',
      target: `${name}${address ? ' (' + address + ')' : ''}`,
      detail: `kind=${kind} criticality=${asText(input.criticality, 'medium')}`,
    })
    return this.toAsset(asset)
  }

  queryAssets(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.kind === 'string' && filters.kind !== '') {
      clauses.push('kind = ?')
      params.push(filters.kind)
    }
    if (typeof filters.criticality === 'string' && filters.criticality !== '') {
      clauses.push('criticality = ?')
      params.push(filters.criticality)
    }
    if (typeof filters.status === 'string' && filters.status !== '') {
      clauses.push('status = ?')
      params.push(filters.status)
    }
    if (typeof filters.q === 'string' && filters.q.trim() !== '') {
      clauses.push('(name LIKE ? OR address LIKE ? OR service LIKE ? OR owner LIKE ?)')
      const like = `%${filters.q.trim()}%`
      params.push(like, like, like, like)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    const rows = this.sql(`SELECT * FROM assets WHERE ${clauses.join(' AND ')} ORDER BY
      CASE criticality WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      updated_at DESC LIMIT ?`).all(...params, limit)
    return rows.map((row) => this.toAsset(row))
  }

  getAsset(id) {
    const row = this.sql('SELECT * FROM assets WHERE id = ?').get(id)
    return row === undefined ? null : this.toAsset(row)
  }

  toAsset(row) {
    return { ...row, tags: parseJson(row.tags, []) }
  }

  /* ── findings ───────────────────────────────────────────────────────────── */

  addFinding(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new Error('发现标题不能为空')
    const id = newId('FND')
    const at = now()
    this.sql(`INSERT INTO findings
      (id, engagement_id, asset_id, title, severity, category, status, confidence, source, task_id, cve, evidence, recommendation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, input.asset_id ?? null, title,
        clampSeverity(asText(input.severity)), asText(input.category, 'other'),
        asText(input.status, 'open'), asText(input.confidence, 'medium'), asText(input.source),
        input.task_id ?? null, asText(input.cve), asText(input.evidence),
        asText(input.recommendation), at, at,
      )
    this.addTimeline(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'finding_add',
      target: title,
      detail: `severity=${clampSeverity(asText(input.severity))} category=${asText(input.category, 'other')}`,
    })
    return this.getFinding(id)
  }

  getFinding(id) {
    const row = this.sql('SELECT * FROM findings WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  updateFinding(id, patch = {}) {
    const current = this.getFinding(id)
    if (current === null) throw new Error('发现不存在：' + id)
    const status = asText(patch.status, current.status)
    const severity = clampSeverity(asText(patch.severity, current.severity))
    this.sql(`UPDATE findings SET status = ?, severity = ?, confidence = ?, source = ?, task_id = ?,
      cve = ?, evidence = ?, recommendation = ?, updated_at = ? WHERE id = ?`)
      .run(
        status,
        severity,
        asText(patch.confidence, current.confidence),
        asText(patch.source, current.source),
        patch.task_id === undefined ? current.task_id : patch.task_id,
        asText(patch.cve, current.cve),
        asText(patch.evidence, current.evidence),
        asText(patch.recommendation, current.recommendation),
        now(),
        id,
      )
    this.addTimeline(current.engagement_id, {
      actor: asText(patch.actor, 'commander'),
      action: 'finding_update',
      target: current.title,
      detail: `status=${status} severity=${severity}`,
    })
    return this.getFinding(id)
  }

  listFindings(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'severity', 'category', 'confidence', 'source', 'task_id']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.sql(`SELECT * FROM findings WHERE ${clauses.join(' AND ')} ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC LIMIT ?`).all(...params, limit)
  }

  /* ── alerts ─────────────────────────────────────────────────────────────── */

  addAlert(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new Error('告警标题不能为空')
    const fingerprint = asText(input.fingerprint).trim()
      || fingerprintOf([asText(input.source), asText(input.external_id), title, asText(input.raw).slice(0, 2000)])
    const rawSeverity = asText(input.severity).trim()
    const severity = clampSeverity(rawSeverity)
    const id = newId('ALT')
    const at = now()
    const existing = this.sql('SELECT id FROM alerts WHERE engagement_id = ? AND fingerprint = ?').get(engagementId, fingerprint)
    this.sql(`INSERT INTO alerts
      (id, engagement_id, fingerprint, external_id, title, severity, source, confidence, task_id, status, assignee, note, raw, event_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, fingerprint) DO UPDATE SET
        severity = CASE WHEN ? <> '' THEN ? ELSE alerts.severity END,
        confidence = CASE WHEN excluded.confidence <> '' THEN excluded.confidence ELSE alerts.confidence END,
        task_id = COALESCE(excluded.task_id, alerts.task_id),
        note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE alerts.note END,
        raw = CASE WHEN excluded.raw <> '' THEN excluded.raw ELSE alerts.raw END,
        event_time = COALESCE(excluded.event_time, alerts.event_time),
        updated_at = excluded.updated_at`)
      .run(
        id, engagementId, fingerprint, asText(input.external_id), title,
        severity, asText(input.source), asText(input.confidence, 'medium'), input.task_id ?? null,
        asText(input.status, 'open'), asText(input.assignee), asText(input.note), asText(input.raw),
        asText(input.event_time, null), at, at,
        rawSeverity, severity,
      )
    const alert = this.sql('SELECT * FROM alerts WHERE engagement_id = ? AND fingerprint = ?').get(engagementId, fingerprint)
    alert.inserted = existing === undefined
    if (alert.id === id) {
      this.addTimeline(engagementId, {
        actor: asText(input.actor, 'monitor'),
        action: 'alert_ingest',
        target: title,
        detail: `severity=${clampSeverity(asText(input.severity))} source=${asText(input.source)}`,
      })
    }
    return alert
  }

  listAlerts(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'severity', 'source', 'confidence', 'task_id']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.sql(`SELECT * FROM alerts WHERE ${clauses.join(' AND ')} ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC LIMIT ?`).all(...params, limit)
  }

  updateAlert(id, patch = {}) {
    const current = this.sql('SELECT * FROM alerts WHERE id = ?').get(id)
    if (current === undefined) throw new Error('告警不存在：' + id)
    const status = asText(patch.status, current.status)
    const severity = clampSeverity(asText(patch.severity, current.severity))
    const assignee = asText(patch.assignee, current.assignee)
    const note = asText(patch.note, current.note)
    const confidence = asText(patch.confidence, current.confidence)
    const taskId = patch.task_id === undefined ? current.task_id : patch.task_id
    this.sql('UPDATE alerts SET status = ?, severity = ?, confidence = ?, task_id = ?, assignee = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(status, severity, confidence, taskId, assignee, note, now(), id)
    this.addTimeline(current.engagement_id, {
      actor: asText(patch.actor, 'monitor'),
      action: 'alert_triage',
      target: current.title,
      detail: `status=${status} severity=${severity}${assignee ? ' assignee=' + assignee : ''}`,
    })
    return this.sql('SELECT * FROM alerts WHERE id = ?').get(id)
  }

  /* ── decoys / deception ─────────────────────────────────────────────────── */

  addDecoy(engagementId, input = {}) {
    const kind = asText(input.kind, 'canary_file').trim().toLowerCase()
    if (!DECOY_KINDS.includes(kind)) throw new Error('不支持的诱饵类型：' + kind)
    const name = asText(input.name).trim()
    if (name === '') throw new Error('诱饵名称不能为空')
    const target = asText(input.target).trim()
    if (target === '') throw new Error('诱饵目标不能为空')
    const status = DECOY_STATUSES.includes(asText(input.status)) ? asText(input.status) : 'planned'
    const token = asText(input.token).trim() || `DECOY-${randomUUID().replace(/-/g, '')}`
    const ttlHours = Math.min(Math.max(Number(input.ttl_hours) || 24, 1), 168)
    const expiresAt = asText(input.expires_at).trim()
      || new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
    const id = newId('DEC')
    const at = now()
    this.sql(`INSERT INTO decoys
      (id, engagement_id, kind, name, target, token, status, note, hit_count, last_hit_at, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`)
      .run(id, engagementId, kind, name, target, token, status, asText(input.note), expiresAt, at, at)
    this.addTimeline(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'decoy_create',
      target: name,
      detail: `kind=${kind} target=${target} token=${token.slice(0, 12)}… status=${status}`,
    })
    return this.getDecoy(id)
  }

  getDecoy(id) {
    return this.sql('SELECT * FROM decoys WHERE id = ?').get(id) ?? null
  }

  findDecoyByName(engagementId, name) {
    return this.sql('SELECT * FROM decoys WHERE engagement_id = ? AND name = ?').get(engagementId, asText(name).trim()) ?? null
  }

  /** 到期的诱饵自动取消/下线；只改事实库状态，不会操作真实部署。 */
  expireDecoys(engagementId) {
    const at = now()
    const expired = this.sql(`SELECT id, name FROM decoys
      WHERE engagement_id = ? AND status <> 'retired'
        AND expires_at IS NOT NULL AND expires_at <= ?`).all(engagementId, at)
    for (const decoy of expired) {
      this.sql("UPDATE decoys SET status = 'retired', updated_at = ? WHERE id = ?").run(at, decoy.id)
      this.addTimeline(engagementId, {
        actor: 'system',
        action: 'decoy_expire',
        target: decoy.name,
        detail: `decoy=${decoy.id} 自动取消（到期）`,
      })
    }
    return expired.length
  }

  listDecoys(engagementId, filters = {}) {
    this.expireDecoys(engagementId)
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'kind']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.sql(`SELECT * FROM decoys WHERE ${clauses.join(' AND ')}
      ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, created_at DESC LIMIT ?`)
      .all(...params, limit)
  }

  updateDecoy(id, patch = {}) {
    const current = this.getDecoy(id)
    if (current === null) throw new Error('诱饵不存在：' + id)
    const status = asText(patch.status, current.status)
    if (!DECOY_STATUSES.includes(status)) throw new Error('诱饵状态非法：' + status)
    if (status !== current.status && !(DECOY_TRANSITIONS[current.status] || []).includes(status)) {
      throw new Error(`诱饵状态不能从 ${current.status} 直接改为 ${status}`)
    }
    const note = asText(patch.note, current.note)
    this.sql('UPDATE decoys SET status = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(status, note, now(), id)
    this.addTimeline(current.engagement_id, {
      actor: asText(patch.actor, 'commander'),
      action: 'decoy_update',
      target: current.name,
      detail: `status=${status}`,
    })
    return this.getDecoy(id)
  }

  recordDecoyHit(id, input = {}) {
    const current = this.getDecoy(id)
    if (current === null) throw new Error('诱饵不存在：' + id)
    const eventKey = asText(input.event_key).trim()
    if (eventKey !== '') {
      const existing = this.sql('SELECT * FROM decoy_hits WHERE engagement_id = ? AND event_key = ?')
        .get(current.engagement_id, eventKey)
      if (existing !== undefined) return { duplicate: true, decoy: current, hit: existing }
    }
    const at = now()
    this.sql('UPDATE decoys SET hit_count = hit_count + 1, last_hit_at = ?, updated_at = ? WHERE id = ?')
      .run(at, at, id)
    const alert = this.addAlert(current.engagement_id, {
      title: `诱饵命中：${current.name}`,
      severity: asText(input.severity, 'high'),
      source: 'deception',
      confidence: 'high',
      note: `decoy=${current.id} kind=${current.kind} target=${current.target}`,
      raw: asText(input.evidence),
      actor: asText(input.actor, 'monitor'),
    })
    this.addTimeline(current.engagement_id, {
      actor: asText(input.actor, 'monitor'),
      action: 'decoy_hit',
      target: current.name,
      detail: `decoy=${current.id} source=${asText(input.source)} alert=${alert.id}`,
    })
    const hitId = newId('DCH')
    this.sql(`INSERT INTO decoy_hits (id, engagement_id, decoy_id, source, evidence, severity, alert_id, at, event_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(hitId, current.engagement_id, current.id, asText(input.source), asText(input.evidence), asText(input.severity, 'high'), alert.id, at, eventKey || null)
    return { decoy: this.getDecoy(id), alert, hit_id: hitId }
  }

  listDecoyHits(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.decoy === 'string' && filters.decoy !== '') {
      clauses.push('decoy_id = ?')
      params.push(filters.decoy)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.sql(`SELECT * FROM decoy_hits WHERE ${clauses.join(' AND ')} ORDER BY at DESC LIMIT ?`)
      .all(...params, limit)
  }

  /* ── iocs ───────────────────────────────────────────────────────────────── */

  addIoc(engagementId, input = {}) {
    const type = asText(input.type, 'ip').trim().toLowerCase() || 'ip'
    const value = normalizeIocValue(type, asText(input.value))
    if (value === '') throw new Error('IOC 值不能为空')
    const confidence = asText(input.confidence).trim()
    const id = newId('IOC')
    const at = now()
    this.sql(`INSERT INTO iocs (id, engagement_id, type, value, confidence, source, note, first_seen, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, type, value) DO UPDATE SET
        confidence = CASE WHEN ? <> '' THEN ? ELSE iocs.confidence END,
        source = CASE WHEN excluded.source <> '' THEN excluded.source ELSE iocs.source END,
        note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE iocs.note END,
        last_seen = excluded.last_seen`)
      .run(id, engagementId, type, value, confidence || 'medium', asText(input.source), asText(input.note), at, at, at, confidence, confidence)
    return this.sql('SELECT * FROM iocs WHERE engagement_id = ? AND type = ? AND value = ?').get(engagementId, type, value)
  }

  listIocs(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.type === 'string' && filters.type !== '') {
      clauses.push('type = ?')
      params.push(filters.type)
    }
    if (typeof filters.q === 'string' && filters.q.trim() !== '') {
      clauses.push('value LIKE ?')
      params.push(`%${filters.q.trim()}%`)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 500, 1), 2000)
    return this.sql(`SELECT * FROM iocs WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit)
  }

  /* ── tasks ──────────────────────────────────────────────────────────────── */

  createTask(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new Error('任务标题不能为空')
    const id = newId('TSK')
    const at = now()
    const riskLevel = clampRisk(input.risk_level, 'low')
    const requiresApproval = riskLevel === 'high' ? 1 : asFlag(input.requires_approval)
    const status = riskLevel === 'high' ? TASK_STATUS.PENDING_APPROVAL : clampStatus(asText(input.status, TASK_STATUS.QUEUED))
    this.sql(`INSERT INTO tasks
      (id, engagement_id, role, title, brief, priority, status, risk_level, requires_approval,
       scope, constraints, expected_output, assignee, asset_id, alert_id, acceptance, result, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, asText(input.role, 'monitor'), title, asText(input.brief),
        clampPriority(asText(input.priority)), status, riskLevel, requiresApproval,
        asText(input.scope), JSON.stringify(Array.isArray(input.constraints) ? input.constraints : []),
        JSON.stringify(input.expected_output && typeof input.expected_output === 'object' ? input.expected_output : {}),
        asText(input.assignee), input.asset_id ?? null, input.alert_id ?? null,
        asText(input.acceptance), asText(input.result), asText(input.note), at, at,
      )
    this.addTimeline(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'task_create',
      target: title,
      detail: `role=${asText(input.role, 'monitor')} priority=${clampPriority(asText(input.priority))} risk=${riskLevel} status=${status}`,
    })
    return this.getTask(id)
  }

  getTask(id) {
    const row = this.sql('SELECT * FROM tasks WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  listTasks(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'role', 'priority', 'risk_level']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.sql(`SELECT * FROM tasks WHERE ${clauses.join(' AND ')} ORDER BY
      CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
      created_at ASC LIMIT ?`).all(...params, limit)
  }

  updateTask(id, patch = {}) {
    const current = this.getTask(id)
    if (current === null) throw new Error('任务不存在：' + id)
    const status = clampStatus(asText(patch.status, current.status), current.status)
    if (!canTransitionTask(current.status, status)) {
      throw new Error(`任务状态不允许从 ${current.status} 迁移到 ${status}；请走判定层定义的路径`)
    }
    if (current.status === TASK_STATUS.PENDING_APPROVAL && status !== TASK_STATUS.PENDING_APPROVAL && status !== TASK_STATUS.CANCELLED) {
      throw new Error('待审批任务不能直接变更状态；请先调用 blue_task_approve')
    }
    if (status === TASK_STATUS.DISPATCHED && current.risk_level === 'high' && !current.approved_at) {
      throw new Error('高风险任务未经审批，禁止派发')
    }
    const nowAt = now()
    const dispatchedAt = status === 'dispatched' && current.dispatched_at === null ? nowAt : current.dispatched_at
    const completedAt = (status === 'done' || status === 'blocked' || status === 'cancelled')
      ? (current.completed_at ?? nowAt)
      : null
    const constraints = patch.constraints === undefined
      ? current.constraints
      : JSON.stringify(Array.isArray(patch.constraints) ? patch.constraints : [])
    const expectedOutput = patch.expected_output === undefined
      ? current.expected_output
      : JSON.stringify(patch.expected_output && typeof patch.expected_output === 'object' ? patch.expected_output : {})
    this.sql(`UPDATE tasks SET role = ?, priority = ?, status = ?, assignee = ?, result = ?, note = ?,
      scope = ?, constraints = ?, expected_output = ?, dispatched_at = ?, completed_at = ?, updated_at = ? WHERE id = ?`)
      .run(
        asText(patch.role, current.role),
        clampPriority(asText(patch.priority, current.priority)),
        status,
        asText(patch.assignee, current.assignee),
        asText(patch.result, current.result),
        asText(patch.note, current.note),
        asText(patch.scope, current.scope),
        constraints,
        expectedOutput,
        dispatchedAt, completedAt, nowAt, id,
      )
    this.addTimeline(current.engagement_id, {
      actor: asText(patch.actor, 'commander'),
      action: 'task_update',
      target: current.title,
      detail: `status=${status} risk=${current.risk_level}${patch.note ? ' note=' + asText(patch.note) : ''}`,
    })
    return this.getTask(id)
  }

  approveTask(id, options = {}) {
    const approvedBy = asText(options.actor).trim()
    if (approvedBy === '') throw new Error('审批必须记录 approved_by')
    return this.transaction(() => {
      const current = this.getTask(id)
      if (current === null) throw new Error('任务不存在：' + id)
      if (current.status !== TASK_STATUS.PENDING_APPROVAL) throw new Error('任务不在待审批状态：' + id)
      if (current.risk_level !== 'high') throw new Error('只有高风险任务需要审批：' + id)
      const at = now()
      const note = asText(options.note, 'human approved')
      this.sql(`UPDATE tasks SET status = ?, approved_by = ?, approved_at = ?, approval_note = ?, updated_at = ?
        WHERE id = ? AND status = ?`)
        .run(TASK_STATUS.QUEUED, approvedBy, at, note, at, id, TASK_STATUS.PENDING_APPROVAL)
      this.addTimeline(current.engagement_id, {
        actor: approvedBy,
        action: 'approval',
        target: current.title,
        detail: `task_id=${current.id} risk=${current.risk_level} decision=approved note=${note}`,
      })
      return this.getTask(id)
    })
  }

  /** 角色/范围变更导致风险升级时，原子地把任务退回待审批。 */
  reclassifyTaskRisk(id, options = {}) {
    return this.transaction(() => {
      const current = this.getTask(id)
      if (current === null) throw new Error('任务不存在：' + id)
      if (['done', 'blocked', 'cancelled'].includes(current.status)) throw new Error('终态任务不能重新分级：' + id)
      if (current.status === 'dispatched' || current.status === 'running') throw new Error('已派发/运行中的任务不能重新分级；请先取消并重新建任务')
      const at = now()
      this.sql(`UPDATE tasks SET risk_level = 'high', requires_approval = 1, status = ?,
        approved_by = NULL, approved_at = NULL, approval_note = NULL, updated_at = ? WHERE id = ?`)
        .run(TASK_STATUS.PENDING_APPROVAL, at, id)
      this.addTimeline(current.engagement_id, {
        actor: asText(options.actor, 'system'),
        action: 'risk_reclassified',
        target: current.title,
        detail: `task_id=${current.id} risk=low->high reason=${asText(options.reason, 'role/scope changed')}`,
      })
      return this.getTask(id)
    })
  }

  /* ── timeline ───────────────────────────────────────────────────────────── */

  addTimeline(engagementId, input = {}) {
    const id = newId('TL')
    const at = asText(input.at, now())
    const actor = asText(input.actor, 'system')
    const action = asText(input.action, 'note')
    const target = asText(input.target)
    const detail = asText(input.detail)
    const previous = this.sql('SELECT hash FROM timeline WHERE engagement_id = ? ORDER BY rowid DESC LIMIT 1')
      .get(engagementId)
    const prevHash = previous && typeof previous.hash === 'string' ? previous.hash : ''
    const hash = this.timelineHash({ engagement_id: engagementId, at, actor, action, target, detail }, prevHash)
    this.sql(`INSERT INTO timeline (id, engagement_id, at, actor, action, target, detail, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, at, actor, action, target, detail, prevHash || null, hash)
    return id
  }

  timelineHash(row, prevHash) {
    return createHash('sha256')
      .update(JSON.stringify([
        prevHash || '',
        row.engagement_id,
        row.at,
        row.actor,
        row.action,
        row.target,
        row.detail,
      ]))
      .digest('hex')
  }

  /** 只为缺失 hash 的旧行补链；已有 hash 不覆盖，避免迁移顺手“修复”篡改。 */
  backfillTimelineHashes() {
    const rows = this.db.prepare('SELECT rowid, * FROM timeline ORDER BY rowid').all()
    if (rows.length === 0) return
    const previous = new Map()
    const update = this.db.prepare('UPDATE timeline SET prev_hash = ?, hash = ? WHERE rowid = ?')
    for (const row of rows) {
      const prev = previous.get(row.engagement_id) || ''
      if (typeof row.hash !== 'string' || row.hash === '') {
        row.prev_hash = prev || null
        row.hash = this.timelineHash(row, prev)
        update.run(row.prev_hash, row.hash, row.rowid)
      }
      previous.set(row.engagement_id, row.hash)
    }
  }

  listTimeline(engagementId, limit = 200) {
    const safe = Math.min(Math.max(Number(limit) || 200, 1), 2000)
    return this.sql('SELECT * FROM timeline WHERE engagement_id = ? ORDER BY at DESC LIMIT ?')
      .all(engagementId, safe)
  }

  verifyTimeline(engagementId) {
    const rows = this.sql('SELECT rowid, * FROM timeline WHERE engagement_id = ? ORDER BY rowid').all(engagementId)
    let prev = ''
    for (const row of rows) {
      const expected = this.timelineHash(row, prev)
      if (row.prev_hash !== (prev || null) || row.hash !== expected) {
        return {
          ok: false,
          checked: rows.length,
          broken_at: row.id,
          reason: 'hash_mismatch',
          expected,
          actual: row.hash,
        }
      }
      prev = row.hash
    }
    return { ok: true, checked: rows.length, head: prev, broken_at: null, reason: '' }
  }

  /* ── stats / report ─────────────────────────────────────────────────────── */

  count(sql, ...params) {
    const row = this.sql(sql).get(...params)
    return row === undefined ? 0 : Number(row.n) || 0
  }

  stats(engagementId) {
    this.expireDecoys(engagementId)
    const stats = {
      assets: this.count('SELECT COUNT(*) AS n FROM assets WHERE engagement_id = ?', engagementId),
      assets_critical: this.count(
        "SELECT COUNT(*) AS n FROM assets WHERE engagement_id = ? AND criticality IN ('critical','high')",
        engagementId,
      ),
      alerts_open: this.count(`SELECT COUNT(*) AS n FROM alerts WHERE engagement_id = ? AND status IN (${sqlIn(ALERT_OPEN_STATUSES)})`, engagementId),
      alerts_critical: this.count(`SELECT COUNT(*) AS n FROM alerts WHERE engagement_id = ? AND severity IN ('critical','high') AND status IN (${sqlIn(ALERT_OPEN_STATUSES)})`, engagementId),
      findings_open: this.count(`SELECT COUNT(*) AS n FROM findings WHERE engagement_id = ? AND status IN (${sqlIn(FINDING_OPEN_STATUSES)})`, engagementId),
      findings_critical: this.count(`SELECT COUNT(*) AS n FROM findings WHERE engagement_id = ? AND severity IN ('critical','high') AND status IN (${sqlIn(FINDING_OPEN_STATUSES)})`, engagementId),
      iocs: this.count('SELECT COUNT(*) AS n FROM iocs WHERE engagement_id = ?', engagementId),
      incidents_open: this.count("SELECT COUNT(*) AS n FROM incidents WHERE engagement_id = ? AND status IN ('open','investigating')", engagementId),
      incidents_critical: this.count("SELECT COUNT(*) AS n FROM incidents WHERE engagement_id = ? AND severity IN ('critical','high') AND status IN ('open','investigating')", engagementId),
      decisions: this.count('SELECT COUNT(*) AS n FROM decisions WHERE engagement_id = ?', engagementId),
      decoys: this.count('SELECT COUNT(*) AS n FROM decoys WHERE engagement_id = ?', engagementId),
      decoys_active: this.count("SELECT COUNT(*) AS n FROM decoys WHERE engagement_id = ? AND status = 'active'", engagementId),
      decoys_hit: this.count('SELECT COUNT(*) AS n FROM decoys WHERE engagement_id = ? AND hit_count > 0', engagementId),
      decoy_hits: this.count('SELECT COUNT(*) AS n FROM decoy_hits WHERE engagement_id = ?', engagementId),
      tasks_queued: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'queued'", engagementId),
      tasks_pending_approval: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'pending_approval'", engagementId),
      tasks_high_risk: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND risk_level = 'high' AND status NOT IN ('done','blocked','cancelled')", engagementId),
      tasks_active: this.count(`SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status IN (${sqlIn(ACTIVE_TASK_STATUSES)})`, engagementId),
      tasks_done: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'done'", engagementId),
      tasks_blocked: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'blocked'", engagementId),
    }
    return { ...stats, posture: postureOf(stats) }
  }

  report(engagementId) {
    const engagement = this.getEngagement(engagementId)
    if (engagement === null) throw new Error('防守目标不存在：' + engagementId)
    const stats = this.stats(engagementId)
    const assets = this.queryAssets(engagementId, { limit: 50 })
    const alerts = this.listAlerts(engagementId, { limit: 30 })
    const findings = this.listFindings(engagementId, { limit: 30 })
    const iocs = this.listIocs(engagementId, { limit: 30 })
    const tasks = this.listTasks(engagementId, { limit: 50 })
    const incidents = this.listIncidents(engagementId, { limit: 30 })
    const decisions = this.listDecisions(engagementId, { limit: 30 })
    const timeline = this.listTimeline(engagementId, 30)
    const lines = []
    lines.push(`# 蓝队防守报告 · ${engagement.name}`)
    lines.push('')
    lines.push(`- 生成时间：${now()}`)
    lines.push(`- 防守目标：${engagement.name}（${engagement.id}）`)
    lines.push(`- 授权/防守范围：${engagement.scope.length > 0 ? engagement.scope.join(', ') : '未填写（按实际防守资产为准）'}`)
    lines.push('')
    lines.push('## 态势总览')
    lines.push('')
    lines.push(`- 资产 ${stats.assets} 个（关键/高危 ${stats.assets_critical}）`)
    lines.push(`- 未闭环告警 ${stats.alerts_open} 条（高危及以上 ${stats.alerts_critical}）`)
    lines.push(`- 未闭环发现 ${stats.findings_open} 条（高危及以上 ${stats.findings_critical}）`)
    lines.push(`- IOC ${stats.iocs} 条`)
    lines.push(`- 诱饵 ${stats.decoys} 个（启用 ${stats.decoys_active}，命中 ${stats.decoy_hits}）`)
    lines.push(`- 任务：排队 ${stats.tasks_queued} / 待审批 ${stats.tasks_pending_approval} / 进行 ${stats.tasks_active} / 完成 ${stats.tasks_done} / 阻塞 ${stats.tasks_blocked}`)
    lines.push('')
    lines.push('## 执行摘要')
    lines.push('')
    lines.push(`- 关键/高危资产 ${stats.assets_critical} 个；未闭环高危告警 ${stats.alerts_critical} 条；未闭环高危发现 ${stats.findings_critical} 条`)
    lines.push(`- 待审批 ${stats.tasks_pending_approval} 个；进行中 ${stats.tasks_active} 个；已完成 ${stats.tasks_done} 个`)
    lines.push(`- 未闭环案件 ${stats.incidents_open} 个（高危及以上 ${stats.incidents_critical}）；决策记录 ${stats.decisions} 条`)
    lines.push(`- 诱饵启用 ${stats.decoys_active} 个；诱饵命中 ${stats.decoy_hits} 次`)
    lines.push('- 以上数字来自事实库；未落库的事件不计入报告。')
    lines.push('')
    lines.push('## 关键资产')
    if (assets.length === 0) lines.push('_暂无资产记录_')
    for (const asset of assets) {
      lines.push(`- [${asset.criticality}] ${asset.name} · ${asset.kind}${asset.address ? ' · ' + asset.address : ''}${asset.port ? ':' + asset.port : ''}${asset.service ? ' · ' + asset.service : ''}（${asset.status}）`)
    }
    lines.push('')
    lines.push('## 告警研判')
    if (alerts.length === 0) lines.push('_暂无告警_')
    for (const alert of alerts) {
      lines.push(`- [${alert.severity}/${alert.status}] ${alert.title} · 事件时间 ${alert.event_time || alert.created_at} · 来源 ${alert.source || 'unknown'} · 置信度 ${alert.confidence || 'medium'}${alert.task_id ? ' · 任务 ' + alert.task_id : ''}${alert.assignee ? ' · 负责人 ' + alert.assignee : ''}`)
      if (alert.note) lines.push(`  - 研判：${alert.note}`)
    }
    lines.push('')
    lines.push('## 脆弱性与发现')
    if (findings.length === 0) lines.push('_暂无发现_')
    for (const finding of findings) {
      lines.push(`- [${finding.severity}/${finding.status}] ${finding.title}（${finding.category}）${finding.cve ? ' · ' + finding.cve : ''} · 置信度 ${finding.confidence || 'medium'}${finding.source ? ' · 来源 ' + finding.source : ''}${finding.task_id ? ' · 任务 ' + finding.task_id : ''}`)
      if (finding.recommendation) lines.push(`  - 建议：${finding.recommendation}`)
    }
    lines.push('')
    lines.push('## IOC')
    if (iocs.length === 0) lines.push('_暂无 IOC_')
    for (const ioc of iocs) {
      lines.push(`- ${ioc.type} \`${ioc.value}\`（置信度 ${ioc.confidence}${ioc.source ? '，来源 ' + ioc.source : ''}）`)
    }
    lines.push('')
    lines.push('## 案件')
    if (incidents.length === 0) lines.push('_暂无案件_')
    for (const incident of incidents) {
      lines.push(`- [${incident.severity}/${incident.status}] ${incident.title}（${incident.id}）${incident.owner ? ' · 负责人 ' + incident.owner : ''}`)
      if (incident.summary) lines.push(`  - 摘要：${incident.summary}`)
    }
    lines.push('')
    lines.push('## 决策记录')
    if (decisions.length === 0) lines.push('_暂无决策记录_')
    for (const decision of decisions) {
      lines.push(`- ${decision.created_at} · ${decision.actor} · ${decision.decision}（置信度 ${decision.confidence}）`)
      if (decision.rationale) lines.push(`  - 理由：${decision.rationale}`)
      if (decision.evidence) lines.push(`  - 证据：${decision.evidence}`)
    }
    lines.push('')
    lines.push('## 任务与处置')
    if (tasks.length === 0) lines.push('_暂无任务_')
    for (const task of tasks) {
      lines.push(`- [${task.priority}/${task.status}/${task.risk_level || 'low'}] ${task.title} · ${task.role}${task.assignee ? ' · ' + task.assignee : ''}${task.approved_by ? ' · 审批 ' + task.approved_by : ''}`)
      if (task.result) lines.push(`  - 结果：${task.result}`)
      if (task.note) lines.push(`  - 备注：${task.note}`)
    }
    lines.push('')
    lines.push('## 时间线（最近 30 条）')
    if (timeline.length === 0) lines.push('_暂无记录_')
    for (const item of timeline) {
      lines.push(`- ${item.at} · ${item.actor} · ${item.action} · ${item.target}${item.detail ? ' · ' + item.detail : ''}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('_本报告只包含已落库的事实；未落库的结论不写入报告。_')
    return lines.join('\n')
  }
}

/** Cordis 插件名。 */
export const name = 'blue-store'

/** 数据层不依赖其它服务即可激活。 */
export const inject = []

/** 解析数据根目录：显式配置 > BLUE_HOME > $DSH_HOME/blue。 */
function resolveRoot(config) {
  if (config && typeof config.root === 'string' && config.root.length > 0) return config.root
  if (process.env.BLUE_HOME) return process.env.BLUE_HOME
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'blue')
}

/**
 * 把 {@link BlueStore} 发布为进程级服务 `ctx.blueTeam`。
 *
 * @param ctx - 插件上下文。
 * @param config - `{ root?: string }`。
 */
export function apply(ctx, config = {}) {
  const root = resolveRoot(config)
  const store = new BlueStore(root)
  ctx.effect(() => () => store.close())
  ctx.provide('blueTeam', store)
  ctx.logger?.info?.('blue-team-store: 事实库就绪（%s）', join(root, 'blue.db'))
}

export default { name, inject, apply }
