/** 3.0 Host API（M5）：2.0 控制台兼容 + 3.x 快照。 */
import { join } from 'node:path'
import { appendFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'
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
import { REMOTE_BAN, normalizeAllowIps, normalizeTtl } from '../domain/remote/config.js'
import { protectionStatus, startProtectionWithGateway } from '../app/onboarding/service.js'
import { defendEntry, learnAlert, seedTechniqueLibrary } from '../app/knowledge/service.js'
import { openEngagement as openSessionEngagement } from '../app/session/service.js'

const MAX_BODY_BYTES = 4 * 1024 * 1024
const collectorRate = new Map()

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
    const opened = openSessionEngagement(store, { name, scope, note: String(request.note || '') })
    bindSession(store, request.session, opened.engagement.id)
    return { ...toLegacySnapshot(store, ctx, { ...request, engagement: opened.engagement.id }), knowledge: opened.knowledge }
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
  if (op === 'collectorInfo') {
    const host = String(request.host || '').trim()
    const base = host === '' ? '' : (/^https?:\/\//i.test(host) ? host : `http://${host}`)
    const token = store.collectorToken()
    const loopback = /^(127\.0\.0\.1|localhost|\[::1\])(?::|$)/i.test(host)
    return {
      ok: true,
      token,
      endpoint: (base || '') + '/blue/collect',
      download: (base || '') + '/blue/collector.mjs',
      engagement: id,
      log_path: store.collectorLogPath(id),
      allow_ips: store.collectorAllowIps(),
      command: base === '' ? '' : `curl -fsSL '${base}/blue/collector.mjs' -o blue-collector.mjs && BLUE_COLLECTOR_TOKEN='${token}' node blue-collector.mjs --url '${base}' --engagement '${id}' --log /var/log/nginx/access.log`,
      warning: loopback ? '远程服务器访问不到 127.0.0.1；请用反代/隧道，或填服务器可达的 DSH 地址。' : '',
      collector: ctx.get?.('blueCollector')?.status?.() ?? null,
    }
  }
  if (op === 'collectorRotate') {
    const token = store.rotateCollectorToken()
    return { ok: true, token, note: '旧 token 已失效；采集器需要更新环境变量。' }
  }
  if (op === 'collectorSuppress') {
    const list = Array.isArray(request.ips) ? request.ips : String(request.ips || '').split(',')
    const ips = list.map((item) => String(item).trim()).filter((item) => item !== '')
    store.db.setMeta('collector:suppress_ips', JSON.stringify(ips))
    return { ok: true, suppress_ips: ips }
  }
  if (op === 'collectorAllow') {
    return { ok: true, allow_ips: store.setCollectorAllowIps(request.allow_ips || []) }
  }
  if (op === 'knowledgeList') return { ok: true, entries: store.knowledge.list(id, { limit: request.limit }) }
  if (op === 'knowledgeSeed') return { ok: true, ...seedTechniqueLibrary(store, id) }
  if (op === 'remoteInfo') {
    const remote = ctx.get?.('blueRemote')
    if (!remote) return { ok: true, available: false }
    const settings = remote.settings()
    return {
      ok: true,
      available: true,
      ssh: { host: settings.host, user: settings.user, key_path: settings.key_path, port: settings.port },
      cloud: { url: settings.cloud_url, token_set: settings.cloud_token !== '' },
      unattended: {
        host: store.db.getMeta('unattended:host', ''),
        log: store.db.getMeta('unattended:log', ''),
        allow_ips: store.db.getMeta('unattended:allow_ips', ''),
        collector_url: store.db.getMeta('unattended:collector_url', ''),
        webhook: store.db.getMeta('unattended:webhook', ''),
        ttl_min: Number(store.db.getMeta('unattended:ttl', '1800')) / 60,
        digest_hour: Number(store.db.getMeta('unattended:digest_hour', '9')),
      },
      ban: REMOTE_BAN,
    }
  }
  if (op === 'remoteSetup') {
    const remote = ctx.get?.('blueRemote')
    if (!remote) throw new Error('远程服务未加载')
    return { ok: true, ...remote.save(request) }
  }
  if (op === 'remoteTest') {
    const remote = ctx.get?.('blueRemote')
    if (!remote) throw new Error('远程服务未加载')
    return { ok: true, ...(await remote.test(request)) }
  }
  if (op === 'remoteUnattended') {
    const remote = ctx.get?.('blueRemote')
    if (!remote) throw new Error('远程服务未加载')
    const settings = remote.settings()
    const host = String(request.host || settings.host || '').trim()
    if (host === '') throw new Error('先填公网 IP 并保存远程配置')
    const allow = normalizeAllowIps(request.allow_ips)
    if (allow.length === 0) throw new Error('真实封禁必须填白名单 IP（自己的出口 IP），否则可能把自己封掉')
    const collectorUrl = String(request.collector_url || '').trim().replace(/\/+$/, '')
    if (!/^https?:\/\//i.test(collectorUrl)) throw new Error('DSH 地址必须是 http(s):// 开头')
    const ttl = normalizeTtl(request.ttl)
    const task = store.tasks.create(id, {
      role: 'hardening',
      priority: 'P1',
      risk_level: 'high',
      title: '远程无人值守上线：' + host,
      brief: '真实 nftables 封禁，TTL ' + ttl + 's，白名单 ' + allow.join(',') + '；命中上传/XSS/穿越/扫描器/敏感路径即封。',
      acceptance: '确认目标归属、白名单、封禁时长与卸载方式。',
    })
    try {
      store.tasks.approve(task.id, { actor: 'console:owner', note: '控制台一键开启真实封禁（账号主人本人操作）' })
    } catch (error) {
      store.tasks.update(task.id, { status: 'cancelled', result: String(error?.message || error) })
      throw error
    }
    for (const [key, value] of Object.entries({
      host,
      log: String(request.log || REMOTE_BAN.defaultLog),
      allow_ips: allow.join(','),
      collector_url: collectorUrl,
      webhook: String(request.webhook || '').trim(),
      ttl: String(ttl),
      digest_hour: String(Number(request.digest_hour) || 9),
    })) {
      try { store.db.setMeta('unattended:' + key, String(value)) } catch { /* meta 持久化失败不阻塞部署 */ }
    }
    const scopeOf = (e) => {
      const raw = e && e.scope
      if (Array.isArray(raw)) return raw.map(String)
      try { return JSON.parse(raw || '[]').map(String) } catch { return [] }
    }
    const remoteEngagement = store.engagements.list().find((e) => e.status === 'active' && scopeOf(e).some((s) => s.includes(host) || host.includes(s)))
      || store.engagements.open('远程值守：' + host, [host])
    bindSession(store, request.session, remoteEngagement.id)
    const result = await remote.deployUnattended({
      ...request,
      host,
      collector_url: collectorUrl,
      token: store.collectorToken(),
      engagement: remoteEngagement.id,
      enforce: true,
      ttl,
      webhook: String(request.webhook || '').trim(),
      digest_hour: Number(request.digest_hour) || 9,
      allow_ips: allow.join(','),
      log: String(request.log || REMOTE_BAN.defaultLog),
    })
    try {
      store.tasks.update(task.id, {
        status: result.ok === true ? 'done' : 'blocked',
        result: JSON.stringify(result).slice(0, 4000),
      })
    } catch { /* 回填失败不影响部署结果 */ }
    try {
      store.timeline.append(remoteEngagement.id, {
        actor: 'commander',
        action: 'remote_unattended',
        target: host,
        detail: 'task=' + task.id + ' mode=enforce ttl=' + ttl + 's allow=' + allow.join(','),
      })
    } catch { /* ignore */ }
    return {
      ok: result.ok === true,
      task_id: task.id,
      mode: 'enforce',
      ttl,
      allow_ips: allow,
      engagement: remoteEngagement,
      snapshot: toLegacySnapshot(store, ctx, { ...request, engagement: remoteEngagement.id }),
      ...result,
    }
  }
  if (op === 'remoteUnban') {
    const remote = ctx.get?.('blueRemote')
    if (!remote) throw new Error('远程服务未加载')
    const ip = String(request.ip || '').trim()
    const result = await remote.unban({ ip })
    try {
      store.timeline.append(id, {
        actor: 'commander',
        action: 'remote_unban',
        target: ip || 'all',
        detail: 'mode=' + (ip === '' ? 'flush' : 'element') + ' ok=' + (result.ok === true),
      })
    } catch { /* ignore */ }
    return { ok: result.ok === true, ...result }
  }
  if (op === 'remotePrepare') {    const task = store.tasks.create(id, {
      role: 'hardening',
      priority: 'P1',
      risk_level: 'high',
      title: `远程写操作审批：${request.host || 'remote'}`,
      brief: '远程部署采集器/无人值守防御组前，必须由人确认目标、授权和回滚方式。',
      acceptance: '审批人确认目标归属与回滚方案。',
    })
    return { ok: true, task }
  }
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
    const next = Math.min(Math.max(Number(request.slots) || 4, 1), 8)
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
          if (typeof request.host !== 'string') request.host = String(req.headers.host || '')
          sendJson(res, 200, await handleApi(ctx, store, request))
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error && error.message ? error.message : String(error) })
        }
      },
    }))
  }

  // 采集器脚本下载：不含 token，可公开。
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/blue/collector.mjs',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { ok: false, error: 'GET only' })
        return
      }
      try {
        const body = readFileSync(new URL('../infra/remote/assets/blue-collector.mjs', import.meta.url), 'utf8')
        res.writeHead(200, {
          'content-type': 'text/javascript; charset=utf-8',
          'content-length': Buffer.byteLength(body),
          'cache-control': 'no-store',
        })
        res.end(body)
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error && error.message ? error.message : String(error) })
      }
    },
  }))

  // 远程采集器专用入口：不走浏览器同源，只认独立 token。
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/blue/collect',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'POST only' })
        return
      }
      try {
        const remote = String(req.socket?.remoteAddress || '')
        const allow = store.collectorAllowIps()
        if (allow.length > 0 && !allow.includes(remote) && !allow.includes(remote.replace(/^::ffff:/, ''))) {
          sendJson(res, 403, { ok: false, error: 'collector source not allowed' })
          return
        }
        const now = Date.now()
        const bucket = collectorRate.get(remote) || { start: now, count: 0 }
        if (now - bucket.start > 60000) { bucket.start = now; bucket.count = 0 }
        bucket.count += 1
        collectorRate.set(remote, bucket)
        if (bucket.count > 120) {
          sendJson(res, 429, { ok: false, error: 'collector rate limit' })
          return
        }
        const raw = await readBody(req)
        const request = JSON.parse(raw || '{}')
        if (request === null || typeof request !== 'object' || Array.isArray(request)) {
          throw new Error('请求体必须是 JSON 对象')
        }
        const header = String(req.headers.authorization || '')
        const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : String(request.token || ''))
        const expected = Buffer.from(store.collectorToken())
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
          sendJson(res, 401, { ok: false, error: 'bad collector token' })
          return
        }
        const engagement = store.engagements.get(String(request.engagement || ''))
        if (engagement === null || engagement.status !== 'active') {
          sendJson(res, 404, { ok: false, error: 'engagement not active' })
          return
        }
        const events = Array.isArray(request.events) ? request.events.slice(0, 500) : []
        if (events.length === 0) {
          sendJson(res, 400, { ok: false, error: 'events required' })
          return
        }
        const path = store.collectorLogPath(engagement.id)
        appendFileSync(path, events.map((event) => JSON.stringify(event)).join('\n') + '\n', 'utf8')
        store.ensureCollectorSource(engagement.id)
        sendJson(res, 200, { ok: true, accepted: events.length })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error && error.message ? error.message : String(error) })
      }
    },
  }))
}
