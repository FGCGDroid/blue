#!/usr/bin/env node
/**
 * M4.0 工具契约测试：session 6 + asset 2 + alert 3。
 * 只使用临时 SQLite，不连接真实目标。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
  'blue_finding_add', 'blue_finding_update', 'blue_finding_list',
  'blue_ioc_add', 'blue_ioc_list', 'blue_ioc_check',
  'blue_task_create', 'blue_task_update', 'blue_task_approve', 'blue_task_list', 'blue_autopilot',
  'blue_incident_open', 'blue_incident_list', 'blue_incident_update', 'blue_incident_attach',
  'blue_decision_add', 'blue_decision_list', 'blue_timeline', 'blue_report',
  'blue_deception_plan', 'blue_decoy_create', 'blue_decoy_hit', 'blue_decoy_list',
  'blue_decoy_update', 'blue_decoy_sync', 'blue_tarpit_plan',
  'blue_honeypot_ingest', 'blue_access_log_ingest',
]
assert.deepEqual([...registered.keys()].sort(), expected.slice().sort())
assert.equal(registered.size, 39)

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

  const triagedWithTask = await call('blue_alert_triage', {
    id: alert.alerts[0].id,
    status: 'contained',
    create_task: true,
    role: 'ir',
    note: '确认是合成数据，转处置',
  }, exec)
  assert.equal(triagedWithTask.ok, true)
  assert.ok(triagedWithTask.task)
  assert.equal(triagedWithTask.alert.task_id, triagedWithTask.task.id)

  const finding = await call('blue_finding_add', {
    title: '暴露的备份目录',
    severity: 'high',
    category: 'exposure',
    evidence: 'GET /.git/config 返回 200',
    recommendation: '禁止 Web 根目录访问 .git',
  }, exec)
  assert.equal(finding.ok, true)
  assert.equal(finding.stats.findings, 1)

  const findingUpdated = await call('blue_finding_update', {
    id: finding.finding.id,
    status: 'fixed',
    evidence: '复测 404',
  }, exec)
  assert.equal(findingUpdated.finding.status, 'fixed')

  const findings = await call('blue_finding_list', { status: 'fixed' }, exec)
  assert.equal(findings.count, 1)

  const ioc = await call('blue_ioc_add', {
    type: 'ip',
    value: '203.0.113.7',
    source: '合成情报',
    confidence: 'high',
  }, exec)
  assert.equal(ioc.ok, true)
  assert.equal(ioc.total, 1)

  const iocList = await call('blue_ioc_list', { type: 'ip' }, exec)
  assert.equal(iocList.count, 1)

  const iocCheck = await call('blue_ioc_check', {
    text: 'login from 203.0.113.7\nnext line',
  }, exec)
  assert.equal(iocCheck.matched, true)
  assert.equal(iocCheck.hits[0].line, 1)

  const highTask = await call('blue_task_create', {
    role: 'ir',
    title: '隔离主机 10.10.0.42',
    brief: '隔离主机并封禁异常端口',
    priority: 'P0',
    acceptance: '隔离完成并给出验证证据',
  }, exec)
  assert.equal(highTask.ok, true)
  assert.equal(highTask.task.risk_level, 'high')
  assert.equal(highTask.task.status, 'pending_approval')
  assert.equal(highTask.task.requires_approval, 1)

  const roleChange = await call('blue_task_update', {
    id: highTask.task.id,
    role: 'monitor',
  }, exec)
  assert.equal(roleChange.ok, false)
  assert.equal(roleChange.code, 'TASK_ROLE_IMMUTABLE')

  const nextBeforeApprove = await call('blue_autopilot', { action: 'next', limit: 5 }, exec)
  assert.ok(!(nextBeforeApprove.dispatches || []).some((item) => item.task_id === highTask.task.id))

  const approved = await call('blue_task_approve', {
    task_id: highTask.task.id,
    actor: 'human-operator',
    note: 'M4.1 合成审批',
  }, exec)
  assert.equal(approved.ok, true)
  assert.equal(approved.task.status, 'queued')
  assert.equal(approved.task.approved_by, 'human-operator')

  const tasks = await call('blue_task_list', { risk_level: 'high' }, exec)
  assert.equal(tasks.count, 1)

  const next = await call('blue_autopilot', { action: 'next', limit: 5 }, exec)
  assert.equal(next.ok, true)
  assert.ok(next.dispatches.some((item) => item.task_id === highTask.task.id))

  const completed = await call('blue_autopilot', {
    action: 'complete',
    task_id: highTask.task.id,
    result: '已隔离并验证',
  }, exec)
  assert.equal(completed.ok, true)
  assert.equal(completed.task.status, 'done')

  const slots = await call('blue_autopilot', { action: 'set_slots', slots: 4 }, exec)
  assert.equal(slots.max_slots, 4)

  const autoStatus = await call('blue_autopilot', { action: 'status' }, exec)
  assert.equal(autoStatus.ok, true)
  assert.equal(autoStatus.max_slots, 4)

  const incident = await call('blue_incident_open', {
    title: '合成登录事件',
    severity: 'high',
    summary: 'M4.1 契约测试',
  }, exec)
  assert.equal(incident.ok, true)

  const incidents = await call('blue_incident_list', {}, exec)
  assert.equal(incidents.count, 1)

  const incidentUpdated = await call('blue_incident_update', {
    id: incident.incident.id,
    status: 'investigating',
  }, exec)
  assert.equal(incidentUpdated.incident.status, 'investigating')

  const attached = await call('blue_incident_attach', {
    id: incident.incident.id,
    alert_id: alert.alerts[0].id,
    finding_id: finding.finding.id,
    task_id: highTask.task.id,
  }, exec)
  assert.equal(attached.ok, true)
  assert.equal(attached.attached.length, 3)

  const decision = await call('blue_decision_add', {
    decision: '将合成登录事件升级为调查',
    rationale: '告警与发现指向同一路径',
    incident_id: incident.incident.id,
    confidence: 'high',
  }, exec)
  assert.equal(decision.ok, true)
  const decisions = await call('blue_decision_list', { incident_id: incident.incident.id }, exec)
  assert.equal(decisions.count, 1)

  const timelineAdd = await call('blue_timeline', {
    actor: 'commander',
    event: 'containment',
    target: 'app.example.test',
    detail: '合成时间线',
  }, exec)
  assert.equal(timelineAdd.ok, true)
  const timelineList = await call('blue_timeline', { mode: 'list', limit: 10 }, exec)
  assert.ok(timelineList.timeline.length >= 1)

  const report = await call('blue_report', {}, exec)
  assert.equal(report.ok, true)
  assert.ok(report.markdown.includes('蓝队防守报告'))
  assert.ok(report.bytes > 100)

  const reportWrite = await call('blue_report', { write: true }, exec)
  assert.equal(reportWrite.ok, false)
  assert.equal(reportWrite.code, 'NOT_IMPLEMENTED')

  const plan = await call('blue_deception_plan', {}, exec)
  assert.equal(plan.ok, true)
  assert.equal(plan.templates.length, 5)

  const deniedDecoy = await call('blue_decoy_create', {
    kind: 'canary_url',
    name: 'denied',
    target: 'https://app.example.test/denied',
    authorized: false,
  }, exec)
  assert.equal(deniedDecoy.code, 'DECOY_AUTH')

  const outOfScopeDecoy = await call('blue_decoy_create', {
    kind: 'canary_url',
    name: 'outside',
    target: 'https://192.0.2.10/outside',
    authorized: true,
  }, exec)
  assert.equal(outOfScopeDecoy.code, 'DECOY_SCOPE')

  const decoy = await call('blue_decoy_create', {
    kind: 'canary_url',
    name: 'canary-1',
    target: 'https://app.example.test/canary',
    authorized: true,
    ttl_hours: 24,
  }, exec)
  assert.equal(decoy.ok, true)
  assert.equal(decoy.decoy.status, 'planned')

  const hit = await call('blue_decoy_hit', {
    decoy: decoy.decoy.id,
    source: '198.51.100.9',
    evidence: 'GET /canary',
  }, exec)
  assert.equal(hit.ok, true)

  const decoys = await call('blue_decoy_list', {}, exec)
  assert.ok(decoys.decoys.length >= 1)

  const active = await call('blue_decoy_update', {
    id: decoy.decoy.id,
    status: 'active',
    note: '人工确认已部署',
  }, exec)
  assert.equal(active.decoy.status, 'active')

  const syncPath = join(root, 'decoy-events.jsonl')
  writeFileSync(syncPath, JSON.stringify({
    decoy: 'canary-1',
    source: '198.51.100.10',
    evidence: 'GET /canary?x=1',
    event_key: 'evt-decoy-1',
  }) + '\n', 'utf8')
  const synced = await call('blue_decoy_sync', {
    path: syncPath,
    authorized: true,
    max_events: 10,
  }, exec)
  assert.equal(synced.ok, true)
  assert.equal(synced.synced, 1)

  const tarpit = await call('blue_tarpit_plan', { ssh_port: 2222, ban_days: 7 }, exec)
  assert.equal(tarpit.ok, true)
  assert.ok(tarpit.endlessh.config.includes('Port 2222'))

  const honeypot = await call('blue_honeypot_ingest', {
    target: 'https://app.example.test/honeypot',
    source_ip: '198.51.100.11',
    payload: 'synthetic probe',
    path: '/honeypot',
  }, exec)
  assert.equal(honeypot.ok, true)
  assert.equal(honeypot.approval_required, true)
  assert.equal(honeypot.task.status, 'pending_approval')

  const accessPath = join(root, 'access.jsonl')
  writeFileSync(accessPath, [
    JSON.stringify({ status: 401, path: '/admin/login', remote: '198.51.100.12', at: '2026-11-18T00:00:00Z' }),
    JSON.stringify({ status: 200, path: '/public', remote: '198.51.100.13', at: '2026-11-18T00:00:01Z' }),
    JSON.stringify({ status: 404, path: '/admin%2f..%2fpublic', remote: '198.51.100.14', at: '2026-11-18T00:00:02Z' }),
  ].join('\n') + '\n', 'utf8')
  const access = await call('blue_access_log_ingest', {
    path: accessPath,
    max_events: 10,
    max_alerts: 10,
  }, exec)
  assert.equal(access.ok, true)
  assert.equal(access.suspicious, 2)
  assert.equal(access.ingested, 2)

  const preflight = await call('blue_preflight', {}, exec)
  assert.equal(preflight.ok, true)
  assert.equal(preflight.db.schema_version, '3.0')
  assert.equal(preflight.tools.registered, 39)

  const catalog = await call('blue_tool_catalog', {}, exec)
  assert.equal(catalog.registered, 39)
  assert.equal(catalog.planned, 73)

  console.log('✓ v3 M4.2 工具契约通过：session 6 / asset 2 / alert 3 / finding 3 / ioc 3 / task 5 / incident 4 / decision 2 / timeline 1 / report 1 / decoy 9，共 39 个')
} finally {
  store.close()
  rmSync(root, { recursive: true, force: true })
}
