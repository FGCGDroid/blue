/**
 * dsh-blue-team-mode —— Host 半侧自举
 *
 * 职责（只做三件事）：
 *   1. 解析随包资源路径（预设、技能、数据目录），包被装到哪个 profile 都对；
 *   2. 把包内 `skills/*.md` 同步到 `$DSH_HOME/blue/skills`，供预设里的
 *      `skill-filesystem` 以静态路径发现（不依赖安装期占位符替换）；
 *   3. 发布进程级服务 `ctx.blueTeamMode`，供工具行与排障读取。
 *
 * 数据层（SQLite）由 `dsh-blue-team-mode/store` 单独发布为 `ctx.blueTeam`，
 * 本文件不持有数据库句柄。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis 插件名。 */
export const name = 'blue-team-mode'

/** 无硬依赖：资源自举失败也不应阻断挂载。 */
export const inject = []

/** 本包根目录（从模块位置解析）。 */
export function packagePaths() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  return {
    root,
    presets: join(root, 'presets'),
    skills: join(root, 'skills'),
  }
}

/** 数据根目录：显式配置 > BLUE_HOME > $DSH_HOME/blue。 */
export function blueDataDir() {
  if (process.env.BLUE_HOME) return process.env.BLUE_HOME
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'blue')
}

/**
 * 把随包技能同步到数据目录。
 *
 * 每次都覆盖：插件升级后技能正文必须跟着换，否则模型会按旧剧本执行。
 * 目录是本插件托管的（`$DSH_HOME/blue/skills`），不覆盖用户自己的
 * `$DSH_HOME/skills`（那个根由 skill-filesystem 排在前面，优先级更高）。
 */
export function installSkills(root = blueDataDir()) {
  const paths = packagePaths()
  const target = join(root, 'skills')
  mkdirSync(target, { recursive: true })
  let copied = 0
  if (existsSync(paths.skills)) {
    for (const file of readdirSync(paths.skills)) {
      if (!file.endsWith('.md')) continue
      const text = readFileSync(join(paths.skills, file), 'utf8')
      writeFileSync(join(target, file), text, 'utf8')
      copied += 1
    }
  }
  try {
    writeFileSync(join(target, '.bundle-version'), readVersion(), 'utf8')
  } catch { /* 版本标记失败不影响技能发现 */ }
  return { dir: target, skills: copied }
}

/** 读取本包版本；失败返回 'unknown'。 */
function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    return typeof pkg.version === 'string' ? pkg.version : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * @param ctx - 插件上下文。
 */
export function apply(ctx) {
  const paths = packagePaths()
  const root = blueDataDir()
  let skillsDir = join(root, 'skills')
  let skills = 0
  try {
    const installed = installSkills(root)
    skillsDir = installed.dir
    skills = installed.skills
  } catch (error) {
    ctx.logger?.warn?.(
      'blue-team-mode: 技能同步失败（预设仍会挂载，技能目录可能为空）：%s',
      error && error.message ? error.message : String(error),
    )
  }

  ctx.provide('blueTeamMode', Object.freeze({
    version: readVersion(),
    paths,
    root,
    skillsDir,
    skills,
  }))
  ctx.logger?.info?.(
    'blue-team-mode: 就绪（数据目录 %s；技能 %d 个；预设由 cordis.patch.yml 声明）',
    root, skills,
  )
}

export default { name, inject, apply }
