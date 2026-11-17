/**
 * 遥测源仓储（M2）。
 *
 * 只登记文件源与 cursor；真正读取/解析在 infra/telemetry 和 app。
 */
import { createHash } from 'node:crypto'
import { realpathSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { BlueError } from '../../../domain/shared/errors.js'
import { isWithin } from '../../fs/safe-path.js'
import { asText } from './shared.js'

function allowedRoots() {
  const dshRoot = resolve(process.env.DSH_HOME || resolve(homedir(), '.dsh'))
  const roots = [
    resolve(dshRoot, 'blue'),
    resolve(dshRoot, 'ctf-lab'),
    resolve(process.cwd()),
  ]
  if (process.env.BLUE_TELEMETRY_ROOT) roots.push(resolve(process.env.BLUE_TELEMETRY_ROOT))
  return roots
}

function realPathIfExists(path) {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}

function allowedPath(target) {
  const real = realPathIfExists(target)
  return allowedRoots().some((root) => isWithin(realPathIfExists(root), real))
}

export class TelemetryRepo {
  constructor(db) {
    this.db = db
  }

  addSource(engagementId, input = {}) {
    const name = asText(input.name).trim()
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) {
      throw new BlueError('TELEMETRY_NAME', '遥测源名称只能是 1-64 位字母数字._-')
    }
    const requested = resolve(asText(input.path).trim())
    let path
    try {
      path = realpathSync(requested)
    } catch {
      throw new BlueError('TELEMETRY_PATH', `遥测源不存在：${requested}`)
    }
    if (!allowedPath(path)) {
      throw new BlueError('TELEMETRY_PATH', `遥测日志只允许来自 DSH/blue、ctf-lab、当前工作区或 BLUE_TELEMETRY_ROOT：${path}`)
    }
    let stat
    try {
      stat = statSync(path)
    } catch {
      throw new BlueError('TELEMETRY_PATH', `遥测源不存在：${path}`)
    }
    if (!stat.isFile()) throw new BlueError('TELEMETRY_PATH', `遥测源不是文件：${path}`)

    const id = `TEL-${createHash('sha256').update(`${engagementId}|${name}`).digest('hex').slice(0, 16).toUpperCase()}`
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO telemetry_sources
      (id, engagement_id, name, kind, path, status, cursor, events_total, alerts_total, last_poll_at, last_event_at, last_error, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 0, 0, 0, NULL, NULL, '', ?, ?)
      ON CONFLICT(engagement_id, name) DO UPDATE SET
        kind = excluded.kind, path = excluded.path, status = 'active', updated_at = excluded.updated_at`)
      .run(id, engagementId, name, asText(input.kind, 'jsonl'), path, at, at)
    return this.getSourceBy(engagementId, name)
  }

  listSources(engagementId) {
    return this.db.sql('SELECT * FROM telemetry_sources WHERE engagement_id = ? ORDER BY name')
      .all(engagementId)
  }

  getSource(id) {
    const row = this.db.sql('SELECT * FROM telemetry_sources WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  getSourceBy(engagementId, name) {
    const row = this.db.sql('SELECT * FROM telemetry_sources WHERE engagement_id = ? AND name = ?')
      .get(engagementId, name)
    return row === undefined ? null : row
  }

  saveCursor(sourceId, patch = {}) {
    const current = this.getSource(sourceId)
    if (current === null) throw new BlueError('TELEMETRY_NOT_FOUND', `遥测源不存在：${sourceId}`)
    const cursor = Number.isInteger(patch.cursor) ? Math.max(patch.cursor, 0) : current.cursor
    const events = Number.isInteger(patch.events) ? Math.max(patch.events, 0) : current.events_total
    const alerts = Number.isInteger(patch.alerts) ? Math.max(patch.alerts, 0) : current.alerts_total
    const at = new Date().toISOString()
    this.db.sql(`UPDATE telemetry_sources
      SET cursor = ?, events_total = ?, alerts_total = ?, last_poll_at = ?, last_event_at = ?, last_error = '', updated_at = ?
      WHERE id = ?`)
      .run(cursor, events, alerts, asText(patch.last_poll_at, at), asText(patch.last_event_at, current.last_event_at), at, sourceId)
    return this.getSource(sourceId)
  }

  markError(sourceId, error) {
    const at = new Date().toISOString()
    this.db.sql('UPDATE telemetry_sources SET last_poll_at = ?, last_error = ?, updated_at = ? WHERE id = ?')
      .run(at, String(error || '').slice(0, 500), at, sourceId)
    return this.getSource(sourceId)
  }
}
