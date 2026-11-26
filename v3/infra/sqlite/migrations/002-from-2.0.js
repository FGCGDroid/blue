/**
 * 2.0 -> 3.0 数据迁移（M2）。
 *
 * 只做幂等补列/补索引/补 timeline 哈希，不改表名、不改列语义。
 * 新库也会跑一遍：所有操作都是 IF NOT EXISTS / 缺列才补。
 */
import { timelineHash } from '../../../domain/evidence/hash.js'

function columnsOf(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name))
}

function addColumns(db, table, additions) {
  const columns = columnsOf(db, table)
  for (const [name, definition] of additions) {
    if (!columns.has(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
    }
  }
}

function backfillTimelineHashes(db) {
  const rows = db.prepare('SELECT rowid, * FROM timeline ORDER BY rowid').all()
  if (rows.length === 0) return
  const previous = new Map()
  const update = db.prepare('UPDATE timeline SET prev_hash = ?, hash = ? WHERE rowid = ?')
  for (const row of rows) {
    const prev = previous.get(row.engagement_id) || ''
    if (typeof row.hash !== 'string' || row.hash === '') {
      row.prev_hash = prev || null
      row.hash = timelineHash(row, prev)
      update.run(row.prev_hash, row.hash, row.rowid)
    }
    previous.set(row.engagement_id, row.hash)
  }
}

export function applyFrom20(db) {
  addColumns(db, 'tasks', [
    ['risk_level', "TEXT NOT NULL DEFAULT 'low'"],
    ['requires_approval', 'INTEGER NOT NULL DEFAULT 0'],
    ['approved_by', 'TEXT'],
    ['approved_at', 'TEXT'],
    ['approval_note', 'TEXT'],
    ['scope', "TEXT NOT NULL DEFAULT ''"],
    ['constraints', "TEXT NOT NULL DEFAULT '[]'"],
    ['expected_output', "TEXT NOT NULL DEFAULT '{}'"],
    ['incident_id', 'TEXT'],
  ])

  addColumns(db, 'findings', [
    ['confidence', "TEXT NOT NULL DEFAULT 'medium'"],
    ['source', "TEXT NOT NULL DEFAULT ''"],
    ['task_id', 'TEXT'],
    ['incident_id', 'TEXT'],
    ['artifact_id', 'TEXT'],
    ['fact_level', "TEXT NOT NULL DEFAULT 'observation'"],
  ])

  addColumns(db, 'alerts', [
    ['confidence', "TEXT NOT NULL DEFAULT 'medium'"],
    ['task_id', 'TEXT'],
    ['incident_id', 'TEXT'],
    ['event_time', 'TEXT'],
  ])

  addColumns(db, 'iocs', [
    ['first_seen', "TEXT NOT NULL DEFAULT ''"],
    ['last_seen', "TEXT NOT NULL DEFAULT ''"],
  ])

  addColumns(db, 'decoys', [
    ['expires_at', 'TEXT'],
  ])

  addColumns(db, 'decoy_hits', [
    ['event_key', 'TEXT'],
  ])

  addColumns(db, 'timeline', [
    ['prev_hash', 'TEXT'],
    ['hash', 'TEXT'],
  ])

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_decoy_hits_event ON decoy_hits (engagement_id, event_key) WHERE event_key IS NOT NULL')
  db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_approval ON tasks (engagement_id, status, risk_level)')
  backfillTimelineHashes(db)
  db.exec("UPDATE iocs SET first_seen = COALESCE(NULLIF(first_seen, ''), created_at), last_seen = COALESCE(NULLIF(last_seen, ''), created_at)")
}
