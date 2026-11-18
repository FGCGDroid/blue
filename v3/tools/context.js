/**
 * 3.0 工具上下文：会话绑定、目标解析、范围判断、自检状态。
 *
 * 只在工具层使用；不写 SQL、不直接操作仓储。
 */
import { BlueError } from '../domain/shared/errors.js'

const bindings = new Map()
const selfChecked = new Set()

export function sessionObjectOf(exec) {
  return exec?.agent?.session ?? exec?.session ?? null
}

export function sessionIdOf(exec) {
  const session = sessionObjectOf(exec)
  return typeof session?.id === 'string' && session.id !== '' ? session.id : null
}

export function parentIdOf(exec) {
  const session = sessionObjectOf(exec)
  return typeof session?.parentSessionId === 'string' && session.parentSessionId !== ''
    ? session.parentSessionId
    : null
}

export function sessionKeysOf(exec) {
  const id = sessionIdOf(exec)
  if (id === null) return { sessionId: null, rootId: null, chain: [], keys: [] }
  const parent = parentIdOf(exec)
  const chain = parent === null ? [id] : [parent, id]
  const rootId = parent ?? id
  return {
    sessionId: id,
    rootId,
    chain,
    keys: Array.from(new Set([rootId, id, ...chain])),
  }
}

export function bindEngagement(exec, engagementId) {
  const { keys } = sessionKeysOf(exec)
  for (const key of keys) bindings.set(key, engagementId)
  return keys
}

export function listBindings() {
  return Array.from(bindings, ([session, engagement]) => ({ session, engagement }))
}

export function bindingViewOf(exec, store) {
  const { sessionId, rootId, chain, keys } = sessionKeysOf(exec)
  let engagement = null
  for (const key of keys) {
    const id = bindings.get(key)
    if (id === undefined) continue
    engagement = store.engagements.get(id)
    if (engagement !== null) break
  }
  return {
    session_id: sessionId,
    root_session_id: rootId,
    parent_chain: chain,
    bound_engagement: engagement === null ? null : { id: engagement.id, name: engagement.name },
    is_subagent: chain.length > 1,
  }
}

export function engagementOf(store, exec, explicit) {
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    const hit = store.engagements.get(explicit.trim())
    if (hit === null) throw new BlueError('ENGAGEMENT_NOT_FOUND', '防守目标不存在：' + explicit.trim())
    return hit
  }
  const { keys } = sessionKeysOf(exec)
  for (const key of keys) {
    const id = bindings.get(key)
    if (id === undefined) continue
    const hit = store.engagements.get(id)
    if (hit !== null) return hit
    bindings.delete(key)
  }
  const active = store.engagements.list().filter((item) => item.status === 'active')
  if (active.length === 1) return active[0]
  if (active.length === 0) {
    throw new BlueError('ENGAGEMENT_REQUIRED', '还没有防守目标：先调用 blue_engagement_open 建立本场防守目标')
  }
  throw new BlueError('ENGAGEMENT_AMBIGUOUS', '当前会话未绑定防守目标；请传 engagement，或先 blue_engagement_open')
}

export function selfCheckKeyOf(exec) {
  const { rootId, sessionId } = sessionKeysOf(exec)
  return String(rootId ?? sessionId ?? 'anonymous')
}

export function hasSelfCheck(exec) {
  return selfChecked.has(selfCheckKeyOf(exec))
}

export function markSelfChecked(exec) {
  selfChecked.add(selfCheckKeyOf(exec))
}

export function resetSelfCheckForTest(exec) {
  selfChecked.delete(selfCheckKeyOf(exec))
}

/** 只读真实 user/message 事件；不能用工具参数伪造“用户已说防御自检”。 */
export function userSaidSelfCheck(exec) {
  const session = sessionObjectOf(exec)
  if (!session) return false
  let events = []
  try {
    if (typeof session.snapshotEvents === 'function') events = session.snapshotEvents()
    else if (typeof session.ownEvents === 'function') events = session.ownEvents()
  } catch {
    return false
  }
  const textOf = (value) => {
    if (typeof value === 'string') return value
    if (value === null || typeof value !== 'object') return ''
    if (typeof value.text === 'string') return value.text
    if (Array.isArray(value.content)) return value.content.map(textOf).join('')
    if (value.message !== undefined) return textOf(value.message)
    return ''
  }
  return (Array.isArray(events) ? events : [])
    .filter((event) => event?.type === 'user/message')
    .slice(-1)
    .some((event) => textOf(event.data).trim() === '防御自检')
}

/* ── 范围判断 ─────────────────────────────────────────────────────────────── */

function ipv4ToInt(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n < 0 || n > 255) return null
    value = (value << 8) + n
  }
  return value >>> 0
}

function ipv4InCidr(ip, cidr) {
  const [base, bitsText] = cidr.split('/')
  const bits = Number(bitsText)
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false
  const ipInt = ipv4ToInt(ip)
  const baseInt = ipv4ToInt(base)
  if (ipInt === null || baseInt === null || bits === 0) return bits === 0
  const mask = (0xffffffff << (32 - bits)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

export function hostOfTarget(raw) {
  const value = String(raw ?? '').trim()
  if (value === '') return ''
  try {
    const url = new URL(value)
    return url.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    let host = value
    if (host.startsWith('[')) {
      const end = host.indexOf(']')
      if (end > 0) return host.slice(1, end).toLowerCase()
    }
    if (!host.includes('/')) {
      const colon = host.lastIndexOf(':')
      if (colon > 0 && /^\d+$/.test(host.slice(colon + 1))) host = host.slice(0, colon)
    }
    return host.toLowerCase().replace(/\.$/, '')
  }
}

export function scopeStatus(host, scope) {
  const target = String(host ?? '').trim().toLowerCase()
  const list = Array.isArray(scope) ? scope : []
  if (list.length === 0) return { status: 'unscoped', reason: '没有声明 scope' }
  for (const raw of list) {
    const entry = String(raw ?? '').trim().toLowerCase()
    if (entry === '') continue
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1)
      if (target.endsWith(suffix) || target === entry.slice(2)) return { status: 'in', rule: entry }
      continue
    }
    if (entry.startsWith('.')) {
      if (target === entry.slice(1) || target.endsWith(entry)) return { status: 'in', rule: entry }
      continue
    }
    if (entry.includes('/') && ipv4InCidr(target, entry)) return { status: 'in', rule: entry }
    if (target === entry) return { status: 'in', rule: entry }
    if (target.endsWith('.' + entry)) return { status: 'in', rule: entry }
  }
  return { status: 'out', reason: '不在已声明 scope 内' }
}
