/**
 * 3.0 事实库入口（M2）。
 *
 * 打开 SQLite、跑迁移、装配 timeline/tasks 仓储。
 * 事实库仍是 2.0 的 17 张表；3.0 不改表名/列名。
 */
import { mkdirSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { SqliteDb } from './infra/sqlite/db.js'
import { TimelineRepo } from './infra/sqlite/repos/timeline.js'
import { EngagementsRepo } from './infra/sqlite/repos/engagements.js'
import { DecisionsRepo } from './infra/sqlite/repos/decisions.js'
import { DetectionRepo } from './infra/sqlite/repos/detection.js'
import { ControlsRepo } from './infra/sqlite/repos/controls.js'
import { TaskRepo } from './infra/sqlite/repos/tasks.js'
import { FactsRepo } from './infra/sqlite/repos/facts.js'
import { IncidentsRepo } from './infra/sqlite/repos/incidents.js'
import { DecoysRepo } from './infra/sqlite/repos/decoys.js'
import { ResponsesRepo } from './infra/sqlite/repos/responses.js'
import { EvidenceRepo } from './infra/sqlite/repos/evidence.js'
import { TelemetryRepo } from './infra/sqlite/repos/telemetry.js'
import { KnowledgeRepo } from './infra/sqlite/repos/knowledge.js'
import { readJsonl } from './infra/fs/jsonl.js'

export const name = 'blue-store-v3'

export const inject = []

export class BlueStoreV3 {
  constructor(root) {
    if (typeof root !== 'string' || root === '') throw new Error('blue-store-v3: root 不能为空')
    this.root = root
    mkdirSync(root, { recursive: true })
    this.db = new SqliteDb(join(root, 'blue.db')).open()
    this.timeline = new TimelineRepo(this.db)
    this.engagements = new EngagementsRepo(this.db, this.timeline)
    this.decisions = new DecisionsRepo(this.db, this.timeline)
    this.detection = new DetectionRepo(this.db, this.timeline)
    this.controls = new ControlsRepo(this.db)
    this.tasks = new TaskRepo(this.db, this.timeline)
    // M2 剩余：这些 repo 已占位，方法会在补实现前抛 NOT_IMPLEMENTED。
    this.facts = new FactsRepo(this.db, this.timeline)
    this.incidents = new IncidentsRepo(this.db, this.timeline)
    this.decoys = new DecoysRepo(this.db, this.timeline, this.facts)
    this.responses = new ResponsesRepo(this.db, this.timeline, this.tasks, this.incidents)
    this.evidenceRepo = new EvidenceRepo(this.db, this.timeline, root)
    this.telemetry = new TelemetryRepo(this.db)
    this.knowledge = new KnowledgeRepo(this.db, this.timeline)
    this.closed = false
  }

  get schemaVersion() {
    return this.db.getMeta('schema_version', '')
  }

  get lastBackup() {
    return this.db.lastBackup ?? null
  }

  readJsonl(file, options = {}) {
    return readJsonl(file, { root: this.root, ...options })
  }

  collectorToken() {
    let token = String(this.db.getMeta('collector:token', '') || '')
    if (token === '') {
      token = randomBytes(24).toString('hex')
      this.db.setMeta('collector:token', token)
    }
    return token
  }

  collectorLogPath(engagementId) {
    const dir = join(this.root, 'collector')
    mkdirSync(dir, { recursive: true })
    return join(dir, `${String(engagementId).replace(/[^A-Za-z0-9_-]/g, '_')}.jsonl`)
  }

  ensureCollectorSource(engagementId) {
    const path = this.collectorLogPath(engagementId)
    if (!this.telemetry.listSources(engagementId).some((source) => source.path === path)) {
      this.telemetry.addSource(engagementId, { name: 'remote-collector', kind: 'jsonl', path })
    }
    return path
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
