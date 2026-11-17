/**
 * 3.0 事实库入口（M2）。
 *
 * 打开 SQLite、跑迁移、装配 timeline/tasks 仓储。
 * 事实库仍是 2.0 的 17 张表；3.0 不改表名/列名。
 */
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { SqliteDb } from './infra/sqlite/db.js'
import { TimelineRepo } from './infra/sqlite/repos/timeline.js'
import { TaskRepo } from './infra/sqlite/repos/tasks.js'
import { FactsRepo } from './infra/sqlite/repos/facts.js'
import { IncidentsRepo } from './infra/sqlite/repos/incidents.js'
import { DecoysRepo } from './infra/sqlite/repos/decoys.js'
import { ResponsesRepo } from './infra/sqlite/repos/responses.js'
import { EvidenceRepo } from './infra/sqlite/repos/evidence.js'
import { TelemetryRepo } from './infra/sqlite/repos/telemetry.js'

export const name = 'blue-store-v3'

export const inject = []

export class BlueStoreV3 {
  constructor(root) {
    if (typeof root !== 'string' || root === '') throw new Error('blue-store-v3: root 不能为空')
    this.root = root
    mkdirSync(root, { recursive: true })
    this.db = new SqliteDb(join(root, 'blue.db')).open()
    this.timeline = new TimelineRepo(this.db)
    this.tasks = new TaskRepo(this.db, this.timeline)
    // M2 剩余：这些 repo 已占位，方法会在补实现前抛 NOT_IMPLEMENTED。
    this.facts = new FactsRepo(this.db, this.timeline)
    this.incidents = new IncidentsRepo(this.db, this.timeline)
    this.decoys = new DecoysRepo(this.db)
    this.responses = new ResponsesRepo(this.db)
    this.evidenceRepo = new EvidenceRepo(this.db)
    this.telemetry = new TelemetryRepo(this.db)
    this.closed = false
  }

  get schemaVersion() {
    return this.db.getMeta('schema_version', '')
  }

  get lastBackup() {
    return this.db.lastBackup ?? null
  }

  close() {
    if (this.closed) return
    this.db.close()
    this.closed = true
  }
}

function resolveRoot(config = {}) {
  if (typeof config.root === 'string' && config.root !== '') return config.root
  if (process.env.BLUE_HOME) return process.env.BLUE_HOME
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'blue')
}

export function apply(ctx, config = {}) {
  const root = resolveRoot(config)
  const store = new BlueStoreV3(root)
  if (typeof ctx.effect === 'function') ctx.effect(() => () => store.close())
  ctx.provide('blueTeamV3', store)
  ctx.logger?.info?.('blue-store-v3: 事实库就绪（%s）', join(root, 'blue.db'))
}

export default { name, inject, apply }
