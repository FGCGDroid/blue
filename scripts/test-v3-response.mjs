#!/usr/bin/env node
/**
 * 3.0 M3.5 响应执行器测试。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStoreV3 } from '../v3/store.js'
import { executeResponse } from '../v3/app/response/execute.js'
import { verifyResponse } from '../v3/app/response/verify.js'
import { createMockAdapter } from '../v3/domain/response/adapters.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-response-'))
let store

try {
  store = new BlueStoreV3(root)
  const engagementId = 'ENG-RESPONSE'

  const planned = store.responses.plan(engagementId, {
    action: 'block_ip', target: '203.0.113.10', rollback: '删除临时封禁规则',
  })
  const dry = await executeResponse(store, { response_id: planned.action.id, mode: 'dry-run' })
  assert.equal(dry.ok, true)
  assert.equal(dry.action.status, 'planned')
  assert.ok(dry.plan.commands.length > 0)

  await assert.rejects(
    executeResponse(store, { response_id: planned.action.id, mode: 'apply', confirm: true, evidence: 'x' }),
    (error) => error.code === 'RESPONSE_APPROVAL',
  )

  store.tasks.approve(planned.task.id, { actor: 'tester', note: 'approved' })
  await assert.rejects(
    executeResponse(store, { response_id: planned.action.id, mode: 'apply', confirm: true }),
    (error) => error.code === 'RESPONSE_EVIDENCE',
  )
  const applied = await executeResponse(store, {
    response_id: planned.action.id, mode: 'apply', confirm: true, evidence: 'manual applied',
  })
  assert.equal(applied.ok, true)
  assert.equal(applied.action.status, 'applied')
  assert.equal(verifyResponse(store, planned.action.id).ok, true)

  await assert.rejects(
    executeResponse(store, { response_id: planned.action.id, mode: 'rollback', confirm: true }),
    (error) => error.code === 'RESPONSE_EVIDENCE',
  )
  const rolled = await executeResponse(store, {
    response_id: planned.action.id, mode: 'rollback', confirm: true, evidence: 'manual rolled back',
  })
  assert.equal(rolled.action.status, 'rolled_back')

  const mocked = store.responses.plan(engagementId, {
    action: 'revoke_session', target: 'session-42', rollback: '无需回滚，会话自然过期',
  })
  store.tasks.approve(mocked.task.id, { actor: 'tester' })
  const executed = await executeResponse(store, {
    response_id: mocked.action.id, mode: 'apply', confirm: true, evidence: 'mock applied',
  }, { adapter: createMockAdapter() })
  assert.equal(executed.result.executed, true)
  assert.equal(executed.action.status, 'applied')

  console.log('✓ v3 响应执行通过：dry-run/审批/人工回填/回滚/mock 适配器')
} finally {
  if (store) store.close()
  rmSync(root, { recursive: true, force: true })
}
