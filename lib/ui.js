/**
 * dsh-blue-team-mode —— 右侧栏控制台的 Host 半侧
 *
 * 提供 `POST /blue/api` 同源 JSON 桥接：
 *   · 读：态势、资产、告警、发现、IOC、任务、时间线、报告、技能/版本；
 *   · 写：绑定/新建防守目标、研判告警、更新发现、建任务、领取/完成/阻塞任务、
 *         登记 IOC/资产、调整自主派发并发。
 *
 * 浏览器半侧不直接碰 SQLite；所有写入仍走 `ctx.blueTeam`，与智能体工具共享同一份事实。
 */
import { inferRisk, initialStatusForRisk, planCandidates } from './plan.js'
import { buildTaskSpec } from './taskspec.js'
import { readBindings, writeBindings } from './bindings.js'
import { ROLE_PROMPTS, buildTaskPrompt, normalizeRole, presetForRole, roleTitle } from './playbooks.js'

/** Cordis 插件名。 */
export const name = 'blue-ui'

/** 硬依赖：事实库 + 浏览器 HTTP 载体。 */
export const inject = ['blueTeam', 'webServer']

const MAX_BODY_BYTES = 4 * 1024 * 1024

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sameOrigin(req) {
  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin === 'string' && origin !== '') {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  const remote = req.socket && req.socket.remoteAddress ? String(req.socket.remoteAddress) : ''
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
}

function listEngagements(store) {
  return store.listEngagements().map((item) => ({
    id: item.id,
    name: item.name,
    scope: item.scope,
    status: item.status,
    created_at: item.created_at,
    stats: item.stats,
  }))
}

function resolveEngagement(store, request) {
  const explicit = typeof request.engagement === 'string' ? request.engagement.trim() : ''
  if (explicit !== '') return store.getEngagement(explicit)
  const session = typeof request.session === 'string' ? request.session : ''
  if (session !== '') {
    const id = readBindings(store.root)[session]
    if (typeof id === 'string' && id !== '') {
      const hit = store.getEngagement(id)
      if (hit !== null) return hit
      // 会话已绑定但目标不存在：不要静默切到别的目标。
      throw new Error('会话绑定的防守目标已不存在：' + id)
    }
  }
  const active = store.listEngagements().filter((item) => item.status === 'active')
  return active.length > 0 ? active[0] : null
}

function slotsOf(store, engagementId) {
  const value = Number(store.getMeta('slots:' + engagementId, 3))
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 1), 8) : 3
}

function snapshot(ctx, store, request) {
  const engagement = resolveEngagement(store, request)
  if (engagement === null) {
    return {
      ok: true,
      engagement: null,
      engagements: listEngagements(store),
      version: ctx.get('blueTeamMode')?.version ?? null,
      skills: ctx.get('blueTeamMode')?.skills ?? 0,
      note: '还没有绑定防守目标。可以在控制台新建，或在会话里调用 blue_engagement_open。',
    }
  }
  const stats = store.stats(engagement.id)
  const maxSlots = slotsOf(store, engagement.id)
  return {
    ok: true,
    engagement: {
      id: engagement.id,
      name: engagement.name,
      scope: engagement.scope,
      note: engagement.note,
      status: engagement.status,
      created_at: engagement.created_at,
      stats,
    },
    engagements: listEngagements(store),
    stats,
    slots: { max: maxSlots, active: stats.tasks_active, queued: stats.tasks_queued },
    assets: store.queryAssets(engagement.id, { limit: 80 }),
    alerts: store.listAlerts(engagement.id, { limit: 80 }),
    findings: store.listFindings(engagement.id, { limit: 80 }),
    iocs: store.listIocs(engagement.id, { limit: 120 }),
    incidents: store.listIncidents(engagement.id, { limit: 120 }),
    decisions: store.listDecisions(engagement.id, { limit: 80 }),
    decoys: store.listDecoys(engagement.id, { limit: 120 }),
    decoy_hits: store.listDecoyHits(engagement.id, { limit: 200 }),
    tasks: store.listTasks(engagement.id, { limit: 120 }),
    timeline: store.listTimeline(engagement.id, 40),
    version: ctx.get('blueTeamMode')?.version ?? null,
    skills: ctx.get('blueTeamMode')?.skills ?? 0,
    data_root: ctx.get('blueTeamMode')?.root ?? store.root,
  }
}

async function handle(ctx, store, request) {
  const op = typeof request.op === 'string' ? request.op : ''
  if (op === 'overview') return snapshot(ctx, store, request)

  if (op === 'clientGraph') {
    const service = ctx.get('clientModules')
    return { ok: true, graph: service && typeof service.graph === 'function' ? service.graph() : null }
  }

  if (op === 'openEngagement') {
    const name = typeof request.name === 'string' ? request.name.trim() : ''
    if (name === '') throw new Error('name 不能为空')
    const scope = Array.isArray(request.scope)
      ? request.scope
      : typeof request.scope === 'string' && request.scope.trim() !== ''
        ? request.scope.split(/[\s,]+/).filter(Boolean)
        : []
    const engagement = store.openEngagement(name, scope, typeof request.note === 'string' ? request.note : '')
    const session = typeof request.session === 'string' ? request.session : ''
    if (session !== '') {
      const map = readBindings(store.root)
      map[session] = engagement.id
      writeBindings(store.root, map)
    }
    return snapshot(ctx, store, { ...request, engagement: engagement.id })
  }

  if (op === 'bindEngagement') {
    const id = typeof request.engagement === 'string' ? request.engagement : ''
    const engagement = store.getEngagement(id)
    if (engagement === null) throw new Error('防守目标不存在：' + id)
    const session = typeof request.session === 'string' ? request.session : ''
    if (session !== '') {
      const map = readBindings(store.root)
      map[session] = engagement.id
      writeBindings(store.root, map)
    }
    return snapshot(ctx, store, { ...request, engagement: engagement.id })
  }

  const engagement = resolveEngagement(store, request)
  if (engagement === null) throw new Error('还没有绑定防守目标')
  const id = engagement.id

  if (op === 'report') {
    return { ok: true, markdown: store.report(id) }
  }

  if (op === 'plan') {
    const candidates = planCandidates(store, id)
    const tasks = candidates.map((candidate) => store.createTask(id, { ...candidate, actor: 'console' }))
    return { ok: true, created: tasks.length, tasks, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'claim') {
    const taskId = typeof request.task === 'string' ? request.task : ''
    const task = store.getTask(taskId)
    if (task === null || task.engagement_id !== id) throw new Error('任务不存在：' + taskId)
    const updated = store.updateTask(taskId, { status: 'dispatched', assignee: task.role, actor: 'console', note: 'console claim' })
    const role = normalizeRole(updated.role)
    return {
      ok: true,
      task: updated,
      role_title: roleTitle(role),
      agent_preset: presetForRole(role),
      prompt: buildTaskPrompt(updated, ROLE_PROMPTS[role]),
      task_spec: buildTaskSpec(updated),
      note: '把 prompt 交给指挥官，让它原样调用 subagent；控制台不能代替 Agent 发起委派。',
    }
  }

  if (op === 'updateTask') {
    const taskId = typeof request.task === 'string' ? request.task : ''
    const task = store.getTask(taskId)
    if (task === null || task.engagement_id !== id) throw new Error('任务不存在：' + taskId)
    const updated = store.updateTask(taskId, {
      status: typeof request.status === 'string' ? request.status : task.status,
      result: typeof request.result === 'string' ? request.result : task.result,
      note: typeof request.note === 'string' ? request.note : task.note,
      actor: 'console',
    })
    return { ok: true, task: updated, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'approveTask') {
    const taskId = typeof request.task === 'string' ? request.task : ''
    const task = store.getTask(taskId)
    if (task === null || task.engagement_id !== id) throw new Error('任务不存在：' + taskId)
    const updated = store.approveTask(taskId, {
      actor: typeof request.actor === 'string' && request.actor.trim() !== '' ? request.actor : 'console',
      note: typeof request.note === 'string' ? request.note : 'console approved',
    })
    return { ok: true, task: updated, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'createTask') {
    const title = typeof request.title === 'string' ? request.title.trim() : ''
    if (title === '') throw new Error('title 不能为空')
    const role = normalizeRole(request.role)
    const risk = inferRisk({ ...request, role, title })
    const task = store.createTask(id, {
      role,
      title,
      brief: typeof request.brief === 'string' ? request.brief : '',
      priority: typeof request.priority === 'string' ? request.priority : 'P2',
      acceptance: typeof request.acceptance === 'string' ? request.acceptance : '',
      risk_level: risk,
      requires_approval: risk === 'high',
      status: initialStatusForRisk(risk),
      actor: 'console',
    })
    return { ok: true, task, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'triageAlert') {
    const alertId = typeof request.alert === 'string' ? request.alert : ''
    const alert = store.updateAlert(alertId, {
      status: typeof request.status === 'string' ? request.status : undefined,
      severity: typeof request.severity === 'string' ? request.severity : undefined,
      confidence: typeof request.confidence === 'string' ? request.confidence : undefined,
      task_id: typeof request.task_id === 'string' ? request.task_id : undefined,
      assignee: typeof request.assignee === 'string' ? request.assignee : undefined,
      note: typeof request.note === 'string' ? request.note : undefined,
      actor: 'console',
    })
    return { ok: true, alert, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'updateFinding') {
    const findingId = typeof request.finding === 'string' ? request.finding : ''
    const finding = store.updateFinding(findingId, {
      status: typeof request.status === 'string' ? request.status : undefined,
      severity: typeof request.severity === 'string' ? request.severity : undefined,
      confidence: typeof request.confidence === 'string' ? request.confidence : undefined,
      source: typeof request.source === 'string' ? request.source : undefined,
      task_id: typeof request.task_id === 'string' ? request.task_id : undefined,
      evidence: typeof request.evidence === 'string' ? request.evidence : undefined,
      recommendation: typeof request.recommendation === 'string' ? request.recommendation : undefined,
      actor: 'console',
    })
    return { ok: true, finding, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'addIoc') {
    const value = typeof request.value === 'string' ? request.value.trim() : ''
    if (value === '') throw new Error('value 不能为空')
    const ioc = store.addIoc(id, {
      type: typeof request.type === 'string' ? request.type : 'ip',
      value,
      confidence: typeof request.confidence === 'string' ? request.confidence : 'medium',
      source: typeof request.source === 'string' ? request.source : 'console',
      note: typeof request.note === 'string' ? request.note : '',
    })
    return { ok: true, ioc, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'addAsset') {
    const name = typeof request.name === 'string' ? request.name.trim() : ''
    if (name === '') throw new Error('name 不能为空')
    const asset = store.addAsset(id, {
      name,
      address: typeof request.address === 'string' ? request.address : '',
      kind: typeof request.kind === 'string' ? request.kind : 'host',
      port: Number.isInteger(request.port) ? request.port : undefined,
      service: typeof request.service === 'string' ? request.service : '',
      criticality: typeof request.criticality === 'string' ? request.criticality : 'medium',
      owner: typeof request.owner === 'string' ? request.owner : '',
      evidence: typeof request.evidence === 'string' ? request.evidence : 'console',
    })
    return { ok: true, asset, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'addFinding') {
    const title = typeof request.title === 'string' ? request.title.trim() : ''
    if (title === '') throw new Error('title 不能为空')
    const finding = store.addFinding(id, {
      title,
      severity: typeof request.severity === 'string' ? request.severity : 'medium',
      category: typeof request.category === 'string' ? request.category : 'other',
      confidence: typeof request.confidence === 'string' ? request.confidence : 'medium',
      source: typeof request.source === 'string' ? request.source : 'console',
      task_id: typeof request.task_id === 'string' ? request.task_id : null,
      evidence: typeof request.evidence === 'string' ? request.evidence : 'console',
      recommendation: typeof request.recommendation === 'string' ? request.recommendation : '',
      actor: 'console',
    })
    return { ok: true, finding, snapshot: snapshot(ctx, store, request) }
  }

  if (op === 'setSlots') {
    const value = Number(request.slots)
    const next = Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : 3, 1), 8)
    store.setMeta('slots:' + id, next)
    store.addTimeline(id, { actor: 'console', action: 'autopilot_slots', target: engagement.name, detail: `max=${next}` })
    return { ok: true, slots: { max: next }, snapshot: snapshot(ctx, store, request) }
  }

  throw new Error('未知 op：' + op)
}

export function apply(ctx) {
  const store = ctx.blueTeam
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/blue/api',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'POST only' })
        return
      }
      if (!sameOrigin(req)) {
        sendJson(res, 403, { ok: false, error: 'cross-origin request rejected' })
        return
      }
      try {
        const raw = await readBody(req)
        const text = raw.trim()
        const request = text === '' ? {} : JSON.parse(text)
        if (request === null || typeof request !== 'object' || Array.isArray(request)) {
          throw new Error('请求体必须是 JSON 对象')
        }
        sendJson(res, 200, await handle(ctx, store, request))
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error && error.message ? error.message : String(error) })
      }
    },
  }))
}

export default { name, inject, apply }
