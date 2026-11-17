#!/usr/bin/env node
/**
 * 3.0 M2 剩余仓储测试：诱饵、响应、证据锚定、遥测源。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStoreV3 } from '../v3/store.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-repos-'))
const previousTelemetryRoot = process.env.BLUE_TELEMETRY_ROOT
process.env.BLUE_TELEMETRY_ROOT = root
let store

try {
  store = new BlueStoreV3(root)
  const engagementId = 'ENG-REPOS'

  const decoy = store.decoys.create(engagementId, {
    kind: 'canary_file', name: 'fake-config', target: '/var/www/.env', ttl_hours: 24,
  })
  assert.equal(decoy.status, 'planned')
  const hit = store.decoys.addHit(decoy.id, { source: 'gateway', evidence: 'synthetic', event_key: 'e1' })
  assert.equal(hit.decoy.status, 'active')
  assert.equal(hit.alert.source, 'deception')
  const duplicate = store.decoys.addHit(decoy.id, { event_key: 'e1' })
  assert.equal(duplicate.duplicate, true)
  assert.equal(store.decoys.listHits(engagementId).length, 1)
  const retired = store.decoys.update(decoy.id, { status: 'retired' })
  assert.equal(retired.status, 'retired')
  assert.throws(
    () => store.decoys.update(decoy.id, { status: 'active' }),
    (error) => error.code === 'DECOY_TRANSITION',
  )

  const response = store.responses.plan(engagementId, {
    action: 'block_ip', target: '203.0.113.9', rollback: '删除临时封禁规则', note: 'synthetic',
  })
  assert.equal(response.task.status, 'pending_approval')
  assert.throws(
    () => store.responses.update(response.action.id, { status: 'applied', evidence: 'x' }),
    (error) => error.code === 'RESPONSE_APPROVAL',
  )
  store.tasks.approve(response.task.id, { actor: 'tester', note: 'approved' })
  const applied = store.responses.update(response.action.id, { status: 'applied', evidence: 'executed', actor: 'tester' })
  assert.equal(applied.status, 'applied')
  assert.equal(store.responses.verify(response.action.id).ok, true)
  const rolled = store.responses.update(response.action.id, { status: 'rolled_back', actor: 'tester' })
  assert.equal(rolled.status, 'rolled_back')

  assert.equal(store.evidenceRepo.verify(engagementId).reason, 'no_anchor')
  const anchor = store.evidenceRepo.addAnchor(engagementId, { actor: 'tester' })
  assert.equal(anchor.head.length, 64)
  const verified = store.evidenceRepo.verify(engagementId)
  assert.equal(verified.ok, true, JSON.stringify(verified))

  const logPath = join(root, 'telemetry.jsonl')
  writeFileSync(logPath, '{"path":"/x"}\n', 'utf8')
  const source = store.telemetry.addSource(engagementId, { name: 'fixture', path: logPath })
  assert.equal(source.kind, 'jsonl')
  const cursor = store.telemetry.saveCursor(source.id, { cursor: 12, events: 2, alerts: 1 })
  assert.equal(cursor.cursor, 12)
  assert.equal(cursor.events_total, 2)
  const errored = store.telemetry.markError(source.id, 'boom')
  assert.equal(errored.last_error, 'boom')
  assert.equal(store.telemetry.listSources(engagementId).length, 1)

  const verify = store.timeline.verify(engagementId)
  assert.equal(verify.ok, true, JSON.stringify(verify))

  console.log('✓ v3 剩余仓储通过：诱饵/响应/锚定/遥测源/时间线')
} finally {
  if (store) store.close()
  if (previousTelemetryRoot === undefined) delete process.env.BLUE_TELEMETRY_ROOT
  else process.env.BLUE_TELEMETRY_ROOT = previousTelemetryRoot
  rmSync(root, { recursive: true, force: true })
}
