/** 2.0 控制台兼容视图（M5）。 */
import { buildReport } from '../app/reports/service.js'
import { listControls } from '../app/controls/service.js'
import { buildRiskGraph } from '../app/risk/service.js'
import { protectionStatus } from '../app/onboarding/service.js'
import { cveSummary, listCves } from '../domain/cve/pack.js'

function statsOf(store, engagementId) {
  const base = store.engagements.stats(engagementId)
  const tasks = store.tasks.counts(engagementId)
  const decoys = store.decoys.list(engagementId)
  return {
    ...base,
    tasks_active: Number(tasks.dispatched || 0) + Number(tasks.running || 0),
    tasks_queued: Number(tasks.queued || 0),
    tasks_pending_approval: Number(tasks.pending_approval || 0),
    tasks_done: Number(tasks.done || 0),
    tasks_blocked: Number(tasks.blocked || 0),
    decoys_active: decoys.filter((item) => item.status === 'active').length,
    decoys_planned: decoys.filter((item) => item.status === 'planned').length,
  }
}

export function listEngagements(store) {
  return store.engagements.list().map((item) => ({
    id: item.id,
    name: item.name,
    scope: item.scope,
    status: item.status,
    created_at: item.created_at,
    stats: statsOf(store, item.id),
  }))
}

function bindingKey(session) {
  return 'ui:binding:' + session
}

export function bindSession(store, session, engagementId) {
  if (typeof session !== 'string' || session === '') return
  store.db.setMeta(bindingKey(session), engagementId)
}

export function resolveEngagement(store, request = {}) {
  const explicit = typeof request.engagement === 'string' ? request.engagement.trim() : ''
  if (explicit !== '') return store.engagements.get(explicit)
  const session = typeof request.session === 'string' ? request.session : ''
  if (session !== '') {
    const bound = store.db.getMeta(bindingKey(session), '')
    if (typeof bound === 'string' && bound !== '') {
      const hit = store.engagements.get(bound)
      if (hit !== null) return hit
      throw new Error('会话绑定的防守目标已不存在：' + bound)
    }
  }
  const active = store.engagements.list().filter((item) => item.status === 'active')
  return active.length > 0 ? active[0] : null
}

function slotsOf(store, engagementId) {
  const value = Number(store.db.getMeta('autopilot:slots:' + engagementId, 3))
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 1), 8) : 3
}

export function toLegacySnapshot(store, ctx, request = {}) {
  const engagement = resolveEngagement(store, request)
  const mode = ctx.get?.('blueTeamModeV3') ?? null
  if (engagement === null) {
    return {
      ok: true,
      engagement: null,
      engagements: listEngagements(store),
      version: mode?.version ?? null,
      skills: mode?.skills ?? 0,
      audit: null,
      controls: { rows: [], total: 0, passed: 0, failed: 0, unknown: 0, score: 0 },
      telemetry: [],
      responses: [],
      detection_rules: [],
      cve: { summary: cveSummary(), items: [] },
      graph: { summary: { assets: 0, exposed_assets: 0, cve_matches: 0, edges: 0, high_risk_assets: 0, unverified_matches: 0 }, assets: [], cves: [], edges: [] },
      note: '还没有绑定防守目标。可以在控制台新建，或在会话里调用 blue_engagement_open。',
      protection: null,
    }
  }
  const id = engagement.id
  const stats = statsOf(store, id)
  const maxSlots = slotsOf(store, id)
  const control = listControls(store, id)
  return {
    ok: true,
    engagement: {
      id,
      name: engagement.name,
      scope: engagement.scope,
      note: engagement.note,
      status: engagement.status,
      created_at: engagement.created_at,
      stats,
    },
    engagements: listEngagements(store),
    stats,
    protection: protectionStatus(store, id),
    slots: { max: maxSlots, active: stats.tasks_active, queued: stats.tasks_queued },
    assets: store.facts.queryAssets(id, { limit: 80 }),
    alerts: store.facts.listAlerts(id, { limit: 80 }),
    findings: store.facts.listFindings(id, { limit: 80 }),
    iocs: store.facts.listIocs(id, { limit: 120 }),
    incidents: store.incidents.list(id, { limit: 120 }),
    decisions: store.decisions.list(id, { limit: 80 }),
    decoys: store.decoys.list(id, { limit: 120 }),
    decoy_hits: store.decoys.listHits(id, { limit: 200 }),
    tasks: store.tasks.list(id, { limit: 120 }),
    timeline: store.timeline.list(id, 40),
    audit: store.evidenceRepo.verify(id),
    controls: {
      rows: control.controls,
      total: control.score.total,
      passed: control.score.pass,
      failed: control.score.fail,
      unknown: control.score.unknown,
      score: control.score.percent,
    },
    telemetry: store.telemetry.listSources(id),
    responses: store.responses.list(id, { limit: 80 }),
    detection_rules: store.detection.list(id),
    cve: { summary: cveSummary(), items: listCves() },
    graph: buildRiskGraph(store, id),
    report_markdown: buildReport(store, id),
    version: mode?.version ?? null,
    skills: mode?.skills ?? 0,
    data_root: mode?.root ?? store.root,
  }
}
