#!/usr/bin/env node
/**
 * 3.0 加固回归（2026-12）。
 *
 * 覆盖已修的硬问题：
 *   - 3.0 库重开不再重复备份
 *   - low + pending_approval 必须带审批标记
 *   - 审批只能成功一次
 *   - 派生时间字段不能被 patch 伪造
 *   - 上游 URL 不允许凭据/path/query
 *   - 策略数组/allow 必须合法
 *   - query 控制字符 / absolute-form 凭据
 *   - 遥测源不能逃出允许目录
 *   - 审计锚点绑定本机 key；缺 key 报 no_key
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStoreV3 } from '../v3/store.js'
import { loadConfig } from '../v3/bootstrap/config.js'
import { normalizeRequestPath } from '../v3/domain/gateway/normalize.js'
import { DEFAULT_POLICY, validatePolicy } from '../v3/domain/gateway/policy.js'

const roots = []
const previousTelemetryRoot = process.env.BLUE_TELEMETRY_ROOT

function tempRoot(label) {
  const root = mkdtempSync(join(tmpdir(), `blue-v3-harden-${label}-`))
  roots.push(root)
  return root
}

try {
  const root = tempRoot('db')
  const first = new BlueStoreV3(root)
  const low = first.tasks.create('ENG-HARDEN', {
    role: 'monitor', title: 'low pending', risk_level: 'low', status: 'pending_approval',
  })
  assert.equal(low.status, 'pending_approval')
  assert.equal(low.requires_approval, 1)
  first.tasks.approve(low.id, { actor: 'tester' })
  assert.throws(
    () => first.tasks.approve(low.id, { actor: 'tester' }),
    (error) => error.code === 'TASK_NOT_PENDING',
  )

  const patched = first.tasks.update(low.id, {
    status: 'dispatched', dispatched_at: '2000-01-01T00:00:00.000Z',
  })
  assert.notEqual(patched.dispatched_at, '2000-01-01T00:00:00.000Z')
  first.close()

  const reopened = new BlueStoreV3(root)
  try {
    assert.equal(reopened.schemaVersion, '3.0')
    assert.equal(reopened.lastBackup, null, '3.0 库重开不应再备份')
  } finally {
    reopened.close()
  }

  assert.throws(
    () => loadConfig({ BLUE_GATEWAY_UPSTREAM: 'http://user:pass@127.0.0.1:8080' }),
    (error) => error.code === 'CONFIG_UPSTREAM',
  )
  assert.throws(
    () => loadConfig({ BLUE_GATEWAY_UPSTREAM: 'http://127.0.0.1:8080/base' }),
    (error) => error.code === 'CONFIG_UPSTREAM',
  )
  assert.equal(loadConfig({ BLUE_GATEWAY_HOST: 'LOCALHOST' }).host, 'localhost')

  assert.throws(
    () => validatePolicy({ ...DEFAULT_POLICY, protected: 'not-array' }),
    (error) => error.code === 'POLICY_INVALID',
  )
  assert.throws(
    () => validatePolicy({
      ...DEFAULT_POLICY,
      protected: [{ id: 'x', prefix: '/x', allow: '/x/y' }],
    }),
    (error) => error.code === 'POLICY_INVALID',
  )
  assert.throws(
    () => validatePolicy({
      ...DEFAULT_POLICY,
      protected: [{ id: 'x', prefix: '/x', allow: ['/y'] }],
    }),
    (error) => error.code === 'POLICY_INVALID',
  )

  assert.equal(normalizeRequestPath('/public?x=%0a', DEFAULT_POLICY).reason, 'CONTROL_CHAR')
  assert.equal(normalizeRequestPath('/public?x=\r', DEFAULT_POLICY).reason, 'CONTROL_CHAR')
  assert.equal(
    normalizeRequestPath('http://user:pass@example.test/admin', DEFAULT_POLICY).reason,
    'ABSOLUTE_CREDENTIALS',
  )

  const outside = tempRoot('outside')
  const outsideFile = join(outside, 'outside.log')
  writeFileSync(outsideFile, 'x\n', 'utf8')
  const telemetryRoot = tempRoot('telemetry')
  process.env.BLUE_TELEMETRY_ROOT = telemetryRoot
  const telemetryStore = new BlueStoreV3(telemetryRoot)
  try {
    assert.throws(
      () => telemetryStore.telemetry.addSource('ENG-HARDEN', { name: 'outside', path: outsideFile }),
      (error) => error.code === 'TELEMETRY_PATH',
    )
  } finally {
    telemetryStore.close()
  }

  const evidenceRoot = tempRoot('evidence')
  const evidenceStore = new BlueStoreV3(evidenceRoot)
  try {
    evidenceStore.facts.addAsset('ENG-EVIDENCE', { kind: 'host', name: 'e', address: '10.0.0.1' })
    const anchor = evidenceStore.evidenceRepo.addAnchor('ENG-EVIDENCE', { actor: 'tester' })
    assert.ok(anchor.signature)
    assert.equal(evidenceStore.evidenceRepo.verify('ENG-EVIDENCE').ok, true)

    evidenceStore.evidenceRepo.db.sql("UPDATE audit_anchors SET key_id = 'tampered' WHERE id = ?")
      .run(anchor.id)
    assert.equal(evidenceStore.evidenceRepo.verify('ENG-EVIDENCE').reason, 'bad_key')

    rmSync(join(evidenceRoot, '.audit-key.pem'), { force: true })
    assert.equal(evidenceStore.evidenceRepo.verify('ENG-EVIDENCE').reason, 'no_key')
  } finally {
    evidenceStore.close()
  }

  console.log('✓ v3 加固回归通过：备份/审批/派生字段/配置/策略/query/遥测/锚点 key')
} finally {
  if (previousTelemetryRoot === undefined) delete process.env.BLUE_TELEMETRY_ROOT
  else process.env.BLUE_TELEMETRY_ROOT = previousTelemetryRoot
  for (const root of roots) rmSync(root, { recursive: true, force: true })
}
