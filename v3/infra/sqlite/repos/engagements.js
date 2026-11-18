/**
 * Engagement 仓储（M4.0）。
 *
 * 只负责本场防守目标的登记/复用/统计；不写工具层逻辑。
 */
import { BlueError } from '../../../domain/shared/errors.js'
import { asText, newId, parseJson } from './shared.js'

const ACTIVE = 'active'

export class EngagementsRepo {
  constructor(db, timeline = null) {
    this.db = db
    this.timeline = timeline
  }

  open(name, scope = [], note = '') {
    const normalized = asText(name).trim()
    if (normalized === '') throw new BlueError('ENGAGEMENT_INPUT', '防守目标名称不能为空')
    const existing = this.db.sql(
      "SELECT * FROM engagements WHERE name = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    ).get(normalized)
    if (existing !== undefined) return this.toEngagement(existing)

    const id = newId('ENG')
    const at = new Date().toISOString()
    const scopeList = Array.isArray(scope)
      ? scope.map((item) => asText(item).trim()).filter((item) => item !== '')
      : []
    this.db.sql(`INSERT INTO engagements (id, name, scope, note, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, normalized, JSON.stringify(scopeList), asText(note).trim(), ACTIVE, at, at)
    if (this.timeline !== null) {
      this.timeline.append(id, {
        actor: 'commander',
        action: 'engagement_open',
        target: normalized,
        detail: `scope=${scopeList.length}`,
      })
    }
    return this.get(id)
  }

  get(idOrName) {
    const key = asText(idOrName).trim()
    if (key === '') return null
    const row = this.db.sql('SELECT * FROM engagements WHERE id = ?').get(key)
      ?? this.db.sql('SELECT * FROM engagements WHERE name = ? ORDER BY created_at DESC LIMIT 1').get(key)
    return row === undefined ? null : this.toEngagement(row)
  }

  list() {
    return this.db.sql('SELECT * FROM engagements ORDER BY created_at DESC').all()
      .map((row) => this.toEngagement(row))
  }

  stats(engagementId) {
    const count = (table, where = '') => {
      const row = this.db.sql(`SELECT COUNT(*) AS n FROM ${table} WHERE engagement_id = ?${where}`).get(engagementId)
      return Number(row?.n ?? 0)
    }
    return {
      assets: count('assets'),
      alerts: count('alerts'),
      alerts_open: count('alerts', " AND status IN ('open','investigating')"),
      findings: count('findings'),
      iocs: count('iocs'),
      tasks: count('tasks'),
      incidents: count('incidents'),
      decoys: count('decoys'),
      responses: count('response_actions'),
    }
  }

  toEngagement(row) {
    return {
      id: row.id,
      name: row.name,
      scope: parseJson(row.scope, []),
      note: row.note,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }
}
