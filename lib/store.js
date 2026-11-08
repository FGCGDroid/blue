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
import { randomUUID, createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

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
  status TEXT NOT NULL DEFAULT 'open',
  assignee TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  raw TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (engagement_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_alerts_engagement ON alerts (engagement_id, status, severity);

CREATE TABLE IF NOT EXISTS iocs (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ip',
  value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
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
  assignee TEXT NOT NULL DEFAULT '',
  asset_id TEXT,
  alert_id TEXT,
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
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_timeline_engagement ON timeline (engagement_id, at);
`

const PRIORITIES = ['P0', 'P1', 'P2', 'P3']
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const RISK_LEVELS = ['low', 'medium', 'high']
const TASK_STATUSES = ['queued', 'pending_approval', 'dispatched', 'running', 'done', 'blocked', 'cancelled']

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
    const columns = new Set(this.db.prepare('PRAGMA table_info(tasks)').all().map((row) => row.name))
    const additions = [
      ['risk_level', "TEXT NOT NULL DEFAULT 'low'"],
      ['requires_approval', 'INTEGER NOT NULL DEFAULT 0'],
      ['approved_by', 'TEXT'],
      ['approved_at', 'TEXT'],
      ['approval_note', 'TEXT'],
    ]
    for (const [name, definition] of additions) {
      if (!columns.has(name)) this.db.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`)
    }
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
      (id, engagement_id, asset_id, title, severity, category, status, cve, evidence, recommendation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, input.asset_id ?? null, title,
        clampSeverity(asText(input.severity)), asText(input.category, 'other'),
        asText(input.status, 'open'), asText(input.cve), asText(input.evidence),
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
    this.sql(`UPDATE findings SET status = ?, severity = ?, cve = ?, evidence = ?, recommendation = ?, updated_at = ?
      WHERE id = ?`)
      .run(
        status,
        severity,
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
    for (const field of ['status', 'severity', 'category']) {
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
    this.sql(`INSERT INTO alerts
      (id, engagement_id, fingerprint, external_id, title, severity, source, status, assignee, note, raw, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, fingerprint) DO UPDATE SET
        severity = CASE WHEN ? <> '' THEN ? ELSE alerts.severity END,
        note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE alerts.note END,
        raw = CASE WHEN excluded.raw <> '' THEN excluded.raw ELSE alerts.raw END,
        updated_at = excluded.updated_at`)
      .run(
        id, engagementId, fingerprint, asText(input.external_id), title,
        severity, asText(input.source), asText(input.status, 'open'),
        asText(input.assignee), asText(input.note), asText(input.raw), at, at,
        rawSeverity, severity,
      )
    const alert = this.sql('SELECT * FROM alerts WHERE engagement_id = ? AND fingerprint = ?').get(engagementId, fingerprint)
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
    for (const field of ['status', 'severity', 'source']) {
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
    this.sql('UPDATE alerts SET status = ?, severity = ?, assignee = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(status, severity, assignee, note, now(), id)
    this.addTimeline(current.engagement_id, {
      actor: asText(patch.actor, 'monitor'),
      action: 'alert_triage',
      target: current.title,
      detail: `status=${status} severity=${severity}${assignee ? ' assignee=' + assignee : ''}`,
    })
    return this.sql('SELECT * FROM alerts WHERE id = ?').get(id)
  }

  /* ── iocs ───────────────────────────────────────────────────────────────── */

  addIoc(engagementId, input = {}) {
    const value = asText(input.value).trim()
    if (value === '') throw new Error('IOC 值不能为空')
    const type = asText(input.type, 'ip').trim().toLowerCase() || 'ip'
    const confidence = asText(input.confidence).trim()
    const id = newId('IOC')
    const at = now()
    this.sql(`INSERT INTO iocs (id, engagement_id, type, value, confidence, source, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, type, value) DO UPDATE SET
        confidence = CASE WHEN ? <> '' THEN ? ELSE iocs.confidence END,
        source = CASE WHEN excluded.source <> '' THEN excluded.source ELSE iocs.source END,
        note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE iocs.note END`)
      .run(id, engagementId, type, value, confidence || 'medium', asText(input.source), asText(input.note), at, confidence, confidence)
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
    const status = riskLevel === 'high' ? 'pending_approval' : asText(input.status, 'queued')
    this.sql(`INSERT INTO tasks
      (id, engagement_id, role, title, brief, priority, status, risk_level, requires_approval,
       assignee, asset_id, alert_id, acceptance, result, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, asText(input.role, 'monitor'), title, asText(input.brief),
        clampPriority(asText(input.priority)), status, riskLevel, requiresApproval,
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
    if (current.status === 'pending_approval' && status !== 'pending_approval' && status !== 'cancelled') {
      throw new Error('待审批任务不能直接变更状态；请先调用 blue_task_approve')
    }
    if (status === 'dispatched' && current.risk_level === 'high' && !current.approved_at) {
      throw new Error('高风险任务未经审批，禁止派发')
    }
    const nowAt = now()
    const dispatchedAt = status === 'dispatched' && current.dispatched_at === null ? nowAt : current.dispatched_at
    const completedAt = (status === 'done' || status === 'blocked' || status === 'cancelled')
      ? (current.completed_at ?? nowAt)
      : null
    this.sql(`UPDATE tasks SET role = ?, priority = ?, status = ?, assignee = ?, result = ?, note = ?,
      dispatched_at = ?, completed_at = ?, updated_at = ? WHERE id = ?`)
      .run(
        asText(patch.role, current.role),
        clampPriority(asText(patch.priority, current.priority)),
        status,
        asText(patch.assignee, current.assignee),
        asText(patch.result, current.result),
        asText(patch.note, current.note),
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
      if (current.status !== 'pending_approval') throw new Error('任务不在待审批状态：' + id)
      if (current.risk_level !== 'high') throw new Error('只有高风险任务需要审批：' + id)
      const at = now()
      const note = asText(options.note, 'human approved')
      this.sql(`UPDATE tasks SET status = 'queued', approved_by = ?, approved_at = ?, approval_note = ?, updated_at = ?
        WHERE id = ? AND status = 'pending_approval'`)
        .run(approvedBy, at, note, at, id)
      this.addTimeline(current.engagement_id, {
        actor: approvedBy,
        action: 'approval',
        target: current.title,
        detail: `task_id=${current.id} risk=${current.risk_level} decision=approved note=${note}`,
      })
      return this.getTask(id)
    })
  }

  /* ── timeline ───────────────────────────────────────────────────────────── */

  addTimeline(engagementId, input = {}) {
    const id = newId('TL')
    this.sql(`INSERT INTO timeline (id, engagement_id, at, actor, action, target, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, asText(input.at, now()), asText(input.actor, 'system'),
        asText(input.action, 'note'), asText(input.target), asText(input.detail),
      )
    return id
  }

  listTimeline(engagementId, limit = 200) {
    const safe = Math.min(Math.max(Number(limit) || 200, 1), 2000)
    return this.sql('SELECT * FROM timeline WHERE engagement_id = ? ORDER BY at DESC LIMIT ?')
      .all(engagementId, safe)
  }

  /* ── stats / report ─────────────────────────────────────────────────────── */

  count(sql, ...params) {
    const row = this.sql(sql).get(...params)
    return row === undefined ? 0 : Number(row.n) || 0
  }

  stats(engagementId) {
    return {
      assets: this.count('SELECT COUNT(*) AS n FROM assets WHERE engagement_id = ?', engagementId),
      assets_critical: this.count(
        "SELECT COUNT(*) AS n FROM assets WHERE engagement_id = ? AND criticality IN ('critical','high')",
        engagementId,
      ),
      alerts_open: this.count("SELECT COUNT(*) AS n FROM alerts WHERE engagement_id = ? AND status IN ('open','investigating')", engagementId),
      alerts_critical: this.count("SELECT COUNT(*) AS n FROM alerts WHERE engagement_id = ? AND severity IN ('critical','high') AND status IN ('open','investigating')", engagementId),
      findings_open: this.count("SELECT COUNT(*) AS n FROM findings WHERE engagement_id = ? AND status = 'open'", engagementId),
      findings_critical: this.count("SELECT COUNT(*) AS n FROM findings WHERE engagement_id = ? AND severity IN ('critical','high') AND status = 'open'", engagementId),
      iocs: this.count('SELECT COUNT(*) AS n FROM iocs WHERE engagement_id = ?', engagementId),
      tasks_queued: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'queued'", engagementId),
      tasks_pending_approval: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'pending_approval'", engagementId),
      tasks_high_risk: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND risk_level = 'high' AND status NOT IN ('done','blocked','cancelled')", engagementId),
      tasks_active: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status IN ('dispatched','running')", engagementId),
      tasks_done: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'done'", engagementId),
      tasks_blocked: this.count("SELECT COUNT(*) AS n FROM tasks WHERE engagement_id = ? AND status = 'blocked'", engagementId),
    }
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
    lines.push(`- 任务：排队 ${stats.tasks_queued} / 待审批 ${stats.tasks_pending_approval} / 进行 ${stats.tasks_active} / 完成 ${stats.tasks_done} / 阻塞 ${stats.tasks_blocked}`)
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
      lines.push(`- [${alert.severity}/${alert.status}] ${alert.title} · 来源 ${alert.source || 'unknown'}${alert.assignee ? ' · 负责人 ' + alert.assignee : ''}`)
      if (alert.note) lines.push(`  - 研判：${alert.note}`)
    }
    lines.push('')
    lines.push('## 脆弱性与发现')
    if (findings.length === 0) lines.push('_暂无发现_')
    for (const finding of findings) {
      lines.push(`- [${finding.severity}/${finding.status}] ${finding.title}（${finding.category}）${finding.cve ? ' · ' + finding.cve : ''}`)
      if (finding.recommendation) lines.push(`  - 建议：${finding.recommendation}`)
    }
    lines.push('')
    lines.push('## IOC')
    if (iocs.length === 0) lines.push('_暂无 IOC_')
    for (const ioc of iocs) {
      lines.push(`- ${ioc.type} \`${ioc.value}\`（置信度 ${ioc.confidence}${ioc.source ? '，来源 ' + ioc.source : ''}）`)
    }
    lines.push('')
    lines.push('## 任务与处置')
    if (tasks.length === 0) lines.push('_暂无任务_')
    for (const task of tasks) {
      lines.push(`- [${task.priority}/${task.status}] ${task.title} · ${task.role}${task.assignee ? ' · ' + task.assignee : ''}`)
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
