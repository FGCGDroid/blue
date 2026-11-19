#!/usr/bin/env node
/**
 * 3.0 骨架冒烟测试。
 *
 * 只验证：
 *   - 入口能挂载
 *   - 状态机/风险分级/时间线哈希能跑
 *   - 配置校验会拒绝非法值
 *   - 网关 CLI --check 可用
 *   - 分层检查通过
 *
 * 不验证业务，不读真实数据库，不监听端口。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { apply as applyIndex } from '../v3/index.js'
import { apply as applyStore } from '../v3/store.js'
import { apply as applyTools } from '../v3/tools.js'
import { main as gatewayMain } from '../v3/gateway.js'
import { loadConfig } from '../v3/bootstrap/config.js'
import { canTransitionTask, TASK_STATUS } from '../v3/domain/task/states.js'
import { inferRisk, initialStatusForRisk } from '../v3/domain/task/risk.js'
import { timelineHash } from '../v3/domain/evidence/hash.js'
import { notImplemented } from '../v3/domain/shared/errors.js'
import { assertTaskInvariants } from '../v3/domain/task/invariants.js'
import { createCounters } from '../v3/infra/metrics/counters.js'
import { isWithin } from '../v3/infra/fs/safe-path.js'
import { ALL_TOOL_NAMES, EXISTING_TOOL_NAMES, NEW_TOOL_NAMES } from '../v3/tools/catalog.js'
import { TOOL_MODULES } from '../v3/tools/index.js'
import { checkV3Layers } from './check-v3-layers.mjs'

function fakeCtx() {
  const provided = new Map()
  return {
    provided,
    provide(name, value) {
      provided.set(name, value)
    },
    logger: { info() {} },
    get(name) {
      return provided.get(name)
    },
    effect(fn) {
      this.cleanup = fn()
    },
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'blue-v3-'))

try {
  const ctx = fakeCtx()
  applyIndex(ctx, { root: tmp })
  const mode = ctx.provided.get('blueTeamModeV3')
  assert.equal(mode.skeleton, false)
  assert.equal(mode.root, tmp)
  assert.equal(mode.version, '3.0.0-beta.1')

  const storeCtx = fakeCtx()
  applyStore(storeCtx, { root: tmp })
  assert.equal(storeCtx.provided.get('blueTeamV3').root, tmp)

  const config = loadConfig({ BLUE_GATEWAY_PORT: '8787' })
  assert.equal(config.host, '127.0.0.1')
  assert.equal(config.port, 8787)
  assert.equal(config.mode, 'enforce')
  assert.throws(
    () => loadConfig({ BLUE_GATEWAY_MODE: 'nope' }),
    (error) => error.code === 'CONFIG_MODE',
  )
  assert.throws(
    () => loadConfig({ BLUE_GATEWAY_HOST: '0.0.0.0' }),
    (error) => error.code === 'CONFIG_HOST',
  )
  assert.throws(
    () => loadConfig({ BLUE_GATEWAY_PORT: '70000' }),
    (error) => error.code === 'CONFIG_PORT',
  )

  assert.equal(canTransitionTask(TASK_STATUS.QUEUED, TASK_STATUS.DISPATCHED), true)
  assert.equal(canTransitionTask(TASK_STATUS.PENDING_APPROVAL, TASK_STATUS.DISPATCHED), false)
  assert.equal(canTransitionTask(TASK_STATUS.DONE, TASK_STATUS.RUNNING), false)

  assert.equal(inferRisk({ role: 'ir', title: '隔离主机 10.0.0.5' }), 'high')
  assert.equal(initialStatusForRisk('high'), TASK_STATUS.PENDING_APPROVAL)
  assert.equal(inferRisk({ role: 'monitor', title: '确认日志接入' }), 'low')
  assert.equal(initialStatusForRisk('low'), TASK_STATUS.QUEUED)

  const row = {
    engagement_id: 'ENG-TEST',
    at: '2026-01-01T00:00:00.000Z',
    actor: 'tester',
    action: 'note',
    target: 'x',
    detail: 'y',
  }
  const hash = timelineHash(row, '')
  assert.match(hash, /^[a-f0-9]{64}$/)
  assert.equal(timelineHash(row, ''), hash)

  assert.throws(
    () => notImplemented('demo', 'M3'),
    (error) => error.code === 'NOT_IMPLEMENTED',
  )

  assert.equal(ALL_TOOL_NAMES.length, 77)
  assert.equal(EXISTING_TOOL_NAMES.length, 66)
  assert.equal(NEW_TOOL_NAMES.length, 11)
  assert.equal(TOOL_MODULES.length, 27)

  const toolsCtx = fakeCtx()
  toolsCtx.provided.set('blueTeamV3', storeCtx.provided.get('blueTeamV3'))
  const registered = []
  toolsCtx.tools = {
    register(definition) {
      registered.push(definition.name)
    },
  }
  applyTools(toolsCtx)
  assert.equal(registered.length, 77)
  storeCtx.provided.get('blueTeamV3').close()

  const counters = createCounters()
  counters.inc('demo', { b: 2, a: 1 })
  assert.deepEqual(counters.snapshot(), { 'demo{a=1,b=2}': 1 })

  assert.equal(isWithin(tmp, join(tmp, 'child')), true)
  assert.equal(isWithin(tmp, join(tmp, '..', 'outside')), false)

  assert.doesNotThrow(() => assertTaskInvariants({
    title: 't', risk_level: 'low', status: 'queued', requires_approval: 0,
  }))
  assert.throws(
    () => assertTaskInvariants({
      title: 't', risk_level: 'high', status: 'queued', requires_approval: 0,
    }),
    (error) => error.code === 'TASK_INVARIANT',
  )

  const originalLog = console.log
  console.log = () => {}
  let code
  try {
    code = await gatewayMain(['--check'], { BLUE_HOME: tmp, BLUE_GATEWAY_PORT: '8787' })
  } finally {
    console.log = originalLog
  }
  assert.equal(code, 0)

  const layers = checkV3Layers()
  assert.equal(layers.ok, true, JSON.stringify(layers.violations))
  assert.ok(layers.files >= 20, `v3 JS 文件太少：${layers.files}`)

  console.log(`✓ v3 骨架测试通过（${layers.files} 个 JS，${Object.keys(layers.byLayer).length} 个层）`)
} finally {
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  } catch (error) {
    console.error('cleanup skipped:', error.code, tmp)
  }
}
