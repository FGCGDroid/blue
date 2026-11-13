/**
 * 文件型遥测接入：给持续运行的日志一个最小适配层。
 * 只读文件，不执行日志内容；cursor 按完整行推进，半行留到下一次。
 */
import { createHash } from 'node:crypto'
import { closeSync, openSync, readSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve, sep } from 'node:path'
import { loadRules, matchAny } from './detection.js'

function now() {
  return new Date().toISOString()
}

function within(root, target) {
  return target === root || target.startsWith(root + sep)
}

function allowedPath(target) {
  const blueRoot = resolve(process.env.DSH_HOME || resolve(homedir(), '.dsh'), 'blue')
  const extra = process.env.BLUE_TELEMETRY_ROOT ? resolve(process.env.BLUE_TELEMETRY_ROOT) : ''
  return within(blueRoot, target)
    || within(resolve(process.cwd()), target)
    || (extra !== '' && within(extra, target))
}

function severityOf(event) {
  if (typeof event.guard === 'string' && event.guard !== '') return 'high'
  if (Array.isArray(event.tags) && event.tags.length > 0) return 'high'
  const status = Number(event.status || event.status_code || 0)
  if (status >= 500 || status === 401 || status === 403) return 'high'
  if (status === 404) return 'medium'
  return 'low'
}

function normalize(line, source) {
  const text = line.trim()
  if (text === '') return null
  let event = null
  try { event = JSON.parse(text) } catch { event = null }
  if (event === null) {
    const match = text.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3})/)
    if (match === null) return null
    event = { remote: match[1], at: match[2], method: match[3], path: match[4], status: Number(match[5]) }
  }
  const method = String(event.method || event.http_method || '')
  const path = String(event.path || event.uri || event.url || '')
  const status = Number(event.status || event.status_code || 0)
  const guard = String(event.guard || '')
  const at = String(event.at || event.time || event.timestamp || now())
  const title = guard !== ''
    ? `遥测拦截：${guard} ${path}`.trim()
    : `遥测事件：${method} ${path} ${status}`.trim()
  const alert = {
    title: title || `遥测事件：${source.name}`,
    severity: severityOf(event),
    source: `telemetry:${source.name}`,
    confidence: 'medium',
    note: `source=${source.name} remote=${String(event.remote || '')} method=${method} path=${path} status=${status}`,
    raw: text.slice(0, 4000),
    event_time: at,
    external_id: createHash('sha256').update(`${source.name}|${text}`).digest('hex'),
  }
  return { alert, event }
}

export function addTelemetrySource(store, engagementId, input = {}) {
  const name = String(input.name || '').trim()
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) throw new Error('遥测源名称只能是 1-64 位字母数字._-')
  const path = resolve(String(input.path || '').trim())
  if (!allowedPath(path)) throw new Error('遥测日志只允许来自 $DSH_HOME/blue、当前工作区或 BLUE_TELEMETRY_ROOT：' + path)
  const stat = statSync(path)
  if (!stat.isFile()) throw new Error('遥测源不是文件：' + path)
  const id = `TEL-${createHash('sha256').update(`${engagementId}|${name}`).digest('hex').slice(0, 16).toUpperCase()}`
  const at = now()
  store.sql(`INSERT INTO telemetry_sources
    (id, engagement_id, name, kind, path, status, cursor, events_total, alerts_total, last_poll_at, last_event_at, last_error, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', 0, 0, 0, NULL, NULL, '', ?, ?)
    ON CONFLICT(engagement_id, name) DO UPDATE SET
      kind = excluded.kind, path = excluded.path, status = 'active', updated_at = excluded.updated_at`)
    .run(id, engagementId, name, String(input.kind || 'jsonl'), path, at, at)
  return store.sql('SELECT * FROM telemetry_sources WHERE engagement_id = ? AND name = ?').get(engagementId, name)
}

export function listTelemetrySources(store, engagementId) {
  return store.sql('SELECT * FROM telemetry_sources WHERE engagement_id = ? ORDER BY name').all(engagementId)
}

export function pollTelemetrySource(store, source, options = {}) {
  const maxBytes = Math.min(Math.max(Number(options.maxBytes) || 1024 * 1024, 1024), 8 * 1024 * 1024)
  const maxAlerts = Math.min(Math.max(Number(options.maxAlerts) || 200, 1), 1000)
  let cursor = Number(source.cursor) || 0
  const size = statSync(source.path).size
  if (size < cursor) cursor = 0
  const available = Math.min(size - cursor, maxBytes)
  if (available <= 0) {
    store.sql('UPDATE telemetry_sources SET last_poll_at = ?, last_error = ? WHERE id = ?').run(now(), '', source.id)
    return { ok: true, name: source.name, read: 0, inserted: 0, cursor, skipped: 0 }
  }
  const buffer = Buffer.alloc(available)
  const fd = openSync(source.path, 'r')
  let bytes = 0
  try { bytes = readSync(fd, buffer, 0, available, cursor) } finally { closeSync(fd) }
  const chunk = buffer.subarray(0, bytes)
  const lastNewline = chunk.lastIndexOf(0x0a)
  if (lastNewline < 0) {
    store.sql('UPDATE telemetry_sources SET last_poll_at = ?, last_error = ? WHERE id = ?').run(now(), '', source.id)
    return { ok: true, name: source.name, read: 0, inserted: 0, cursor, skipped: 0 }
  }
  const complete = chunk.subarray(0, lastNewline + 1).toString('utf8')
  const lines = complete.split(/\r?\n/).filter((line) => line.trim() !== '')
  const rules = loadRules(store, source.engagement_id)
  let inserted = 0
  let skipped = 0
  for (const line of lines) {
    if (inserted >= maxAlerts) { skipped += 1; continue }
    const normalized = normalize(line, source)
    if (normalized === null) { skipped += 1; continue }
    const { alert, event } = normalized
    const hit = rules.length > 0 ? matchAny(rules, event) : null
    const guard = typeof event.guard === 'string' && event.guard !== ''
    if (rules.length > 0 && hit === null && !guard) { skipped += 1; continue }
    if (hit !== null) {
      alert.title = `规则命中：${hit.title}`
      alert.severity = hit.severity
      alert.note += ` rule=${hit.rule_key}`
    }
    const saved = store.addAlert(source.engagement_id, { ...alert, actor: 'telemetry' })
    if (saved.inserted) inserted += 1
  }
  cursor += lastNewline + 1
  const at = now()
  store.sql(`UPDATE telemetry_sources
    SET cursor = ?, events_total = events_total + ?, alerts_total = alerts_total + ?,
        last_poll_at = ?, last_event_at = ?, last_error = '', updated_at = ?
    WHERE id = ?`)
    .run(cursor, lines.length, inserted, at, at, at, source.id)
  return { ok: true, name: source.name, read: lines.length, inserted, cursor, skipped }
}

export function pollTelemetry(store, engagementId, options = {}) {
  const sources = listTelemetrySources(store, engagementId).filter((source) => source.status === 'active')
  const results = []
  for (const source of sources) {
    try {
      results.push(pollTelemetrySource(store, source, options))
    } catch (error) {
      store.sql('UPDATE telemetry_sources SET last_poll_at = ?, last_error = ?, updated_at = ? WHERE id = ?')
        .run(now(), String(error.message || error).slice(0, 500), now(), source.id)
      results.push({ ok: false, name: source.name, error: String(error.message || error) })
    }
  }
  return results
}
