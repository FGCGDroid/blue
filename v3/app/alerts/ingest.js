/** 3.0 告警接收入库用例（M4.0）。 */
import { BlueError } from '../../domain/shared/errors.js'

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function pick(args, item, key, fallback = '') {
  const top = text(args[key]).trim()
  if (top !== '') return top
  const own = text(item[key]).trim()
  if (own !== '') return own
  return fallback
}

function pickNullable(args, item, key) {
  const value = pick(args, item, key, '')
  return value === '' ? null : value
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
      title: pick(args, item, 'title', pick(args, item, 'name', pick(args, item, 'message', '未命名告警'))),
      severity: pick(args, item, 'severity', pick(args, item, 'level', 'medium')),
      source: pick(args, item, 'source', pick(args, item, 'vendor', '')),
      confidence: pick(args, item, 'confidence', 'medium'),
      task_id: pickNullable(args, item, 'task_id'),
      external_id: pick(args, item, 'external_id', pick(args, item, 'id', '')),
      raw: typeof item.raw === 'string' ? item.raw : JSON.stringify(item).slice(0, 8000),
      note: pick(args, item, 'note', ''),
      event_time: pick(args, item, 'event_time', pick(args, item, 'ts', pick(args, item, 'time', ''))),
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
