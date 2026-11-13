/**
 * UI 半侧离线测试：Host 路由 + Client 注册逻辑。
 *
 * 运行：node scripts/test-ui.mjs
 */
import { PassThrough } from 'node:stream'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { BlueStore } from '../lib/store.js'
import { apply as applyHost } from '../lib/ui.js'
import { writeBindings } from '../lib/bindings.js'

const root = fileURLToPath(new URL('../.tmp/ui-test', import.meta.url))
rmSync(root, { recursive: true, force: true })
const store = new BlueStore(root)
const engagement = store.openEngagement('控制台测试', ['10.10.0.0/24'])
store.addAsset(engagement.id, { name: 'web01', address: '10.10.0.5', kind: 'web', port: 80, criticality: 'critical' })
store.addAlert(engagement.id, { title: 'WebShell 上传', severity: 'critical', source: 'waf', raw: 'POST /upload' })
store.addFinding(engagement.id, { title: '上传点无校验', severity: 'high', category: 'upload', evidence: 'POST /upload' })
store.createTask(engagement.id, { role: 'ir', title: '处置上传点', priority: 'P0', brief: 'x' })

const routes = []
const ctx = {
  blueTeam: store,
  webServer: {
    register(route) { routes.push(route); return () => {} },
  },
  effect(fn) { fn() },
  get(name) { return name === 'blueTeamMode' ? { version: '1.0.0', skills: 16, root } : undefined },
}
applyHost(ctx)
if (routes.length !== 1 || routes[0].path !== '/blue/api') throw new Error('Host UI 路由未注册')

function callApi(payload) {
  return new Promise((resolve, reject) => {
    const req = new PassThrough()
    req.method = 'POST'
    req.headers = { origin: 'http://127.0.0.1:51074', host: '127.0.0.1:51074' }
    req.socket = { remoteAddress: '127.0.0.1' }
    let status = 0
    const res = {
      writeHead(code) { status = code },
      end(chunk) {
        try { resolve({ status, body: JSON.parse(String(chunk ?? '')) }) } catch (error) { reject(error) }
      },
    }
    routes[0].handler(req, res).catch(reject)
    req.end(JSON.stringify(payload))
  })
}

const overview = await callApi({ op: 'overview', session: 'S1' })
if (overview.status !== 200 || !overview.body.ok || overview.body.engagement.name !== '控制台测试') {
  throw new Error('overview 失败：' + JSON.stringify(overview.body))
}
if (overview.body.alerts.length !== 1 || overview.body.assets.length !== 1) throw new Error('overview 数据不完整')
const uiIncident = store.addIncident(engagement.id, { title: '控制台案件', severity: 'high' })
const updatedIncident = await callApi({ op: 'updateIncident', session: 'S1', incident: uiIncident.id, status: 'contained' })
if (!updatedIncident.body.ok || updatedIncident.body.incident.status !== 'contained') throw new Error('updateIncident 失败')
if (!updatedIncident.body.snapshot.incidents.some((item) => item.id === uiIncident.id && item.status === 'contained')) {
  throw new Error('updateIncident 未刷新 snapshot')
}

const opened = await callApi({ op: 'openEngagement', session: 'S1', name: '控制台测试二', scope: '10.0.0.0/24' })
if (!opened.body.ok || opened.body.engagement.name !== '控制台测试二') throw new Error('openEngagement 失败')
const bound = await callApi({ op: 'bindEngagement', session: 'S1', engagement: engagement.id })
if (!bound.body.ok || bound.body.engagement.name !== '控制台测试') throw new Error('bindEngagement 失败')

const plan = await callApi({ op: 'plan', session: 'S1' })
if (!plan.body.ok || plan.body.created < 1) throw new Error('plan 失败')

const tasks = plan.body.snapshot.tasks
const queued = tasks.find((task) => task.status === 'queued')
if (!queued) throw new Error('plan 未生成排队任务')
const claim = await callApi({ op: 'claim', session: 'S1', task: queued.id })
if (!claim.body.ok || !claim.body.prompt || claim.body.task.status !== 'dispatched') throw new Error('claim 失败')

const alert = plan.body.snapshot.alerts[0]
const triage = await callApi({ op: 'triageAlert', session: 'S1', alert: alert.id, status: 'investigating', note: '确认' })
if (!triage.body.ok || triage.body.alert.status !== 'investigating') throw new Error('triageAlert 失败')

const done = await callApi({ op: 'updateTask', session: 'S1', task: claim.body.task.id, status: 'done', result: '已处置' })
if (!done.body.ok || done.body.task.status !== 'done') throw new Error('updateTask 失败')

const report = await callApi({ op: 'report', session: 'S1' })
if (!report.body.ok || !String(report.body.markdown).includes('# 蓝队防守报告')) throw new Error('report 失败')

// bug 回归：会话绑定到不存在的目标时不能静默切到其他目标。
writeBindings(root, { S1: 'ENG-MISSING' })
const stale = await callApi({ op: 'overview', session: 'S1' })
if (stale.status !== 400 || !String(stale.body.error).includes('已不存在')) {
  throw new Error('失效会话绑定未明确报错：' + JSON.stringify(stale))
}
writeBindings(root, { S1: engagement.id })

/* —— Client 注册逻辑 —— */
const bodies = []
const ReactStub = {
  Fragment: 'Fragment',
  createElement(type, props, ...children) { return { type, props: Object.assign({}, props || {}, { children }) } },
  useState(value) { return [value, () => {}] },
  useReducer(init) { return [typeof init === 'function' ? init() : init, () => {}] },
  useEffect() {},
}
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      const module = definition.factory((name) => {
        if (name === 'react') return ReactStub
        throw new Error('unexpected require: ' + name)
      })
      globalThis.__blueClient = module
    },
  },
}
await import('../lib/client.js?test=' + Date.now())
const client = globalThis.__blueClient
if (typeof client.apply !== 'function') throw new Error('client 未导出 apply')
const clientCtx = {
  effect(fn) { fn() },
  locale: {
    bind() { return (key, params) => (params ? key + JSON.stringify(params) : key) },
    register() { return () => {} },
  },
  slots: {
    inject(_name, callback) { callback(); return () => {} },
    register(definition, component) { bodies.push({ definition, component }); return () => {} },
  },
}
client.apply(clientCtx)
if (!bodies.some((item) => item.definition.name === 'shell.overlay' && item.definition.id === 'blue-console')) {
  throw new Error('独立 shell.overlay 面板未注册')
}
if (bodies.some((item) => item.definition.name === 'sidebar.right.pane.tab')) {
  throw new Error('仍注册了文件式 tab body')
}
if (bodies.some((item) => item.definition.name === 'sidebar.footer.action')) {
  throw new Error('左下角入口仍在注册')
}
const header = bodies.find((item) => item.definition.name === 'conversation.session.header.actions')
if (!header) throw new Error('header action 未注册')
const headerElement = header.component({ sessionId: 'S1' })
if (typeof headerElement.type !== 'function') throw new Error('header 组件无效')
const headerButton = headerElement.type(headerElement.props)
if (typeof headerButton.props.onClick !== 'function') throw new Error('header 按钮不可点击')
headerButton.props.onClick()

store.close()
console.log('✓ UI 冒烟测试通过：/blue/api + 独立 shell.overlay 面板 + 头部入口/全面浏览')
