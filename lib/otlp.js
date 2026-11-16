/**
 * 最小 OTLP/HTTP JSON 日志接收器。
 * 只接受结构化 JSON，不执行任何 record 内容；token 未配置时路由禁用。
 */
import { createHash } from 'node:crypto'

function scalar(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') return value.stringValue ?? value.intValue ?? value.doubleValue ?? value.boolValue ?? ''
  return ''
}

function attributes(list) {
  const out = {}
  if (!Array.isArray(list)) return out
  for (const item of list) {
    if (item === null || typeof item !== 'object' || typeof item.key !== 'string') continue
    out[item.key] = scalar(item.value)
  }
  return out
}

function isoFromNanos(value) {
  const nanos = Number(value)
  if (!Number.isFinite(nanos) || nanos <= 0) return new Date().toISOString()
  return new Date(Math.floor(nanos / 1_000_000)).toISOString()
}

function severityOf(record) {
  const text = String(record.severityText || '').toLowerCase()
  if (text.includes('fatal')) return 'critical'
  if (text.includes('error')) return 'high'
  if (text.includes('warn')) return 'medium'
  if (text.includes('info')) return 'low'
  const number = Number(record.severityNumber || 0)
  if (number >= 21) return 'critical'
  if (number >= 17) return 'high'
  if (number >= 13) return 'medium'
  return 'low'
}

function bodyText(body) {
  if (body === null || body === undefined) return ''
  if (typeof body === 'string') return body
  if (typeof body === 'object') return String(body.stringValue ?? body.intValue ?? body.doubleValue ?? JSON.stringify(body))
  return String(body)
}

export function ingestOtlp(store, engagementId, payload) {
  const engagement = store.getEngagement(engagementId)
  if (engagement === null) throw new Error('防守目标不存在：' + engagementId)
  if (payload === null || typeof payload !== 'object' || !Array.isArray(payload.resourceLogs)) {
    throw new Error('不是 OTLP JSON：缺少 resourceLogs')
  }
  let accepted = 0
  let inserted = 0
  let duplicates = 0
  let skipped = 0
  const alerts = []
  for (const resourceLog of payload.resourceLogs) {
    if (resourceLog === null || typeof resourceLog !== 'object') { skipped += 1; continue }
    const resource = attributes(resourceLog.resource?.attributes)
    const service = resource['service.name'] || resource.service || 'unknown'
    for (const scopeLog of Array.isArray(resourceLog.scopeLogs) ? resourceLog.scopeLogs : []) {
      if (scopeLog === null || typeof scopeLog !== 'object') { skipped += 1; continue }
      for (const record of Array.isArray(scopeLog.logRecords) ? scopeLog.logRecords : []) {
        if (record === null || typeof record !== 'object') { skipped += 1; continue }
        if (accepted >= 200) { skipped += 1; continue }
        accepted += 1
        const body = bodyText(record.body)
        const at = isoFromNanos(record.timeUnixNano || record.observedTimeUnixNano)
        const attrs = attributes(record.attributes)
        const raw = JSON.stringify({ resource, scope: scopeLog.scope || null, record }).slice(0, 8000)
        const alert = store.addAlert(engagementId, {
          title: `OTel ${service}: ${body}`.slice(0, 160),
          severity: severityOf(record),
          source: `otel:${service}`,
          confidence: 'medium',
          note: `service=${service} remote=${attrs['net.peer.ip'] || attrs['client.address'] || ''}`,
          raw,
          event_time: at,
          external_id: createHash('sha256').update(`${service}|${at}|${body}|${raw}`).digest('hex'),
          actor: 'otlp',
        })
        alerts.push(alert)
        if (alert.inserted) inserted += 1
        else duplicates += 1
      }
    }
  }
  if (inserted > 0) {
    store.addTimeline(engagementId, {
      actor: 'otlp',
      action: 'otlp_ingest',
      target: 'OTLP/HTTP',
      detail: `accepted=${accepted} inserted=${inserted} duplicates=${duplicates} skipped=${skipped}`,
    })
  }
  return { ok: true, accepted, inserted, duplicates, skipped, alerts: alerts.map((item) => item.id) }
}

export function otlpAuthorized(headers) {
  const expected = String(process.env.BLUE_OTLP_TOKEN || '')
  if (expected === '') return false
  const auth = String(headers.authorization || '')
  const bearer = auth.replace(/^Bearer\s+/i, '').trim()
  const token = bearer || String(headers['x-blue-token'] || '').trim()
  return token !== '' && token === expected
}
