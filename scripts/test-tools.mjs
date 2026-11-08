/**
 * 无 DSH 启动的工具冒烟测试：用假 ctx 跑一遍事实库 + 工具编排。
 *
 * 运行：node scripts/test-tools.mjs
 */
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { apply } from '../lib/tools.js'
import { BlueStore } from '../lib/store.js'

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

if (tools.size !== 28) {
  throw new Error('工具数量不是 28：' + tools.size)
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
const alert = await call('blue_alert_ingest', { title: 'WebShell 上传', severity: 'critical', source: 'waf', raw: 'POST /upload' })
if (!alert.ok || alert.ingested !== 1) throw new Error('alert_ingest 失败')
const finding = await call('blue_finding_add', {
  title: '上传点无校验', severity: 'high', category: 'upload', asset_id: asset.asset.id, evidence: 'POST /upload',
})
const fixed = await call('blue_finding_update', {
  id: finding.finding.id, status: 'fixed', evidence: '复测：上传 .php 返回 403',
})
if (!fixed.ok || fixed.finding.status !== 'fixed') throw new Error('finding_update 失败')
await call('blue_ioc_add', { type: 'ip', value: '203.0.113.9', confidence: 'high', source: 'waf' })

const scan = await call('blue_log_scan', {
  text: '203.0.113.9 - - [x] "POST /upload HTTP/1.1" 200 1234 eval($_POST["x"]) union select 1',
})
if (scan.risk !== 'critical' && scan.risk !== 'high') throw new Error('log_scan 未识别特征：' + scan.risk)

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
  if (scoped.size === 0 || scoped.size >= 28) throw new Error(profile + ' 工具裁剪异常：' + scoped.size)
  if (!scoped.has('blue_task_update')) throw new Error(profile + ' 缺少任务回收工具')
  if (scoped.has('blue_autopilot')) throw new Error(profile + ' 不应拥有派发器')
}

store.close()
console.log('✓ 工具冒烟测试通过：' + tools.size + ' 个工具，任务/报告/扫描/角色裁剪链路正常')
