/**
 * 案件仓储（M2）。
 *
 * 2.0 的文件叫 incident，3.0 保持同一张表和状态机。
 */
import { BlueError } from '../../../domain/shared/errors.js'
import { INCIDENT_STATUSES, canTransitionIncident } from '../../../domain/incident/states.js'
import { asText, clampSeverity, newId } from './shared.js'

export class IncidentsRepo {
  constructor(db, timeline) {
    this.db = db
    this.timeline = timeline
  }

  open(engagementId, input = {}) {
    const title = asText(input.title).trim()
    if (title === '') throw new BlueError('INCIDENT_INPUT', '案件标题不能为空')
    const severity = clampSeverity(asText(input.severity, 'medium'))
    const status = INCIDENT_STATUSES.includes(asText(input.status)) ? asText(input.status) : 'open'
    const id = newId('INC')
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO incidents (id, engagement_id, title, severity, status, owner, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, title, severity, status, asText(input.owner), asText(input.summary), at, at)
    this.timeline.append(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'incident_open',
      target: title,
      detail: `severity=${severity} status=${status}`,
    })
    return this.get(id)
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM incidents WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  list(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['status', 'severity', 'owner']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500)
    return this.db.sql(`SELECT * FROM incidents WHERE ${clauses.join(' AND ')}
      ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 WHEN 'contained' THEN 2 ELSE 3 END,
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC LIMIT ?`).all(...params, limit)
  }

  update(id, patch = {}) {
    const current = this.get(id)
    if (current === null) throw new BlueError('INCIDENT_NOT_FOUND', `案件不存在：${id}`)
    const status = asText(patch.status, current.status)
    if (!INCIDENT_STATUSES.includes(status)) {
      throw new BlueError('INCIDENT_STATUS', `案件状态非法：${status}`)
    }
    if (status !== current.status && !canTransitionIncident(current.status, status)) {
      throw new BlueError('INCIDENT_TRANSITION', `案件状态不能从 ${current.status} 直接改为 ${status}`)
    }
    const severity = clampSeverity(asText(patch.severity, current.severity))
    const owner = asText(patch.owner, current.owner)
    const summary = asText(patch.summary, current.summary)
    this.db.sql('UPDATE incidents SET severity = ?, status = ?, owner = ?, summary = ?, updated_at = ? WHERE id = ?')
      .run(severity, status, owner, summary, new Date().toISOString(), id)
    this.timeline.append(current.engagement_id, {
      actor: asText(patch.actor, 'commander'),
      action: 'incident_update',
      target: current.title,
      detail: `severity=${severity} status=${status}${owner ? ' owner=' + owner : ''}`,
    })
    return this.get(id)
  }

  attach(id, input = {}) {
    const incident = this.get(id)
    if (incident === null) throw new BlueError('INCIDENT_NOT_FOUND', `案件不存在：${id}`)
    const targets = [
      ['alerts', input.alert_id],
      ['findings', input.finding_id],
      ['tasks', input.task_id],
    ].filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    if (targets.length === 0) {
      throw new BlueError('INCIDENT_ATTACH', '至少给一个 alert_id/finding_id/task_id')
    }

    const validated = []
    for (const [table, value] of targets) {
      const row = this.db.sql(`SELECT id, engagement_id FROM ${table} WHERE id = ?`).get(value.trim())
      if (row === undefined || row.engagement_id !== incident.engagement_id) {
        throw new BlueError('INCIDENT_ATTACH', `${table} 记录不存在或不属于同一防守目标：${value}`)
      }
      validated.push({ table, id: row.id })
    }

    const at = new Date().toISOString()
    for (const row of validated) {
      if (row.table === 'tasks') {
        this.db.sql('UPDATE tasks SET incident_id = ?, updated_at = ? WHERE id = ?').run(id, at, row.id)
      } else {
        this.db.sql(`UPDATE ${row.table} SET incident_id = ? WHERE id = ?`).run(id, row.id)
      }
    }
    this.db.sql('UPDATE incidents SET updated_at = ? WHERE id = ?').run(at, id)
    this.timeline.append(incident.engagement_id, {
      actor: asText(input.actor, 'commander'),
      action: 'incident_attach',
      target: incident.title,
      detail: validated.map((item) => `${item.table}:${item.id}`).join(' '),
    })
    return { incident: this.get(id), attached: validated }
  }
}
