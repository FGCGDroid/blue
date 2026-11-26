#!/usr/bin/env node
/**
 * 3.0 M2 迁移回滚测试。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStore } from '../lib/store.js'
import { BlueStoreV3 } from '../v3/store.js'
import { latestBackup, rollback } from './rollback-v3.mjs'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-rollback-'))
let oldStore
let v3Store
let reopened

try {
  oldStore = new BlueStore(root)
  const engagement = oldStore.openEngagement('回滚样本', ['https://example.test'], 'synthetic')
  const task = oldStore.createTask(engagement.id, { role: 'monitor', title: '迁移前任务' })
  const taskId = task.id
  oldStore.close()
  oldStore = null

  v3Store = new BlueStoreV3(root)
  assert.equal(v3Store.schemaVersion, '3.0')
  const backup = v3Store.lastBackup
  assert.ok(backup, '迁移前应有备份')
  v3Store.close()
  v3Store = null

  assert.equal(latestBackup(root), backup)
  const result = rollback(root, backup)
  assert.equal(result.backup, backup)

  reopened = new BlueStore(root)
  const restored = reopened.getTask(taskId)
  assert.ok(restored, '回滚后旧任务应存在')
  assert.equal(restored.title, '迁移前任务')

  console.log('✓ v3 迁移回滚通过：备份恢复 + 旧库可读')
} finally {
  if (oldStore) oldStore.close()
  if (v3Store) v3Store.close()
  if (reopened) reopened.close()
  rmSync(root, { recursive: true, force: true })
}
