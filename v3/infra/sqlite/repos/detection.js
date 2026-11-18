/** 检测规则仓储（M4.3）。 */
import { createHash } from 'node:crypto'
import { BlueError } from '../../../domain/shared/errors.js'
import { asText, parseJson } from './shared.js'

function ruleId(engagementId, key) {
  return `RUL-${createHash('sha256').update(`${engagementId}|${key}`).digest('hex').slice(0, 16).toUpperCase()}`
}

export class DetectionRepo {
  constructor(db, timeline = null) {
    this.db = db
    this.timeline = timeline
  }

  upsert(engagementId, input = {}) {
    const key = asText(input.rule_key).trim()
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(key)) throw new BlueError('RULE_KEY', 'rule_key 只能是 1-64 位字母数字._-')
    const title = asText(input.title).trim()
    if (title === '') throw new BlueError('RULE_TITLE', 'title 不能为空')
    const selection = input.selection
    if (selection === null || typeof selection !== 'object' || Array.isArray(selection)) {
      throw new BlueError('RULE_SELECTION', 'selection 必须是对象')
    }
    const condition = input.condition === 'any' ? 'any' : 'all'
    const severity = ['critical', 'high', 'medium', 'low', 'info'].includes(asText(input.severity))
      ? asText(input.severity) : 'medium'
    const tags = Array.isArray(input.tags) ? input.tags.map((x) => asText(x)).filter(Boolean) : []
    const enabled = input.enabled === false ? 0 : 1
    const id = ruleId(engagementId, key)
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO detection_rules
      (id, engagement_id, rule_key, title, severity, selection, condition, tags, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, rule_key) DO UPDATE SET
        title = excluded.title, severity = excluded.severity, selection = excluded.selection,
        condition = excluded.condition, tags = excluded.tags, enabled = excluded.enabled, updated_at = excluded.updated_at`)
      .run(id, engagementId, key, title, severity, JSON.stringify(selection), condition, JSON.stringify(tags), enabled, at, at)
    if (this.timeline !== null) {
      this.timeline.append(engagementId, {
        actor: 'commander', action: 'detection_rule_upsert', target: key,
        detail: `condition=${condition} severity=${severity}`,
      })
    }
    return this.getByKey(engagementId, key)
  }

  getByKey(engagementId, key) {
    const row = this.db.sql('SELECT * FROM detection_rules WHERE engagement_id = ? AND rule_key = ?')
      .get(engagementId, asText(key).trim())
    return row === undefined ? null : this.toRule(row)
  }

  list(engagementId) {
    return this.db.sql('SELECT * FROM detection_rules WHERE engagement_id = ? ORDER BY rule_key')
      .all(engagementId).map((row) => this.toRule(row))
  }

  toRule(row) {
    return {
      id: row.id,
      rule_key: row.rule_key,
      title: row.title,
      severity: row.severity,
      selection: parseJson(row.selection, {}),
      condition: row.condition,
      tags: parseJson(row.tags, []),
      enabled: Boolean(row.enabled),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }
}
