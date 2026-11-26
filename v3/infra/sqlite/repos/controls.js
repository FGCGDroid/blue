/** 防线控制验证仓储（M4.3）。 */
import { asText, newId } from './shared.js'

export class ControlsRepo {
  constructor(db) {
    this.db = db
  }

  upsert(engagementId, input = {}) {
    const key = asText(input.control_key).trim()
    if (key === '') throw new Error('control_key 不能为空')
    const id = newId('CTL')
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO controls
      (id, engagement_id, control_key, name, category, status, evidence, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(engagement_id, control_key) DO UPDATE SET
        name = excluded.name, category = excluded.category, status = excluded.status,
        evidence = excluded.evidence, checked_at = excluded.checked_at`)
      .run(id, engagementId, key, asText(input.name, key), asText(input.category, 'detection'),
        asText(input.status, 'unknown'), asText(input.evidence), at)
    return this.db.sql('SELECT * FROM controls WHERE engagement_id = ? AND control_key = ?').get(engagementId, key)
  }

  list(engagementId) {
    return this.db.sql('SELECT * FROM controls WHERE engagement_id = ? ORDER BY category, control_key')
      .all(engagementId)
  }
}
