/** 3.0 告警接收入库用例（M4.0）。 */
import { BlueError } from '../../domain/shared/errors.js'

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function ingestAlert(store, engagementId, args = {}) {
  const raw = text(args.raw).trim()
  let items = []
  if (raw.startsWith('{') || raw.startsWith('[')) {
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new BlueError('ALERT_JSON', 'raw 看起来是 JSON，但解析失败')
    }
    items = Array.isArray(parsed) ? parsed : [parsed]
  } else if (text(args.title).trim() !== '') {
    items = [args]
  } else {
    throw new BlueError('ALERT_INPUT', '没有可接入的告警：给 title，或给一段 JSON raw')
  }

  const alerts = []
  let inserted = 0
  let updated = 0
  for (const item of items.slice(0, 200)) {
    const alert = store.facts.addAlert(engagementId, {
      title: text(item.title) || text(item.name) || text(item.message) || text(args.title) || '未命名告警',
      severity: text(item.severity) || text(item.level) || text(args.severity) || 'medium',
      source: text(item.source) || text(item.vendor) || text(args.source),
      confidence: text(item.confidence) || text(args.confidence) || 'medium',
      task_id: text(item.task_id) || text(args.task_id) || null,
      external_id: text(item.id) || text(item.external_id) || text(args.external_id),
      raw: typeof item.raw === 'string' ? item.raw : JSON.stringify(item).slice(0, 8000),
      note: text(item.note) || text(args.note),
      event_time: text(item.event_time) || text(item.ts) || text(item.time) || text(args.event_time),
      actor: 'monitor',
    })
    alerts.push(alert)
    if (alert.inserted) inserted += 1
    else updated += 1
  }
  return {
    ingested: inserted,
    updated,
    alerts,
    stats: store.engagements.stats(engagementId),
  }
}
