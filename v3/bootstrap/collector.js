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

  async function pollEngagement(engagementId) {
    const sources = store.telemetry.listSources(engagementId).filter((source) => source.status !== 'retired')
    const rules = rulesFor(store, engagementId).filter((rule) => rule.enabled)
    let alerts = 0
    for (const source of sources) {
      try {
        const loaded = store.readJsonl(source.path, { maxEvents: 20000 })
        const start = Math.min(source.cursor, loaded.events.length)
        const raw = loaded.events.slice(start)
        if (raw.length === 0) continue
        let suppress = []
        try { suppress = JSON.parse(store.db.getMeta('collector:suppress_ips', '[]')) } catch { suppress = [] }
        const suppressed = new Set(Array.isArray(suppress) ? suppress.map(String) : [])
        const events = raw.filter((event) => !suppressed.has(String(event.remote || '')))
        const result = scanEvents(rules, events, { maxHits: 200 })
        const created = []
        for (const hit of result.hits) {
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
