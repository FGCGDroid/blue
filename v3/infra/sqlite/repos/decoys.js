/**
 * 诱饵仓储（M2）。
 *
 * 只登记与状态维护；不部署真实文件/URL，也不执行任何命令。
 */
import { randomUUID } from 'node:crypto'
import { BlueError } from '../../../domain/shared/errors.js'
import {
  DECOY_KINDS, DECOY_STATUSES, canTransitionDecoy,
} from '../../../domain/decoy/states.js'
import { asText, newId } from './shared.js'

export class DecoysRepo {
  constructor(db, timeline, facts) {
    this.db = db
    this.timeline = timeline
    this.facts = facts
  }

  create(engagementId, input = {}) {
    const kind = asText(input.kind, 'canary_file').trim().toLowerCase()
    if (!DECOY_KINDS.includes(kind)) throw new BlueError('DECOY_KIND', `不支持的诱饵类型：${kind}`)
    const name = asText(input.name).trim()
    if (name === '') throw new BlueError('DECOY_NAME', '诱饵名称不能为空')
    const target = asText(input.target).trim()
    if (target === '') throw new BlueError('DECOY_TARGET', '诱饵目标不能为空')
    const status = DECOY_STATUSES.includes(asText(input.status)) ? asText(input.status) : 'planned'
    const token = asText(input.token).trim() || `DECOY-${randomUUID().replace(/-/g, '')}`
    const ttlHours = Math.min(Math.max(Number(input.ttl_hours) || 24, 1), 168)
    const expiresAt = asText(input.expires_at).trim()
      || new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
    const id = newId('DEC')
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO decoys
      (id, engagement_id, kind, name, target, token, status, note, hit_count, last_hit_at, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)`)
      .run(id, engagementId, kind, name, target, token, status, asText(input.note), expiresAt, at, at)
    this.timeline.append(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'decoy_create',
      target: name,
      detail: `kind=${kind} target=${target} token=${token.slice(0, 12)}… status=${status}`,
    })
    return this.get(id)
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM decoys WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  findByName(engagementId, name) {
    const row = this.db.sql('SELECT * FROM decoys WHERE engagement_id = ? AND name = ?')
      .get(engagementId, asText(name).trim())
    return row === undefined ? null : row
  }

  list(engagementId, filters = {}) {
    this.expire(engagementId)
    this.reconcile(engagementId)
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'kind']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.db.sql(`SELECT * FROM decoys WHERE ${clauses.join(' AND ')}
      ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, created_at DESC LIMIT ?`)
      .all(...params, limit)
  }

  update(id, patch = {}) {
    const current = this.get(id)
    if (current === null) throw new BlueError('DECOY_NOT_FOUND', `诱饵不存在：${id}`)
    const status = asText(patch.status, current.status)
    if (!DECOY_STATUSES.includes(status)) throw new BlueError('DECOY_STATUS', `诱饵状态非法：${status}`)
    if (status !== current.status && !canTransitionDecoy(current.status, status)) {
      throw new BlueError('DECOY_TRANSITION', `诱饵状态不能从 ${current.status} 直接改为 ${status}`)
    }
    const note = asText(patch.note, current.note)
    this.db.sql('UPDATE decoys SET status = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(status, note, new Date().toISOString(), id)
    this.timeline.append(current.engagement_id, {
      actor: asText(patch.actor, 'commander'),
      action: 'decoy_update',
      target: current.name,
      detail: `status=${status}`,
    })
    return this.get(id)
  }

  addHit(id, input = {}) {
    const current = this.get(id)
    if (current === null) throw new BlueError('DECOY_NOT_FOUND', `诱饵不存在：${id}`)
    const eventKey = asText(input.event_key).trim()
    if (eventKey !== '') {
      const existing = this.db.sql('SELECT * FROM decoy_hits WHERE engagement_id = ? AND event_key = ?')
        .get(current.engagement_id, eventKey)
      if (existing !== undefined) return { duplicate: true, decoy: current, hit: existing }
    }
    const at = new Date().toISOString()
    if (current.status === 'planned') {
      this.db.sql("UPDATE decoys SET status = 'active', updated_at = ? WHERE id = ?").run(at, id)
      this.timeline.append(current.engagement_id, {
        actor: asText(input.actor, 'monitor'),
        action: 'decoy_auto_active',
        target: current.name,
        detail: `decoy=${current.id} 首次命中，planned → active`,
      })
    }
    this.db.sql('UPDATE decoys SET hit_count = hit_count + 1, last_hit_at = ?, updated_at = ? WHERE id = ?')
      .run(at, at, id)
    const alert = this.facts.addAlert(current.engagement_id, {
      title: `诱饵命中：${current.name}`,
      severity: asText(input.severity, 'high'),
      source: 'deception',
      confidence: 'high',
      note: `decoy=${current.id} kind=${current.kind} target=${current.target}`,
      raw: asText(input.evidence),
      actor: asText(input.actor, 'monitor'),
    })
    this.timeline.append(current.engagement_id, {
      actor: asText(input.actor, 'monitor'),
      action: 'decoy_hit',
      target: current.name,
      detail: `decoy=${current.id} source=${asText(input.source)} alert=${alert.id}`,
    })
    const hitId = newId('DCH')
    this.db.sql(`INSERT INTO decoy_hits (id, engagement_id, decoy_id, source, evidence, severity, alert_id, at, event_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(hitId, current.engagement_id, current.id, asText(input.source), asText(input.evidence), asText(input.severity, 'high'), alert.id, at, eventKey || null)
    return { decoy: this.get(id), alert, hit_id: hitId }
  }

  listHits(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.decoy === 'string' && filters.decoy !== '') {
      clauses.push('decoy_id = ?')
      params.push(filters.decoy)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.db.sql(`SELECT * FROM decoy_hits WHERE ${clauses.join(' AND ')} ORDER BY at DESC LIMIT ?`)
      .all(...params, limit)
  }

  /** 把一批事件记到对应诱饵上；文件型同步在 app 层做。 */
  sync(engagementId, events = []) {
    const results = []
    for (const event of events) {
      const decoy = event.decoy_id
        ? this.get(String(event.decoy_id))
        : this.findByName(engagementId, event.decoy || event.name)
      if (decoy === null || decoy.engagement_id !== engagementId) {
        results.push({ ok: false, event, error: 'decoy not found' })
        continue
      }
      results.push({ ok: true, ...this.addHit(decoy.id, event) })
    }
    return results
  }

  expire(engagementId) {
    const at = new Date().toISOString()
    const expired = this.db.sql(`SELECT id, name FROM decoys
      WHERE engagement_id = ? AND status <> 'retired'
        AND expires_at IS NOT NULL AND expires_at <= ?`).all(engagementId, at)
    for (const decoy of expired) {
      this.db.sql("UPDATE decoys SET status = 'retired', updated_at = ? WHERE id = ?").run(at, decoy.id)
      this.timeline.append(engagementId, {
        actor: 'system',
        action: 'decoy_expire',
        target: decoy.name,
        detail: `decoy=${decoy.id} 自动取消（到期）`,
      })
    }
    return expired.length
  }

  reconcile(engagementId) {
    const at = new Date().toISOString()
    const rows = this.db.sql("SELECT id, name FROM decoys WHERE engagement_id = ? AND status = 'planned' AND hit_count > 0")
      .all(engagementId)
    for (const decoy of rows) {
      this.db.sql("UPDATE decoys SET status = 'active', updated_at = ? WHERE id = ?").run(at, decoy.id)
      this.timeline.append(engagementId, {
        actor: 'system',
        action: 'decoy_auto_active',
        target: decoy.name,
        detail: `decoy=${decoy.id} 已有命中，planned → active`,
      })
    }
    return rows.length
  }
}
