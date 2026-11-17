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
