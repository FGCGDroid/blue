/**
 * DSH 运行时兼容检测。
 *
 * 这里只读安装目录的 package.json，不加载 DSH 内部模块。
 * 未知版本按“新版本”处理，避免把能用的环境误判成不兼容。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function parse(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/)
  if (match === null) return null
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split('.') : [],
  }
}

function comparePre(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1
  if (b.length === 0) return -1
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i]
    const right = b[i]
    if (left === undefined) return -1
    if (right === undefined) return 1
    if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
      const diff = Number(left) - Number(right)
      if (diff !== 0) return diff
    } else if (left !== right) {
      return left < right ? -1 : 1
    }
  }
  return 0
}

export function compareVersions(a, b) {
  const left = parse(a)
  const right = parse(b)
  if (left === null || right === null) return null
  for (let i = 0; i < 3; i += 1) {
    if (left.core[i] !== right.core[i]) return left.core[i] - right.core[i]
  }
  return comparePre(left.pre, right.pre)
}

export function installedDshVersion() {
  const dir = process.env.DSH_INSTALL_DIR
  if (typeof dir !== 'string' || dir === '') return null
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    return typeof pkg.version === 'string' ? pkg.version : null
  } catch {
    return null
  }
}

export function dshCapabilities(version = installedDshVersion()) {
  if (version === null) {
    return {
      version: null,
      agent_preset: true,
      web_console: true,
      legacy_subagent: false,
      known: false,
    }
  }
  const agentPreset = compareVersions(version, '0.2.1-rc.1')
  return {
    version,
    agent_preset: agentPreset === null ? true : agentPreset >= 0,
    web_console: true,
    legacy_subagent: agentPreset !== null && agentPreset < 0,
    known: agentPreset !== null,
  }
}
