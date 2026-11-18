#!/usr/bin/env node
/**
 * M4.0 工具契约测试：session 6 + asset 2 + alert 3。
 * 只使用临时 SQLite，不连接真实目标。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BlueStoreV3 } from '../v3/store.js'
import { apply } from '../v3/tools.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-m4-'))
const store = new BlueStoreV3(root)
const registered = new Map()
const mode = { version: '3.0.0-dev', package_version: '2.0.0', skeleton: false }

const ctx = {
  blueTeamV3: store,
  tools: { register: (definition) => registered.set(definition.name, definition) },
  effect: (fn) => fn(),
  get: (name) => {
    if (name === 'blueTeamV3') return store
    if (name === 'blueTeamModeV3') return mode
    return undefined
  },
  logger: { info: () => {} },
}

apply(ctx)

function makeExec(id = 'S1', messages = ['防御自检']) {
  const events = messages.map((text) => ({ type: 'user/message', data: { text } }))
  return {
    agent: {
      session: {
        id,
        parentSessionId: null,
        snapshotEvents: () => events,
      },
    },
  }
}

async function call(name, args = {}, exec = makeExec()) {
  const definition = registered.get(name)
  assert.ok(definition, '未注册工具：' + name)
  const output = await definition.execute(args, exec)
  return JSON.parse(output)
}

const expected = [
  'blue_engagement_open', 'blue_session_info', 'blue_scope_check',
  'blue_preflight', 'blue_defense_selfcheck', 'blue_tool_catalog',
  'blue_asset_add', 'blue_asset_query',
  'blue_alert_ingest', 'blue_alert_list', 'blue_alert_triage',
]
assert.deepEqual([...registered.keys()].sort(), expected.slice().sort())
assert.equal(registered.size, 11)

try {
  const exec = makeExec()

  const info = await call('blue_session_info', {}, exec)
  assert.equal(info.ok, true)
  assert.equal(info.session.bound_engagement, null)

  const blocked = await call('blue_asset_add', { name: '未自检资产' }, exec)
  assert.equal(blocked.ok, false)
  assert.equal(blocked.code, 'SELF_CHECK_REQUIRED')

  const noUser = await call('blue_defense_selfcheck', { phrase: '防御自检' }, makeExec('S0', ['你好']))
  assert.equal(noUser.ok, false)
  assert.equal(noUser.code, 'SELF_CHECK_USER')

  const wrongPhrase = await call('blue_defense_selfcheck', { phrase: '自检' }, exec)
  assert.equal(wrongPhrase.ok, false)
  assert.equal(wrongPhrase.code, 'SELF_CHECK_PHRASE')

  const checked = await call('blue_defense_selfcheck', { phrase: '防御自检' }, exec)
  assert.equal(checked.ok, true)

  const opened = await call('blue_engagement_open', {
    name: '演示防守目标',
    scope: ['10.10.0.0/24', 'example.test'],
    note: 'M4.0 契约测试',
  }, exec)
  assert.equal(opened.ok, true, JSON.stringify(opened))
  assert.equal(opened.engagement.name, '演示防守目标')
  assert.equal(opened.session.bound_engagement.name, '演示防守目标')

  const info2 = await call('blue_session_info', {}, exec)
  assert.equal(info2.session.bound_engagement.id, opened.engagement.id)

  const inScope = await call('blue_scope_check', { target: 'https://app.example.test/login' }, exec)
  assert.equal(inScope.ok, true)
  assert.equal(inScope.status, 'in')

  const cidr = await call('blue_scope_check', { target: '10.10.0.42' }, exec)
  assert.equal(cidr.status, 'in')

  const outScope = await call('blue_scope_check', { target: '192.0.2.9' }, exec)
  assert.equal(outScope.ok, false)
  assert.equal(outScope.status, 'out')

  const asset = await call('blue_asset_add', {
    name: '门户',
    address: 'app.example.test',
    kind: 'web',
    port: 443,
    criticality: 'high',
    tags: ['对外', '登录'],
  }, exec)
  assert.equal(asset.ok, true)
  assert.equal(asset.asset.name, '门户')
  assert.equal(asset.stats.assets, 1)

  const asset2 = await call('blue_asset_add', {
    name: '门户（更新）',
    address: 'app.example.test',
    kind: 'web',
    port: 443,
    service: 'nginx',
  }, exec)
  assert.equal(asset2.ok, true)
  assert.equal(asset2.stats.assets, 1)
  assert.equal(asset2.asset.service, 'nginx')

  const assets = await call('blue_asset_query', { q: '门户', limit: 10 }, exec)
  assert.equal(assets.ok, true)
  assert.equal(assets.count, 1)

  const alert = await call('blue_alert_ingest', {
    title: '可疑登录',
    severity: 'high',
    source: 'waf',
    external_id: 'evt-1',
    raw: '{"user":"demo"}',
  }, exec)
  assert.equal(alert.ok, true)
  assert.equal(alert.ingested, 1)
  assert.equal(alert.stats.alerts, 1)

  const duplicate = await call('blue_alert_ingest', {
    title: '可疑登录',
    severity: 'high',
    source: 'waf',
    external_id: 'evt-1',
    raw: '{"user":"demo"}',
  }, exec)
  assert.equal(duplicate.updated, 1)
  assert.equal(duplicate.stats.alerts, 1)

  const batch = await call('blue_alert_ingest', {
    raw: JSON.stringify([
      { title: '扫描', severity: 'medium', source: 'ids', id: 'evt-2' },
      { title: '爆破', severity: 'critical', source: 'ids', id: 'evt-3' },
    ]),
  }, exec)
  assert.equal(batch.ingested, 2)
  assert.equal(batch.stats.alerts, 3)

  const list = await call('blue_alert_list', { severity: 'critical' }, exec)
  assert.equal(list.count, 1)

  const triaged = await call('blue_alert_triage', {
    id: alert.alerts[0].id,
    status: 'investigating',
    note: '确认是合成数据',
    confidence: 'high',
  }, exec)
  assert.equal(triaged.ok, true)
  assert.equal(triaged.alert.status, 'investigating')
  assert.equal(triaged.task, null)

  const notImplemented = await call('blue_alert_triage', {
    id: alert.alerts[0].id,
    status: 'contained',
    create_task: true,
  }, exec)
  assert.equal(notImplemented.ok, false)
  assert.equal(notImplemented.code, 'NOT_IMPLEMENTED')

  const preflight = await call('blue_preflight', {}, exec)
  assert.equal(preflight.ok, true)
  assert.equal(preflight.db.schema_version, '3.0')
  assert.equal(preflight.tools.registered, 11)

  const catalog = await call('blue_tool_catalog', {}, exec)
  assert.equal(catalog.registered, 11)
  assert.equal(catalog.planned, 73)

  console.log('✓ v3 M4.0 工具契约通过：session 6 / asset 2 / alert 3，共 11 个')
} finally {
  store.close()
  rmSync(root, { recursive: true, force: true })
}
