#!/usr/bin/env node
/**
 * 3.0 M2 数据层测试。
 *
 * 覆盖：
 *   - 新库建 schema，schema_version=3.0
 *   - low 任务 queued，high 任务 pending_approval
 *   - pending 不能直接 dispatched，必须 approve
 *   - timeline 哈希链可验证
 *   - 重开库数据仍在
 *   - 2.0 库可迁移到 3.0，迁移前有备份
 */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStoreV3 } from '../v3/store.js'
import { BlueStore } from '../lib/store.js'

function tempRoot(label) {
  return mkdtempSync(join(tmpdir(), `blue-v3-${label}-`))
}

const roots = []

try {
  const root = tempRoot('db')
  roots.push(root)
  const store = new BlueStoreV3(root)
  try {
    assert.equal(store.schemaVersion, '3.0')

    const low = store.tasks.create('ENG-TEST', {
      role: 'monitor',
      title: '确认日志接入',
    })
    assert.equal(low.status, 'queued')
    assert.equal(low.risk_level, 'low')
    assert.equal(low.requires_approval, 0)

    const high = store.tasks.create('ENG-TEST', {
      role: 'ir',
      title: '隔离主机 10.0.0.5',
      brief: 'synthetic high risk',
      constraints: ['只读', '不自动执行'],
    })
    assert.equal(high.status, 'pending_approval')
    assert.equal(high.risk_level, 'high')
    assert.equal(high.requires_approval, 1)
    assert.deepEqual(JSON.parse(high.constraints), ['只读', '不自动执行'])

    const downgraded = store.tasks.create('ENG-TEST', {
      role: 'ir',
      title: '隔离主机 10.0.0.6',
      brief: 'explicit low must not downgrade',
      risk_level: 'low',
    })
    assert.equal(downgraded.risk_level, 'high')
    assert.equal(downgraded.status, 'pending_approval')

    // 模拟数据库里出现异常的 high + queued：派发前仍必须二次拦截。
    store.db.sql("UPDATE tasks SET status = 'queued' WHERE id = ?").run(downgraded.id)
    assert.throws(
      () => store.tasks.update(downgraded.id, { status: 'dispatched' }, 'tester'),
      (error) => error.code === 'APPROVAL_REQUIRED',
    )

    assert.throws(
      () => store.tasks.update(high.id, { status: 'dispatched' }, 'tester'),
      (error) => error.code === 'APPROVAL_REQUIRED',
    )

    const approved = store.tasks.approve(high.id, { actor: 'tester', note: 'manual approval' })
    assert.equal(approved.status, 'queued')
    assert.equal(approved.approved_by, 'tester')
    assert.ok(approved.approved_at)

    const dispatched = store.tasks.update(approved.id, { status: 'dispatched' }, 'tester')
    assert.equal(dispatched.status, 'dispatched')
    assert.ok(dispatched.dispatched_at)

    const verify = store.timeline.verify('ENG-TEST')
    assert.equal(verify.ok, true, JSON.stringify(verify))
    assert.ok(verify.checked >= 3)

    const id = dispatched.id
    store.close()

    const reopened = new BlueStoreV3(root)
    try {
      assert.equal(reopened.schemaVersion, '3.0')
      assert.equal(reopened.tasks.get(id).status, 'dispatched')
      assert.equal(reopened.timeline.verify('ENG-TEST').ok, true)
    } finally {
      reopened.close()
    }
  } finally {
    if (store.closed !== true) store.close()
  }

  const oldRoot = tempRoot('migrate')
  roots.push(oldRoot)
  const oldStore = new BlueStore(oldRoot)
  let oldTaskId
  try {
    const engagement = oldStore.openEngagement('迁移样本', ['https://example.test'], 'synthetic')
    const task = oldStore.createTask(engagement.id, {
      role: 'ir',
      title: '隔离主机 10.0.0.9',
      brief: 'synthetic high risk',
      risk_level: 'high',
      requires_approval: true,
    })
    oldTaskId = task.id
    oldStore.addTimeline(engagement.id, { actor: 'tester', action: 'note', target: 'fixture', detail: 'before migration' })
  } finally {
    oldStore.close()
  }

  const migrated = new BlueStoreV3(oldRoot)
  try {
    assert.equal(migrated.schemaVersion, '3.0')
    const task = migrated.tasks.get(oldTaskId)
    assert.ok(task, '迁移后任务应存在')
    assert.equal(task.status, 'pending_approval')
    assert.equal(task.risk_level, 'high')
    const verify = migrated.timeline.verify(task.engagement_id)
    assert.equal(verify.ok, true, JSON.stringify(verify))
    assert.ok(migrated.lastBackup, '迁移前应有备份')
    assert.equal(existsSync(migrated.lastBackup), true)
  } finally {
    migrated.close()
  }

  console.log('✓ v3 数据层测试通过：新库/审批/时间线/重开/2.0 迁移')
} finally {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true })
  }
}
