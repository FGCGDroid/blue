/**
 * 无 DSH 启动的工具冒烟测试：用假 ctx 跑一遍事实库 + 工具编排。
 *
 * 运行：node scripts/test-tools.mjs
 */
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { apply } from '../lib/tools.js'
import { BlueStore } from '../lib/store.js'
import { TASK_SPEC_SCHEMA, buildTaskSpec } from '../lib/taskspec.js'

const root = fileURLToPath(new URL('../.tmp/tools-test', import.meta.url))
rmSync(root, { recursive: true, force: true })
const store = new BlueStore(root)
const tools = new Map()
const ctx = {
  blueTeam: store,
  tools: {
    register(definition) {
      tools.set(definition.name, definition)
      return () => tools.delete(definition.name)
    },
  },
  effect(fn) { fn() },
  get() { return undefined },
  logger: { info() {}, warn() {}, error() {} },
}
apply(ctx, { profile: 'all' })

if (tools.size !== 29) {
  throw new Error('工具数量不是 29：' + tools.size)
}
for (const [name, definition] of tools) {
  if (definition.parameters.type !== 'object' || typeof definition.parameters.properties !== 'object') {
    throw new Error(name + ' 参数 schema 不合法')
  }
}

const exec = { agent: { session: { id: 'S1', header: {} } } }
async function call(name, args = {}) {
  const definition = tools.get(name)
  if (!definition) throw new Error('工具不存在：' + name)
  return JSON.parse(await definition.execute(args, exec))
}

const opened = await call('blue_engagement_open', { name: '测试靶场', scope: ['10.10.0.0/24', '*.example.test'] })
if (!opened.ok) throw new Error('engagement_open 失败')
const inScope = await call('blue_scope_check', { target: 'http://a.example.test/login' })
const outScope = await call('blue_scope_check', { target: '203.0.113.9' })
if (!inScope.ok || inScope.status !== 'in') throw new Error('scope_check 未识别域名范围')
if (outScope.ok || outScope.status !== 'out') throw new Error('scope_check 未识别范围外目标')
const asset = await call('blue_asset_add', {
  name: 'web01', address: '10.10.0.5', kind: 'web', port: 80, criticality: 'critical', tags: ['flag'],
})
if (!asset.ok) throw new Error('asset_add 失败')
await call('blue_asset_add', { name: 'web01', address: '10.10.0.5', kind: 'web', port: 80 })
const assets = await call('blue_asset_query', { q: 'web01' })
if (assets.assets[0].criticality !== 'critical') throw new Error('资产重复登记时丢失关键级别')
const alert = await call('blue_alert_ingest', { title: 'WebShell 上传', severity: 'critical', source: 'waf', confidence: 'high', raw: 'POST /upload' })
if (!alert.ok || alert.ingested !== 1) throw new Error('alert_ingest 失败')
if (alert.alerts[0].confidence !== 'high' || alert.alerts[0].source !== 'waf') throw new Error('告警来源/置信度未落库')
const triaged = await call('blue_alert_triage', { id: alert.alerts[0].id, status: 'investigating', note: '确认上传点', create_task: true, role: 'ir' })
if (!triaged.ok || !triaged.task || triaged.alert.task_id !== triaged.task.id) throw new Error('告警→任务回溯未落库')
const finding = await call('blue_finding_add', {
  title: '上传点无校验', severity: 'high', category: 'upload', asset_id: asset.asset.id, evidence: 'POST /upload',
  confidence: 'high', source: 'tester', task_id: triaged.task.id,
})
if (finding.finding.confidence !== 'high' || finding.finding.source !== 'tester' || finding.finding.task_id !== triaged.task.id) {
  throw new Error('发现来源/置信度/task_id 未落库')
}
const fixed = await call('blue_finding_update', {
  id: finding.finding.id, status: 'fixed', evidence: '复测：上传 .php 返回 403',
})
if (!fixed.ok || fixed.finding.status !== 'fixed') throw new Error('finding_update 失败')
await call('blue_ioc_add', { type: 'ip', value: '203.0.113.9', confidence: 'high', source: 'waf' })
await call('blue_ioc_add', { type: 'ip', value: '203.0.113.9', confidence: 'high', source: 'ids' })
const iocs = await call('blue_ioc_list', { type: 'ip' })
const sameIoc = (iocs.iocs || []).filter((item) => item.value === '203.0.113.9')
if (sameIoc.length !== 1 || !sameIoc[0].first_seen || !sameIoc[0].last_seen) {
  throw new Error('IOC 去重/首次最后出现未落库：' + JSON.stringify(sameIoc))
}

const scan = await call('blue_log_scan', {
  text: '203.0.113.9 - - [x] "POST /upload HTTP/1.1" 200 1234 eval($_POST["x"]) union select 1',
})
if (scan.risk !== 'critical' && scan.risk !== 'high') throw new Error('log_scan 未识别特征：' + scan.risk)

const preflight = await call('blue_preflight', {})
if (!preflight.ok || !preflight.binaries || !Array.isArray(preflight.binaries.items)) throw new Error('preflight 报告不完整')

const cycle = await call('blue_autopilot', { action: 'cycle', limit: 4 })
if (!cycle.ok || !Array.isArray(cycle.dispatches) || cycle.dispatches.length === 0) {
  throw new Error('autopilot cycle 未派发：' + JSON.stringify(cycle))
}
const first = cycle.dispatches[0]
if (!first.dispatch || first.dispatch.tool !== 'subagent' || !first.dispatch.arguments.agent_preset) {
  throw new Error('dispatch payload 不完整')
}
const completed = await call('blue_autopilot', {
  action: 'complete', task_id: first.task_id, status: 'done', result: '冒烟测试完成',
})
if (!completed.ok || completed.task.status !== 'done') throw new Error('autopilot complete 失败')
const reopen = await call('blue_task_update', { id: first.task_id, status: 'queued' })
if (reopen.ok !== false) throw new Error('终态任务被非法重新打开')

// P0：高风险任务必须先进 pending_approval，不能直接派发。
const engagementId = opened.engagement?.id ?? store.listEngagements()[0].id
const high = await call('blue_task_create', {
  role: 'ir', title: '隔离主机 10.10.0.5', brief: '隔离失陷主机并保留证据', priority: 'P0', risk_level: 'low',
})
if (!high.ok || high.task.status !== 'pending_approval' || high.task.risk_level !== 'high') {
  throw new Error('高风险任务未进入待审批：' + JSON.stringify(high))
}
const directDispatch = await call('blue_task_update', { id: high.task.id, status: 'dispatched' })
if (directDispatch.ok !== false) throw new Error('待审批任务被直接派发')
await call('blue_autopilot', { action: 'set_slots', slots: 8 })
store.setMeta('autopilot:cooldown_sec:' + engagementId, 0)
const beforeApproval = await call('blue_autopilot', { action: 'cycle', limit: 8 })
if ((beforeApproval.dispatches || []).some((item) => item.task_id === high.task.id)) {
  throw new Error('高风险任务未经审批被派发')
}
const approved = await call('blue_task_approve', {
  task_id: high.task.id, actor: 'test-human', note: 'P0 回归测试放行',
})
if (!approved.ok || approved.task.status !== 'queued' || approved.task.approved_by !== 'test-human' || !approved.task.approved_at) {
  throw new Error('审批未落库：' + JSON.stringify(approved))
}
const approvalEvents = store.listTimeline(engagementId, 100).filter((event) => event.action === 'approval' && event.detail.includes(high.task.id))
if (approvalEvents.length !== 1) throw new Error('审批 timeline 事件数量异常：' + approvalEvents.length)
store.setMeta('autopilot:cooldown_sec:' + engagementId, 0)
const afterApproval = await call('blue_autopilot', { action: 'cycle', limit: 8 })
const approvedDispatch = (afterApproval.dispatches || []).find((item) => item.task_id === high.task.id)
if (!approvedDispatch || approvedDispatch.risk_level !== 'high' || approvedDispatch.approved_by !== 'test-human') {
  throw new Error('审批后的高风险任务未正确派发：' + JSON.stringify(afterApproval))
}
if (!approvedDispatch.task_spec || !Array.isArray(approvedDispatch.constraints) || !approvedDispatch.expected_output) {
  throw new Error('dispatch 缺少 TaskSpec/constraints/expected_output')
}
for (const key of TASK_SPEC_SCHEMA.required) {
  if (!(key in approvedDispatch.task_spec)) throw new Error('TaskSpec 缺少字段：' + key)
}
const taskSpec = buildTaskSpec(store.getTask(high.task.id))
if (taskSpec.constraints.length === 0 || taskSpec.expected_output.table !== 'tasks') throw new Error('TaskSpec 默认约束/期望产出不完整')
store.setMeta('autopilot:cooldown_sec:' + engagementId, 30)
const cooldown = await call('blue_autopilot', { action: 'cycle', limit: 1 })
if (cooldown.reason !== 'cooldown') throw new Error('缺少自动派发冷却：' + JSON.stringify(cooldown))
store.setMeta('autopilot:max_rounds:' + engagementId, 1)
store.setMeta('autopilot:rounds:' + engagementId, 1)
store.setMeta('autopilot:cooldown_sec:' + engagementId, 0)
const limited = await call('blue_autopilot', { action: 'cycle', limit: 1 })
if (limited.reason !== 'round_limit') throw new Error('缺少轮次上限：' + JSON.stringify(limited))

const report = await call('blue_report', {})
if (!report.ok || !report.markdown.includes('# 蓝队防守报告')) throw new Error('report 失败')

const defense = await call('blue_defense_status', {})
if (!defense.ok || defense.stats.assets !== 1) throw new Error('defense_status 失败')

for (const profile of ['monitor', 'intel', 'hunt', 'ir', 'forensics', 'hardening']) {
  const scoped = new Map()
  apply({
    blueTeam: store,
    tools: { register(definition) { scoped.set(definition.name, definition); return () => {} } },
    effect(fn) { fn() },
    get() { return undefined },
    logger: { info() {}, warn() {}, error() {} },
  }, { profile })
  if (scoped.size === 0 || scoped.size >= 29) throw new Error(profile + ' 工具裁剪异常：' + scoped.size)
  if (!scoped.has('blue_task_update')) throw new Error(profile + ' 缺少任务回收工具')
  if (scoped.has('blue_autopilot')) throw new Error(profile + ' 不应拥有派发器')
  if (scoped.has('blue_task_approve')) throw new Error(profile + ' 不应拥有审批权')
}

store.close()
console.log('✓ 工具冒烟测试通过：' + tools.size + ' 个工具，任务/报告/扫描/角色裁剪链路正常')
