#!/usr/bin/env node
/** M5 Host API 兼容测试：2.0 控制台 op + /blue/v3/api。 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { BlueStoreV3 } from '../v3/store.js'
import { apply } from '../v3/ui.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-ui-'))
process.env.BLUE_TELEMETRY_ROOT = root
const store = new BlueStoreV3(root)
const routes = new Map()
const ctx = {
  blueTeamV3: store,
  webServer: {
    register(definition) {
      routes.set(definition.path, definition)
      return () => {}
    },
  },
  effect(fn) {
    fn()
  },
  get(name) {
    if (name === 'blueTeamV3') return store
    if (name === 'blueTeamModeV3') return { version: '3.0.0-dev', root, skills: 12 }
    return undefined
  },
  logger: { info: () => {} },
}

function makeReq(body, options = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))])
  req.method = options.method || 'POST'
  req.headers = {
    host: '127.0.0.1:1234',
    origin: options.origin || 'http://127.0.0.1:1234',
    ...(options.headers || {}),
  }
  req.socket = { remoteAddress: '127.0.0.1' }
  req.destroy = () => {}
  return req
}

function makeRes() {
  const state = { status: 0, headers: {}, body: '' }
  return {
    state,
    writeHead(status, headers) {
      state.status = status
      state.headers = headers
    },
    end(body) {
      state.body = body
    },
  }
}

async function call(path, body, options = {}) {
  const route = routes.get(path)
  assert.ok(route, '未注册路由：' + path)
  const req = makeReq(body, options)
  const res = makeRes()
  await route.handler(req, res)
  return { status: res.state.status, body: JSON.parse(res.state.body) }
}

try {
  apply(ctx)
  assert.equal(routes.size, 5)
  assert.ok(routes.has('/blue/api'))
  assert.ok(routes.has('/blue/v3/api'))
  assert.ok(routes.has('/blue/protect'))
  assert.ok(routes.has('/blue/collect'))
  assert.ok(routes.has('/blue/collector.mjs'))

  const empty = await call('/blue/api', { op: 'overview' })
  assert.equal(empty.status, 200)
  assert.equal(empty.body.engagement, null)

  const opened = await call('/blue/api', {
    op: 'openEngagement',
    name: 'UI 合成目标',
    scope: ['10.10.0.0/24', 'example.test'],
    session: 'S-UI',
  })
  assert.equal(opened.body.ok, true)
  assert.equal(opened.body.engagement.name, 'UI 合成目标')
  assert.ok(opened.body.protection && typeof opened.body.protection.headline === 'string')
  const engagementId = opened.body.engagement.id

  const protect = await call('/blue/api', {
    op: 'protectStart',
    session: 'S-UI',
    target: 'https://ui-protected.example.test',
    name: 'UI 保护向导',
  })
  assert.equal(protect.body.ok, true)
  assert.equal(protect.body.checklist.length, 5)
  const protectStatus = await call('/blue/api', { op: 'protectStatus', session: 'S-UI' })
  assert.equal(protectStatus.body.ok, true)
  assert.equal(protectStatus.body.headline, '还没看到日志')
  const rebound = await call('/blue/api', { op: 'bindEngagement', session: 'S-UI', engagement: engagementId })
  assert.equal(rebound.body.ok, true)

  const collectorInfo = await call('/blue/api', { op: 'collectorInfo', session: 'S-UI' })
  assert.equal(collectorInfo.body.ok, true)
  const remote = await call('/blue/collect', {
    engagement: engagementId,
    events: [{ status: 401, path: '/admin/login', remote: '203.0.113.9' }],
  }, { origin: 'http://10.0.0.5:9999', headers: { authorization: 'Bearer ' + collectorInfo.body.token } })
  assert.equal(remote.status, 200, JSON.stringify(remote.body))
  const badRemote = await call('/blue/collect', {
    engagement: engagementId,
    events: [{ path: '/x' }],
  }, { origin: 'http://10.0.0.5:9999', headers: { authorization: 'Bearer bad' } })
  assert.equal(badRemote.status, 401)

  const overview = await call('/blue/api', { op: 'overview', session: 'S-UI' })
  assert.equal(overview.status, 200)
  assert.equal(overview.body.engagement.id, engagementId)
  assert.ok(Array.isArray(overview.body.assets))
  assert.ok(Array.isArray(overview.body.tasks))
  assert.ok(typeof overview.body.report_markdown === 'string')
  assert.equal(overview.body.version, '3.0.0-dev')

  const asset = await call('/blue/api', {
    op: 'addAsset',
    session: 'S-UI',
    asset: { name: 'ui-web', kind: 'web', address: '10.10.0.42', port: 443, criticality: 'high' },
  })
  assert.equal(asset.body.ok, true)
  assert.equal(asset.body.asset.name, 'ui-web')

  const task = await call('/blue/api', {
    op: 'createTask',
    session: 'S-UI',
    task: { role: 'ir', title: '隔离主机 10.10.0.42', brief: '隔离主机并封禁端口', acceptance: '隔离完成并验证' },
  })
  assert.equal(task.body.ok, true)
  assert.equal(task.body.task.status, 'pending_approval')

  const approved = await call('/blue/api', {
    op: 'approveTask',
    session: 'S-UI',
    task: task.body.task.id,
    actor: 'ui-operator',
    note: 'UI 审批',
  })
  assert.equal(approved.body.ok, true)
  assert.equal(approved.body.task.status, 'queued')

  const claimed = await call('/blue/api', {
    op: 'claim',
    session: 'S-UI',
    task: task.body.task.id,
  })
  assert.equal(claimed.body.ok, true)
  assert.equal(claimed.body.task.status, 'dispatched')

  const plan = await call('/blue/api', { op: 'plan', session: 'S-UI', limit: 5 })
  assert.equal(plan.body.ok, true)
  assert.ok(plan.body.snapshot)

  const control = await call('/blue/api', { op: 'controlScan', session: 'S-UI' })
  assert.equal(control.body.ok, true)
  assert.ok(Array.isArray(control.body.controls))

  const report = await call('/blue/api', { op: 'report', session: 'S-UI' })
  assert.equal(report.body.ok, true)
  assert.ok(report.body.markdown.includes('UI 合成目标'))

  const evidence = await call('/blue/api', { op: 'exportEvidence', session: 'S-UI' })
  assert.equal(evidence.body.ok, true)
  assert.equal(evidence.body.digest.length, 64)

  const sync = await call('/blue/api', { op: 'syncDecoys', session: 'S-UI', authorized: true })
  assert.equal(sync.body.ok, true)
  assert.equal(sync.body.events, 0)

  const v3 = await call('/blue/v3/api', { op: 'overview', session: 'S-UI' })
  assert.equal(v3.status, 200)
  assert.equal(v3.body.engagement.id, engagementId)

  const cross = await call('/blue/api', { op: 'overview' }, { origin: 'http://evil.example' })
  assert.equal(cross.status, 403)

  const get = await call('/blue/api', { op: 'overview' }, { method: 'GET' })
  assert.equal(get.status, 405)

  const unknown = await call('/blue/api', { op: 'nope', session: 'S-UI' })
  assert.equal(unknown.status, 400)
  assert.equal(unknown.body.ok, false)

  console.log('✓ v3 M5 Host API 兼容通过：5 条路由 / 2.0 op / 同源校验 + 采集 token')
} finally {
  store.close()
  rmSync(root, { recursive: true, force: true })
}
