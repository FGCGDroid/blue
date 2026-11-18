/** 决策仓储（M4.2）。只记录，不执行。 */
import { BlueError } from '../../../domain/shared/errors.js'
import { asText, newId } from './shared.js'

export class DecisionsRepo {
  constructor(db, timeline = null) {
    this.db = db
    this.timeline = timeline
  }

  add(engagementId, input = {}) {
    const decision = asText(input.decision).trim()
    if (decision === '') throw new BlueError('DECISION_INPUT', 'decision 不能为空')
    const id = newId('DEC')
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO decisions
      (id, engagement_id, incident_id, task_id, alert_id, actor, decision, rationale, confidence, evidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id, engagementId, input.incident_id ?? null, input.task_id ?? null, input.alert_id ?? null,
        asText(input.actor, 'commander'), decision, asText(input.rationale),
        asText(input.confidence, 'medium'), asText(input.evidence), at,
      )
    if (this.timeline !== null) {
      this.timeline.append(engagementId, {
        actor: asText(input.actor, 'commander'),
        action: 'decision_add',
        target: decision.slice(0, 80),
        detail: `confidence=${asText(input.confidence, 'medium')}`,
      })
    }
    return this.get(id)
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM decisions WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  list(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    for (const field of ['incident_id', 'task_id', 'alert_id', 'confidence']) {
      if (typeof filters[field] === 'string' && filters[field] !== '') {
        clauses.push(`${field} = ?`)
        params.push(filters[field])
      }
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.db.sql(`SELECT * FROM decisions WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit)
  }
}
