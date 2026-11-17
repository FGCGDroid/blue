/**
 * 请求内容检查（3.0，M3）。
 *
 * 发生在路径放行之后、转发之前。
 * 只返回 { reason, detail }，不发响应、不写日志。
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const PRIVILEGE_KEY = /^(?:is_?admin|admin|role|is_?staff|staff|permission|manager|superuser)$/i
const TOKEN_COOKIES = new Set(['token', 'session', 'auth', 'access_token'])

function cookiePairs(header) {
  const pairs = []
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    pairs.push([part.slice(0, index).trim(), part.slice(index + 1).trim()])
  }
  return pairs
}

function cookieValue(header, name) {
  for (const [key, value] of cookiePairs(header)) {
    if (key !== name) continue
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return ''
}

function decodeJwtHeader(token) {
  const parts = String(token || '').split('.')
  if (parts.length < 2) return null
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function inspectCookies(header) {
  const counts = new Map()
  for (const [name] of cookiePairs(header)) {
    if (!TOKEN_COOKIES.has(name)) continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  for (const [name, count] of counts) {
    if (count > 1) return { reason: 'duplicate-cookie', detail: name }
  }
  return null
}

export function inspectJwt(headers = {}) {
  const bearer = String(headers.authorization || '').replace(/^Bearer\s+/i, '')
  const token = bearer || cookieValue(headers.cookie, 'token')
  const header = decodeJwtHeader(token)
  if (header && header.alg === 'none') return { reason: 'jwt-none', detail: 'alg=none' }
  return null
}

function bodyJson(body, contentType) {
  const type = String(contentType || '').toLowerCase()
  if (body === '') return null
  try {
    if (type.includes('application/json')) return JSON.parse(body)
    if (type.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(body)
      const raw = params.get('json')
      if (raw === null || raw === '') return null
      return JSON.parse(raw)
    }
  } catch {
    return null
  }
  return null
}

function scanObject(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return null
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = scanObject(item, depth + 1)
      if (hit !== null) return hit
    }
    return null
  }
  for (const [key, item] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) return { reason: 'prototype-pollution', detail: key }
    if (PRIVILEGE_KEY.test(key)) return { reason: 'privilege-field', detail: key }
    const hit = scanObject(item, depth + 1)
    if (hit !== null) return hit
  }
  return null
}

export function inspectBody(body, contentType) {
  const parsed = bodyJson(body, contentType)
  if (parsed === null) return null
  return scanObject(parsed)
}

export function inspectContent({ headers = {}, body = '', contentType = '' } = {}) {
  return inspectCookies(headers.cookie)
    || inspectJwt(headers)
    || inspectBody(body, contentType || headers['content-type'])
}
