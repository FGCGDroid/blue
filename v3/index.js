/**
 * 3.0 骨架入口。
 *
 * 只做三件事：
 *   1. 解析资源路径；
 *   2. 确保数据目录存在；
 *   3. 发布 ctx.blueTeamModeV3。
 *
 * 3.0 的数据层、工具层、UI 层分别由 v3/store.js、v3/tools.js、v3/ui.js 发布。
 * 现在不接入 cordis.patch.yml，避免和 2.0 抢服务名。
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis 插件名。3.0 与 2.0 用不同名字，方便并行加载。 */
export const name = 'blue-team-mode-v3'

/** 骨架阶段没有硬依赖。 */
export const inject = []

/** 3.0 开发版本；GA 时改成 package.json 的版本。 */
export const V3_VERSION = '3.0.0-dev'

/** 本包根目录。 */
export function packagePaths() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  return {
    root,
    presets: join(root, 'presets'),
    skills: join(root, 'skills'),
  }
}

/** 数据根目录：BLUE_HOME > $DSH_HOME/blue。与 2.0 共用目录，迁移时才能找到旧库。 */
export function blueDataDir() {
  if (process.env.BLUE_HOME) return process.env.BLUE_HOME
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'blue')
}

/** 读 package.json 的版本；失败返回 unknown。 */
export function packageVersion() {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * @param ctx Cordis 上下文
 * @param {{root?: string}} [config]
 */
export function apply(ctx, config = {}) {
  const root = typeof config.root === 'string' && config.root !== '' ? config.root : blueDataDir()
  mkdirSync(root, { recursive: true })
  ctx.provide('blueTeamModeV3', Object.freeze({
    version: V3_VERSION,
    package_version: packageVersion(),
    skeleton: true,
    root,
    paths: packagePaths(),
  }))
  ctx.logger?.info?.('blue-team-mode-v3: skeleton 就绪（%s）', root)
}

export default { name, inject, apply }
