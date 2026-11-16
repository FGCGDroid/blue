#!/usr/bin/env node
/**
 * 1.5.3 → 2.0.0-beta.31 → 回滚 1.5.3 演练。
 * 使用临时目录，不触碰真实事实库。
 */
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BlueStore as OldStore } from '../.tmp/release-1.5.2/lib/store.js'
import { BlueStore as NewStore } from '../lib/store.js'

const root = mkdtempSync(join(tmpdir(), 'blue-rollback-'))
const backup = join(root, 'pre-2.0.db')
const old = new OldStore(root)
const engagement = old.openEngagement('rollback-drill', ['127.0.0.1'])
old.addAsset(engagement.id, { name: 'legacy-web', address: '127.0.0.1', kind: 'web', criticality: 'high' })
old.addTimeline(engagement.id, { actor: 'drill', action: 'legacy_note', target: 'before-upgrade', detail: '1.5.3' })
old.close()
copyFileSync(join(root, 'blue.db'), backup)

const next = new NewStore(root)
next.addAsset(engagement.id, { name: 'beta-web', address: '127.0.0.1', kind: 'web', criticality: 'critical' })
next.addTimeline(engagement.id, { actor: 'drill', action: 'beta_note', target: 'after-upgrade', detail: 'beta.31' })
const migrated = {
  assets: next.queryAssets(engagement.id, { limit: 100 }).length,
  timeline: next.verifyTimeline(engagement.id),
}
next.close()

copyFileSync(backup, join(root, 'blue.db'))
for (const suffix of ['-wal', '-shm']) rmSync(join(root, 'blue.db' + suffix), { force: true })
const rolled = new OldStore(root)
const restoredTimeline = rolled.listTimeline(engagement.id, 100)
const restored = {
  assets: rolled.queryAssets(engagement.id, { limit: 100 }).length,
  timeline: { ok: restoredTimeline.length >= 2, checked: restoredTimeline.length },
  engagement: rolled.getEngagement(engagement.id)?.name,
}
rolled.close()
rmSync(root, { recursive: true, force: true })

const ok = migrated.timeline.ok && restored.timeline.ok && restored.assets === 1 && restored.engagement === 'rollback-drill'
console.log(JSON.stringify({ ok, migrated, restored }, null, 2))
if (!ok) process.exit(1)
