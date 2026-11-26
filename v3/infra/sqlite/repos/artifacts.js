/** 证据 artifact 仓储：真实内容 + sha256，finding 只能引用存在的 id。 */
import { createHash, randomUUID } from 'node:crypto'
import { BlueError } from '../../../domain/shared/errors.js'

const MAX_BYTES = 64 * 1024

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export class ArtifactRepo {
  constructor(db) {
    this.db = db
  }

  capture(engagementId, input = {}) {
    const raw = typeof input.content === 'string' ? input.content : JSON.stringify(input.content ?? '')
    const bytes = Buffer.byteLength(raw, 'utf8')
    if (bytes === 0) throw new BlueError('ARTIFACT_EMPTY', 'artifact 内容不能为空')
    if (bytes > MAX_BYTES) throw new BlueError('ARTIFACT_SIZE', 'artifact 超过 64 KiB')
    const sha256 = createHash('sha256').update(raw).digest('hex')
    const id = `ART-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO artifacts (id, engagement_id, kind, source, sha256, bytes, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, asText(input.kind, 'text'), asText(input.source), sha256, bytes, raw, at)
    return this.get(id)
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM artifacts WHERE id = ?').get(asText(id))
    if (row === undefined) return null
    return {
      id: row.id,
      kind: row.kind,
      source: row.source,
      sha256: row.sha256,
      bytes: Number(row.bytes),
      payload: row.payload,
      created_at: row.created_at,
    }
  }

  verify(id) {
    const artifact = this.get(id)
    if (artifact === null) return { ok: false, reason: 'not_found' }
    const actual = createHash('sha256').update(artifact.payload).digest('hex')
    return { ok: actual === artifact.sha256, expected: artifact.sha256, actual, artifact }
  }

  list(engagementId, limit = 100) {
    return this.db.sql('SELECT * FROM artifacts WHERE engagement_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(engagementId, Math.min(Math.max(Number(limit) || 100, 1), 500))
      .map((row) => ({ id: row.id, kind: row.kind, source: row.source, sha256: row.sha256, bytes: Number(row.bytes), created_at: row.created_at }))
  }
}
