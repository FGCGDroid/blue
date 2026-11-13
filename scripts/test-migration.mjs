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
old.close()

const store = new BlueStore(root)
const columns = store.sql('PRAGMA table_info(decoy_hits)').all().map((column) => column.name)
if (!columns.includes('event_key')) throw new Error('旧库迁移没有补 event_key')
store.close()
rmSync(root, { recursive: true, force: true })
console.log('✓ 旧库迁移：decoy_hits.event_key')
