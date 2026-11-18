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
  const direct = session?.parentSessionId
  const headerParent = session?.header?.parentSession ?? session?.header?.parent_session
  const value = direct ?? headerParent
  return typeof value === 'string' && value !== '' ? value : null
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

export function unbindEngagement(exec) {
  const { keys } = sessionKeysOf(exec)
  for (const key of keys) bindings.delete(key)
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
  const { rootId, sessionId } = sessionKeysOf(exec)
  // 子智能体没有自己的自检；继承父/根会话的自检状态。
  return selfChecked.has(String(rootId ?? sessionId ?? 'anonymous'))
    || (sessionId !== null && selfChecked.has(String(sessionId)))
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
  const parts = String(ip).split('.')
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

function ipv6ToBigInt(ip) {
  const value = String(ip).trim().toLowerCase()
  if (!value.includes(':')) return null
  const halves = value.split('::')
  if (halves.length > 2) return null
  const left = halves[0] === '' ? [] : halves[0].split(':')
  const right = halves.length === 2 ? (halves[1] === '' ? [] : halves[1].split(':')) : []
  if (halves.length === 1 && left.length !== 8) return null
  const zeroCount = 8 - left.length - right.length
  if (zeroCount < 0 || (halves.length === 2 && zeroCount < 1)) return null
  const groups = [...left, ...Array(zeroCount).fill('0'), ...right]
  if (groups.length !== 8) return null
  let out = 0n
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null
    out = (out << 16n) + BigInt(parseInt(group, 16))
  }
  return out
}

function ipFamily(ip) {
  const value = String(ip ?? '').trim()
  if (value === '') return 0
  if (ipv4ToInt(value) !== null) return 4
  if (ipv6ToBigInt(value) !== null) return 6
  return 0
}

function ipToBigInt(ip, family) {
  return family === 4 ? BigInt(ipv4ToInt(ip)) : ipv6ToBigInt(ip)
}

function ipInterval(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.includes('/')) {
    const [address, prefixText] = raw.split('/')
    const family = ipFamily(address)
    const prefix = Number(prefixText)
    const maxBits = family === 6 ? 128 : 32
    if (family === 0 || !Number.isInteger(prefix) || prefix < 0 || prefix > maxBits) return null
    const base = ipToBigInt(address, family)
    const hostBits = BigInt(maxBits - prefix)
    const size = (1n << hostBits) - 1n
    return { start: base & ~size, end: (base & ~size) + size, family }
  }
  if (raw.includes('-')) {
    const [left, right] = raw.split('-').map((part) => part.trim())
    const family = ipFamily(left)
    if (family === 0 || ipFamily(right) !== family) return null
    const a = ipToBigInt(left, family)
    const b = ipToBigInt(right, family)
    return { start: a < b ? a : b, end: a < b ? b : a, family }
  }
  const family = ipFamily(raw)
  if (family === 0) return null
  const valueInt = ipToBigInt(raw, family)
  return { start: valueInt, end: valueInt, family }
}

function ipMatchesEntry(target, entry) {
  const value = String(entry || '').trim().toLowerCase()
  const family = ipFamily(target)
  if (family === 0) return false
  if (value.includes('-')) {
    const [left, right] = value.split('-').map((part) => part.trim())
    if (ipFamily(left) !== 4 || ipFamily(right) !== 4) return false
    const a = ipv4ToInt(left)
    const b = ipv4ToInt(right)
    const t = ipv4ToInt(target)
    return a !== null && b !== null && t !== null && t >= Math.min(a, b) && t <= Math.max(a, b)
  }
  if (value.includes('/')) {
    const [address, prefixText] = value.split('/')
    const baseFamily = ipFamily(address)
    const prefix = Number(prefixText)
    const maxBits = baseFamily === 6 ? 128 : 32
    if (baseFamily === 0 || baseFamily !== family || !Number.isInteger(prefix) || prefix < 0 || prefix > maxBits) return false
    const shift = BigInt(maxBits - prefix)
    return (ipToBigInt(target, family) >> shift) === (ipToBigInt(address, baseFamily) >> shift)
  }
  return target === value
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
    if (ipFamily(host) === 6) return host.toLowerCase()
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
  const targetIsIp = ipFamily(target) !== 0
  const targetRange = ipInterval(target)
  for (const raw of list) {
    const entry = String(raw ?? '').trim().toLowerCase()
    if (entry === '') continue
    const entryRange = ipInterval(entry)
    if (targetRange !== null && entryRange !== null
      && targetRange.family === entryRange.family
      && targetRange.start >= entryRange.start
      && targetRange.end <= entryRange.end) {
      return { status: 'in', rule: entry }
    }
    if (ipMatchesEntry(target, entry)) return { status: 'in', rule: entry }
    if (targetIsIp) continue
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1)
      if (target.endsWith(suffix) || target === entry.slice(2)) return { status: 'in', rule: entry }
      continue
    }
    if (entry.startsWith('.')) {
      if (target === entry.slice(1) || target.endsWith(entry)) return { status: 'in', rule: entry }
      continue
    }
    if (target === entry) return { status: 'in', rule: entry }
    if (target.endsWith('.' + entry)) return { status: 'in', rule: entry }
  }
  return { status: 'out', reason: '不在已声明 scope 内' }
}
