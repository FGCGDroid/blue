import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BlueStore } from '../lib/store.js'

const root = mkdtempSync(join(tmpdir(), 'blue-migration-'))
const dbPath = join(root, 'blue.db')
const old = new DatabaseSync(dbPath)
old.exec(`CREATE TABLE decoy_hits (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  decoy_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'high',
  alert_id TEXT,
  at TEXT NOT NULL
)`)
old.exec(`CREATE TABLE timeline (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL,
  at TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  action TEXT NOT NULL DEFAULT 'note',
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
)`)
old.exec(`INSERT INTO timeline (id, engagement_id, at, actor, action, target, detail)
  VALUES ('TL-OLD', 'ENG-OLD', '2026-11-13T00:00:00.000Z', 'legacy', 'note', 'old', 'migration')`)
old.close()

const store = new BlueStore(root)
const columns = store.sql('PRAGMA table_info(decoy_hits)').all().map((column) => column.name)
if (!columns.includes('event_key')) throw new Error('旧库迁移没有补 event_key')
const timeline = store.verifyTimeline('ENG-OLD')
if (!timeline.ok || timeline.checked !== 1) throw new Error('旧时间线没有补哈希链：' + JSON.stringify(timeline))
store.close()
rmSync(root, { recursive: true, force: true })
console.log('✓ 旧库迁移：decoy_hits.event_key')
