/**
 * 资产/告警/发现/IOC 仓储（M2）。
 *
 * 行为按 2.0 lib/store.js 搬，保留去重、排序和 timeline 记录。
 */
import { BlueError } from '../../../domain/shared/errors.js'
import {
  asText, clampSeverity, fingerprintOf, newId, normalizeIocValue, parseJson,
} from './shared.js'

export class FactsRepo {
  constructor(db, timeline) {
    this.db = db
    this.timeline = timeline
  }

  /* ── assets ────────────────────────────────────────────────────────────── */

  addAsset(engagementId, input = {}) {
    const kind = asText(input.kind, 'host').trim() || 'host'
    const address = asText(input.address).trim()
    const name = asText(input.name).trim() || address || '未命名资产'
    if (address === '' && asText(input.name).trim() === '') {
      throw new BlueError('ASSET_INPUT', '资产至少需要 name 或 address')
    }
    const port = Number.isInteger(input.port) ? input.port : null
    const criticality = asText(input.criticality).trim()
    const dedupe = fingerprintOf([kind, address.toLowerCase(), String(port ?? '')])
    const id = newId('AST')
    const at = new Date().toISOString()
    const tags = Array.isArray(input.tags) ? input.tags : []
    this.db.sql(`INSERT INTO assets
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
    const asset = this.db.sql('SELECT * FROM assets WHERE engagement_id = ? AND dedupe = ?').get(engagementId, dedupe)
    this.timeline.append(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'asset_add',
      target: `${name}${address ? ' (' + address + ')' : ''}`,
      detail: `kind=${kind} criticality=${criticality || 'medium'}`,
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
    const rows = this.db.sql(`SELECT * FROM assets WHERE ${clauses.join(' AND ')} ORDER BY
      CASE criticality WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      updated_at DESC LIMIT ?`).all(...params, limit)
    return rows.map((row) => this.toAsset(row))
  }

  getAsset(id) {
    const row = this.db.sql('SELECT * FROM assets WHERE id = ?').get(id)
    return row === undefined ? null : this.toAsset(row)
  }

  toAsset(row) {
    return { ...row, tags: parseJson(row.tags, []) }
  }

  /* ── findings ──────────────────────────────────────────────────────────── */

  addFinding(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new BlueError('FINDING_INPUT', '发现标题不能为空')
    const id = newId('FND')
    const at = new Date().toISOString()
    const severity = clampSeverity(asText(input.severity))
    this.db.sql(`INSERT INTO findings
      (id, engagement_id, asset_id, title, severity, category, status, confidence, source, task_id, cve, evidence, recommendation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, input.asset_id ?? null, title,
        severity, asText(input.category, 'other'),
        asText(input.status, 'open'), asText(input.confidence, 'medium'), asText(input.source),
        input.task_id ?? null, asText(input.cve), asText(input.evidence),
        asText(input.recommendation), at, at,
      )
    this.timeline.append(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'finding_add',
      target: title,
      detail: `severity=${severity} category=${asText(input.category, 'other')}`,
    })
    return this.getFinding(id)
  }

  getFinding(id) {
    const row = this.db.sql('SELECT * FROM findings WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  updateFinding(id, patch = {}) {
    const current = this.getFinding(id)
    if (current === null) throw new BlueError('FINDING_NOT_FOUND', `发现不存在：${id}`)
    const status = asText(patch.status, current.status)
    const severity = clampSeverity(asText(patch.severity, current.severity))
    this.db.sql(`UPDATE findings SET status = ?, severity = ?, confidence = ?, source = ?, task_id = ?,
      cve = ?, evidence = ?, recommendation = ?, updated_at = ? WHERE id = ?`)
      .run(
        status, severity,
        asText(patch.confidence, current.confidence),
        asText(patch.source, current.source),
        patch.task_id === undefined ? current.task_id : patch.task_id,
        asText(patch.cve, current.cve),
        asText(patch.evidence, current.evidence),
        asText(patch.recommendation, current.recommendation),
        new Date().toISOString(), id,
      )
    this.timeline.append(current.engagement_id, {
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
    return this.db.sql(`SELECT * FROM findings WHERE ${clauses.join(' AND ')} ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC LIMIT ?`).all(...params, limit)
  }

  /* ── alerts ────────────────────────────────────────────────────────────── */

  addAlert(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new BlueError('ALERT_INPUT', '告警标题不能为空')
    const fingerprint = asText(input.fingerprint).trim()
      || fingerprintOf([asText(input.source), asText(input.external_id), title, asText(input.raw).slice(0, 2000)])
    const rawSeverity = asText(input.severity).trim()
    const severity = clampSeverity(rawSeverity)
    const id = newId('ALT')
    const at = new Date().toISOString()
    const existing = this.db.sql('SELECT id FROM alerts WHERE engagement_id = ? AND fingerprint = ?')
      .get(engagementId, fingerprint)
    this.db.sql(`INSERT INTO alerts
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
    const alert = this.db.sql('SELECT * FROM alerts WHERE engagement_id = ? AND fingerprint = ?')
      .get(engagementId, fingerprint)
    alert.inserted = existing === undefined
    if (alert.id === id) {
      this.timeline.append(engagementId, {
        actor: asText(input.actor, 'monitor'),
        action: 'alert_ingest',
        target: title,
        detail: `severity=${severity} source=${asText(input.source)}`,
      })
    }
    return alert
  }

  getAlert(id) {
    const row = this.db.sql('SELECT * FROM alerts WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  listAlerts(engagementId, filters = {}) {    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'severity', 'source', 'confidence', 'task_id']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.db.sql(`SELECT * FROM alerts WHERE ${clauses.join(' AND ')} ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC LIMIT ?`).all(...params, limit)
  }

  updateAlert(id, patch = {}) {
    const current = this.db.sql('SELECT * FROM alerts WHERE id = ?').get(id)
    if (current === undefined) throw new BlueError('ALERT_NOT_FOUND', `告警不存在：${id}`)
    const status = asText(patch.status, current.status)
    const severity = clampSeverity(asText(patch.severity, current.severity))
    const assignee = asText(patch.assignee, current.assignee)
    const note = asText(patch.note, current.note)
    const confidence = asText(patch.confidence, current.confidence)
    const taskId = patch.task_id === undefined ? current.task_id : patch.task_id
    this.db.sql('UPDATE alerts SET status = ?, severity = ?, confidence = ?, task_id = ?, assignee = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(status, severity, confidence, taskId, assignee, note, new Date().toISOString(), id)
    this.timeline.append(current.engagement_id, {
      actor: asText(patch.actor, 'monitor'),
      action: 'alert_triage',
      target: current.title,
      detail: `status=${status} severity=${severity}${assignee ? ' assignee=' + assignee : ''}`,
    })
    return this.db.sql('SELECT * FROM alerts WHERE id = ?').get(id)
  }

  /* ── iocs ──────────────────────────────────────────────────────────────── */

  addIoc(engagementId, input = {}) {
    const type = asText(input.type, 'ip').trim().toLowerCase() || 'ip'
    const value = normalizeIocValue(type, asText(input.value))
    if (value === '') throw new BlueError('IOC_INPUT', 'IOC 值不能为空')
    const confidence = asText(input.confidence).trim()
    const id = newId('IOC')
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO iocs (id, engagement_id, type, value, confidence, source, note, first_seen, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, type, value) DO UPDATE SET
        confidence = CASE WHEN ? <> '' THEN ? ELSE iocs.confidence END,
        source = CASE WHEN excluded.source <> '' THEN excluded.source ELSE iocs.source END,
        note = CASE WHEN excluded.note <> '' THEN excluded.note ELSE iocs.note END,
        last_seen = excluded.last_seen`)
      .run(id, engagementId, type, value, confidence || 'medium', asText(input.source), asText(input.note), at, at, at, confidence, confidence)
    return this.getIocByValue(engagementId, type, value)
  }

  getIoc(id) {
    const row = this.db.sql('SELECT * FROM iocs WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  getIocByValue(engagementId, type, value) {
    const row = this.db.sql('SELECT * FROM iocs WHERE engagement_id = ? AND type = ? AND value = ?')
      .get(engagementId, type, value)
    return row === undefined ? null : row
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
    return this.db.sql(`SELECT * FROM iocs WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit)
  }
}
