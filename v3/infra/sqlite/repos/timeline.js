/**
 * timeline 仓储（M2）。
 *
 * 追加、读取、验证。哈希算法在 v3/domain/evidence/hash.js。
 */
import { randomUUID } from 'node:crypto'
import { timelineHash } from '../../../domain/evidence/hash.js'
import { nowIso } from '../../../domain/shared/time.js'

function newId() {
  return `TL-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export class TimelineRepo {
  constructor(db) {
    this.db = db
  }

  append(engagementId, input = {}) {
    const id = newId()
    const at = typeof input.at === 'string' && input.at !== '' ? input.at : nowIso()
    const actor = typeof input.actor === 'string' ? input.actor : 'system'
    const action = typeof input.action === 'string' ? input.action : 'note'
    const target = typeof input.target === 'string' ? input.target : ''
    const detail = typeof input.detail === 'string' ? input.detail : ''
    const row = this.db.sql('SELECT hash FROM timeline WHERE engagement_id = ? ORDER BY rowid DESC LIMIT 1')
      .get(engagementId)
    const prevHash = row && typeof row.hash === 'string' ? row.hash : ''
    const hash = timelineHash({ engagement_id: engagementId, at, actor, action, target, detail }, prevHash)
    this.db.sql(`INSERT INTO timeline (id, engagement_id, at, actor, action, target, detail, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, at, actor, action, target, detail, prevHash || null, hash)
    return id
  }

  list(engagementId, limit = 200) {
    const safe = Math.min(Math.max(Number(limit) || 200, 1), 2000)
    return this.db.sql('SELECT * FROM timeline WHERE engagement_id = ? ORDER BY at DESC LIMIT ?')
      .all(engagementId, safe)
  }

  verify(engagementId) {
    const rows = this.db.sql('SELECT rowid, * FROM timeline WHERE engagement_id = ? ORDER BY rowid')
      .all(engagementId)
    let prev = ''
    for (const row of rows) {
      const expected = timelineHash(row, prev)
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
}
