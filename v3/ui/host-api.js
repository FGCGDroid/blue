/** 3.0 Host API（M5）：2.0 控制台兼容 + 3.x 快照。 */
import { join } from 'node:path'
import { runAutopilot } from '../app/tasks/autopilot.js'
import { createTask } from '../app/tasks/service.js'
import { triageAlert } from '../app/alerts/triage.js'
import { addAsset, queryAssets } from '../app/assets/service.js'
import { addFinding, updateFinding } from '../app/findings/service.js'
import { addIoc } from '../app/iocs/service.js'
import { campaign as cveCampaign } from '../app/cve/service.js'
import { buildEvidenceBundle } from '../app/evidence/export.js'
import { evaluateControls } from '../app/controls/service.js'
import { scanEvents, rulesFor } from '../app/detection/service.js'
import { bindSession, resolveEngagement, toLegacySnapshot } from './legacy-view.js'
import { protectionStatus, startProtectionWithGateway } from '../app/onboarding/service.js'
import { learnAlert } from '../app/knowledge/service.js'
import { defendEntry } from '../app/knowledge/service.js'

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

function engagementIdOf(store, request) {
  const engagement = resolveEngagement(store, request)
  if (engagement === null) throw new Error('还没有绑定防守目标')
  return engagement.id
}

function telemetryFingerprint(sourceName, ruleKey, event = {}) {
  const at = Date.parse(String(event.at || event.time || event.ts || ''))
  const bucket = Number.isFinite(at) ? Math.floor(at / 60000) : Math.floor(Date.now() / 60000)
  return [
    sourceName,
    ruleKey,
    String(event.method || event.http?.method || '').toUpperCase(),
    String(event.path || event.url || event.http?.path || ''),
    String(event.status ?? event.status_code ?? event.http?.status ?? event.http?.status_code ?? ''),
    String(event.remote || event.src_ip || ''),
    String(event.user_agent || event.http?.user_agent || '').slice(0, 80),
    bucket,
  ].join('|')
}

function telemetryPoll(store, engagementId, request = {}) {
  const sources = store.telemetry.listSources(engagementId)
    .filter((source) => source.status !== 'retired')
    .filter((source) => !request.name || source.name === request.name)
  const rules = rulesFor(store, engagementId).filter((rule) => rule.enabled)
  const maxAlerts = Math.min(Math.max(Number(request.max_alerts) || 100, 1), 1000)
  const results = []
  for (const source of sources) {
    try {
      const loaded = store.readJsonl(source.path, { maxEvents: 20000 })
      const start = Math.min(source.cursor, loaded.events.length)
      const events = loaded.events.slice(start)
      const result = scanEvents(rules, events, { maxHits: maxAlerts })
      const alerts = []
      let updated = 0
      for (const hit of result.hits) {
        const alert = store.facts.addAlert(engagementId, {
          title: `检测命中：${hit.title}`,
          severity: hit.severity,
          source: 'telemetry:' + source.name,
          confidence: 'high',
          fingerprint: telemetryFingerprint(source.name, hit.rule, hit.event),
          external_id: `${source.name}:${start}:${hit.rule}:${JSON.stringify(hit.event).slice(0, 200)}`,
          event_time: String(hit.event.at || hit.event.time || hit.event.ts || ''),
          raw: JSON.stringify(hit.event).slice(0, 8000),
          actor: 'console',
        })
        if (alert.inserted) {
          alerts.push(alert)
          try { learnAlert(store, engagementId, alert) } catch { /* 知识库不阻塞轮询 */ }
        } else updated += 1
      }
      store.telemetry.saveCursor(source.id, {
        cursor: start + events.length,
        events: Number(source.events_total) + events.length,
        alerts: Number(source.alerts_total) + alerts.length,
        last_event_at: events.length > 0 ? new Date().toISOString() : source.last_event_at,
      })
      results.push({ ok: true, name: source.name, read: events.length, hits: result.hits.length, alerts: alerts.length, updated })
    } catch (error) {
      store.telemetry.markError(source.id, error.message)
      results.push({ ok: false, name: source.name, error: error.message })
    }
  }
  return { results, sources: store.telemetry.listSources(engagementId) }
}

export async function handleApi(ctx, store, request = {}) {
  const op = typeof request.op === 'string' ? request.op : ''
  if (op === 'overview') return toLegacySnapshot(store, ctx, request)
  if (op === 'clientGraph') {
    const service = ctx.get?.('clientModules')
    return { ok: true, graph: service && typeof service.graph === 'function' ? service.graph() : null }
  }

  if (op === 'openEngagement') {
    const name = String(request.name || '').trim()
    if (name === '') throw new Error('name 不能为空')
    const scope = Array.isArray(request.scope)
      ? request.scope
      : String(request.scope || '').split(/[\s,]+/).filter(Boolean)
    const engagement = store.engagements.open(name, scope, String(request.note || ''))
    bindSession(store, request.session, engagement.id)
    return toLegacySnapshot(store, ctx, { ...request, engagement: engagement.id })
  }

  if (op === 'protectStart') {
    const result = await startProtectionWithGateway(store, ctx.get?.('blueGateway'), request)
    bindSession(store, request.session, result.engagement.id)
    return { ok: true, ...result, snapshot: toLegacySnapshot(store, ctx, { ...request, engagement: result.engagement.id }) }
  }

  if (op === 'bindEngagement') {
    const engagement = store.engagements.get(String(request.engagement || ''))
    if (engagement === null) throw new Error('防守目标不存在：' + request.engagement)
    bindSession(store, request.session, engagement.id)
    return toLegacySnapshot(store, ctx, { ...request, engagement: engagement.id })
  }

  const id = engagementIdOf(store, request)
  const snapshot = () => toLegacySnapshot(store, ctx, { ...request, engagement: id })

  if (op === 'protectStatus') return { ok: true, ...protectionStatus(store, id) }
  if (op === 'knowledgeList') return { ok: true, entries: store.knowledge.list(id, { limit: request.limit }) }
  if (op === 'knowledgeDefend') {
    const result = defendEntry(store, id, String(request.entry || request.id || ''))
    if (result === null) throw new Error('知识条目不存在')
    return { ok: true, ...result }
  }

  if (op === 'report') return { ok: true, markdown: snapshot().report_markdown }
  if (op === 'plan') {
    const result = await runAutopilot(store, id, { action: 'plan', limit: request.limit })
    return { ok: true, created: result.created ?? result.tasks?.length ?? 0, tasks: result.tasks ?? [], snapshot: snapshot() }
  }
  if (op === 'claim') {
    const task = store.tasks.get(String(request.task || ''))
    if (task === null || task.engagement_id !== id) throw new Error('任务不存在：' + request.task)
    if (task.status === 'pending_approval') throw new Error('高风险任务未审批，不能领取')
    const updated = store.tasks.update(task.id, { status: 'dispatched', assignee: task.role, actor: 'console', note: 'console claim' })
    return { ok: true, task: updated, snapshot: snapshot() }
  }
  if (op === 'updateTask') {
    const task = store.tasks.get(String(request.task || request.id || ''))
    if (task === null || task.engagement_id !== id) throw new Error('任务不存在')
    const updated = store.tasks.update(task.id, {
      status: request.status,
      result: request.result,
      note: request.note,
      assignee: request.assignee,
      actor: 'console',
    })
    return { ok: true, task: updated, snapshot: snapshot() }
  }
  if (op === 'approveTask') {
    const task = store.tasks.get(String(request.task || request.task_id || ''))
    if (task === null || task.engagement_id !== id) throw new Error('任务不存在')
    const updated = store.tasks.approve(task.id, { actor: String(request.actor || 'console'), note: String(request.note || 'console approved') })
    return { ok: true, task: updated, snapshot: snapshot() }
  }
  if (op === 'createTask') {
    const result = createTask(store, id, request.task ?? request)
    return { ok: true, task: result.task, snapshot: snapshot() }
  }
  if (op === 'triageAlert') {
    const result = triageAlert(store, id, request.alert ?? request)
    return { ok: true, alert: result.alert, task: result.task, snapshot: snapshot() }
  }
  if (op === 'updateFinding') {
    const result = updateFinding(store, id, request.finding ?? request)
    return { ok: true, finding: result.finding, snapshot: snapshot() }
  }
  if (op === 'addFinding') {
    const result = addFinding(store, id, request.finding ?? request)
    return { ok: true, finding: result.finding, snapshot: snapshot() }
  }
  if (op === 'addIoc') {
    const result = addIoc(store, id, request.ioc ?? request)
    return { ok: true, ioc: result.ioc, snapshot: snapshot() }
  }
  if (op === 'addAsset') {
    const result = addAsset(store, id, request.asset ?? request)
    return { ok: true, asset: result.asset, snapshot: snapshot() }
  }
  if (op === 'queryAssets') {
    return { ok: true, assets: queryAssets(store, id, request), snapshot: snapshot() }
  }
  if (op === 'controlScan') {
    return { ok: true, ...evaluateControls(store, id), snapshot: snapshot() }
  }
  if (op === 'telemetryPoll') {
    return { ok: true, ...telemetryPoll(store, id, request), snapshot: snapshot() }
  }
  if (op === 'updateDecoy') {
    const decoy = store.decoys.get(String(request.decoy || request.id || ''))
    if (decoy === null || decoy.engagement_id !== id) throw new Error('诱饵不存在')
    return { ok: true, decoy: store.decoys.update(decoy.id, request), snapshot: snapshot() }
  }
  if (op === 'syncDecoys') {
    if (request.authorized !== true) throw new Error('拒绝同步：必须显式 authorized=true')
    const requestedPath = String(request.path || '')
    const path = requestedPath || join(store.root, 'decoy-events.jsonl')
    let loaded
    try {
      loaded = store.readJsonl(path, { maxEvents: request.max_events })
    } catch (error) {
      if (requestedPath === '') {
        return {
          ok: true,
          source: path,
          events: 0,
          results: [],
          note: '诱饵事件日志还不存在；等外部诱饵产生事件后再同步。',
          snapshot: snapshot(),
        }
      }
      throw error
    }
    const result = store.decoys.sync(id, loaded.events.slice(0, Math.min(Math.max(Number(request.max_hits) || 200, 1), 1000)))
    return { ok: true, source: loaded.path, results: result, snapshot: snapshot() }
  }
  if (op === 'updateIncident') {
    const incident = store.incidents.get(String(request.incident || request.id || ''))
    if (incident === null || incident.engagement_id !== id) throw new Error('案件不存在')
    return { ok: true, incident: store.incidents.update(incident.id, request), snapshot: snapshot() }
  }
  if (op === 'cveCampaign') {
    return { ok: true, ...cveCampaign(store, id, request), snapshot: snapshot() }
  }
  if (op === 'exportEvidence') {
    return { ok: true, ...buildEvidenceBundle(store, id, { actor: 'console' }), snapshot: snapshot() }
  }
  if (op === 'setSlots') {
    const next = Math.min(Math.max(Number(request.slots) || 3, 1), 8)
    store.db.setMeta('autopilot:slots:' + id, next)
    return { ok: true, slots: { max: next }, snapshot: snapshot() }
  }

  throw new Error('未知 op：' + op)
}

export function registerHostApi(ctx, store, paths = ['/blue/api', '/blue/v3/api']) {
  for (const path of paths) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path,
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
          sendJson(res, 200, await handleApi(ctx, store, request))
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error && error.message ? error.message : String(error) })
        }
      },
    }))
  }
}
