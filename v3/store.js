/**
 * 3.0 事实库入口（骨架）。
 *
 * 现在只持有数据目录，不打开 SQLite。
 * M2 会在这里装配 db、migrations、repos，并发布 ctx.blueTeamV3。
 */
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'blue-store-v3'

export const inject = []

export class BlueStoreV3 {
  constructor(root) {
    if (typeof root !== 'string' || root === '') throw new Error('blue-store-v3: root 不能为空')
    this.root = root
    this.closed = false
  }

  close() {
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
  mkdirSync(root, { recursive: true })
  const store = new BlueStoreV3(root)
  if (typeof ctx.effect === 'function') ctx.effect(() => () => store.close())
  ctx.provide('blueTeamV3', store)
  ctx.logger?.info?.('blue-store-v3: 骨架就绪（%s）', root)
}

export default { name, inject, apply }
