/**
 * 会话 → 防守目标绑定的持久化镜像。
 *
 * 工具进程内有一份 Map；控制台是另一个 Host 插件，不能读那份内存，
 * 所以每次绑定都把 `session_id → engagement_id` 写到数据目录的 JSON。
 * 文件很小，写入是原子的（先写临时文件再 rename），避免半截文件。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function bindingsPath(root) {
  return join(root, 'session-bindings.json')
}

export function readBindings(root) {
  try {
    const file = bindingsPath(root)
    if (!existsSync(file)) return {}
    const data = JSON.parse(readFileSync(file, 'utf8'))
    return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

export function writeBindings(root, map) {
  mkdirSync(root, { recursive: true })
  const file = bindingsPath(root)
  const temp = file + '.tmp-' + process.pid
  writeFileSync(temp, JSON.stringify(map, null, 2), 'utf8')
  renameSync(temp, file)
  return file
}

export function resolveBinding(root, sessionId) {
  if (typeof sessionId !== 'string' || sessionId === '') return undefined
  const map = readBindings(root)
  const hit = map[sessionId]
  return typeof hit === 'string' && hit !== '' ? hit : undefined
}

export function bindSession(root, sessionId, engagementId) {
  if (typeof sessionId !== 'string' || sessionId === '') return
  const map = readBindings(root)
  map[sessionId] = engagementId
  writeBindings(root, map)
}
