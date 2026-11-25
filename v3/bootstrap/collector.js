/** 后台遥测采集器：页面关闭后仍按间隔读取已接入日志并生成告警。 */
import { scanEvents, rulesFor } from '../app/detection/service.js'
import { learnAlert } from '../app/knowledge/service.js'

function fingerprint(source, rule, event) {
  return [source, rule, event.method, event.path || event.canonical_path || event.raw_path,
    event.status ?? event.upstream_status, event.remote, event.at].join('|').slice(0, 500)
}

export function createCollector(store, options = {}) {
  const intervalMs = Math.min(Math.max(Number(options.intervalMs) || 10000, 2000), 60000)
  let timer = null
  let inFlight = false
  let lastRun = null
  let lastAlerts = 0
  let lastError = ''

  const alertSeen = new Map()
  const ruleSeen = new Map()

  async function pollEngagement(engagementId) {
    const sources = store.telemetry.listSources(engagementId).filter((source) => source.status !== 'retired')
    const rules = rulesFor(store, engagementId).filter((rule) => rule.enabled)
    let alerts = 0
    for (const source of sources) {
      try {
        const loaded = store.readJsonl(source.path, { maxEvents: 20000 })
        const len = loaded.events.length
        // 游标到达读取上限或超过文件长度时，回退扫描最近 500 条，避免永久卡死
        const start = source.cursor >= len || source.cursor >= 20000 ? Math.max(0, len - 500) : source.cursor
        const raw = loaded.events.slice(start)
        if (raw.length === 0) continue
        let suppress = []
        try { suppress = JSON.parse(store.db.getMeta('collector:suppress_ips', '[]')) } catch { suppress = [] }
        const suppressed = new Set(Array.isArray(suppress) ? suppress.map(String) : [])
        const events = raw.filter((event) => !suppressed.has(String(event.remote || '')))
        const result = scanEvents(rules, events, { maxHits: 200 })
        const created = []
        for (const hit of result.hits) {
          const ruleKey = String(hit.rule?.key || hit.rule?.rule_key || hit.rule?.name || hit.title || '')
          const dedupeKey = engagementId + '|' + ruleKey + '|' + String(hit.event.remote || '')
          const nowMs = Date.now()
          if (nowMs - (alertSeen.get(dedupeKey) || 0) < 300000) continue
          alertSeen.set(dedupeKey, nowMs)
          const ruleKeyOnly = engagementId + '|' + ruleKey
          if (nowMs - (ruleSeen.get(ruleKeyOnly) || 0) < 60000) continue
          ruleSeen.set(ruleKeyOnly, nowMs)
          if (ruleSeen.size > 2000) ruleSeen.clear()
          if (alertSeen.size > 10000) alertSeen.clear()
          const alert = store.facts.addAlert(engagementId, {
            title: `检测命中：${hit.title}`,
            severity: hit.severity,
            source: 'collector:' + source.name,
            confidence: 'high',
            fingerprint: fingerprint(source.name, hit.rule, hit.event),
            external_id: `${source.name}:${start}:${hit.rule}:${JSON.stringify(hit.event).slice(0, 160)}`,
            event_time: String(hit.event.at || hit.event.time || hit.event.ts || ''),
            raw: JSON.stringify(hit.event).slice(0, 8000),
            actor: 'collector',
          })
          if (alert.inserted) {
            created.push(alert)
            try { learnAlert(store, engagementId, alert) } catch { /* 知识库失败不阻塞采集 */ }
          }
        }
        try { /* decoy hit auto */
          const decoys = store.decoys.list(engagementId).filter((d) => d.status !== 'retired')
          for (const event of raw) {
            const status = Number(event.status || 0)
            if (status !== 200 && status !== 401) continue
            const path = String(event.path || event.url || '').split('?')[0]
            const decoy = decoys.find((d) => {
              const target = String(d.target || '')
              let hitPath = target
              try { if (target.includes('://')) hitPath = new URL(target).pathname } catch { /* ignore */ }
              hitPath = hitPath.replace(/\/$/, '')
              return hitPath !== '' && (path === hitPath || path.startsWith(hitPath + '/'))
            })
            if (decoy === undefined) continue
            store.decoys.addHit(decoy.id, {
              source: 'collector',
              evidence: JSON.stringify(event).slice(0, 2000),
              event_key: `${decoy.id}|${event.remote}|${event.at}|${path}`,
              actor: 'collector',
              severity: 'high',
            })
          }
        } catch { /* 诱饵计数失败不阻塞采集 */ }
        alerts += created.length
        store.telemetry.saveCursor(source.id, {
          cursor: start + raw.length,
          events: Number(source.events_total) + events.length,
          alerts: Number(source.alerts_total) + created.length,
          last_event_at: events.length > 0 ? new Date().toISOString() : source.last_event_at,
        })
      } catch (error) {
        lastError = error?.message ?? String(error)
        try { store.telemetry.markError(source.id, lastError) } catch { /* 忽略 */ }
      }
    }
    return alerts
  }

  async function tick() {
    if (inFlight) return { skipped: true }
    inFlight = true
    try {
      let alerts = 0
      for (const engagement of store.engagements.list().filter((item) => item.status === 'active')) {
        alerts += await pollEngagement(engagement.id)
      }
      lastAlerts = alerts
      lastRun = new Date().toISOString()
      lastError = ''
      return { alerts }
    } finally {
      inFlight = false
    }
  }

  function start() {
    if (timer !== null) return { running: true }
    timer = setInterval(() => { void tick() }, intervalMs)
    timer.unref?.()
    setTimeout(() => { void tick() }, 1000).unref?.()
    return { running: true, interval_ms: intervalMs }
  }

  function stop() {
    if (timer !== null) clearInterval(timer)
    timer = null
    return { running: false }
  }

  function status() {
    return { running: timer !== null, interval_ms: intervalMs, last_run: lastRun, last_alerts: lastAlerts, last_error: lastError }
  }

  return { start, stop, tick, status }
}
