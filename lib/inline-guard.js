/**
 * 内联请求检查：给同端口网关/中间件用的最小规则集。
 *
 * 只返回原因，不负责发响应；调用方决定 403、计数和日志。
 * 规则故意保守，宁可少拦，不做“看到 admin 就封”。
 */

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const PRIVILEGE_KEY = /^(?:is_?admin|admin|role|is_?staff|staff|permission|manager|superuser)$/i
const TOKEN_COOKIES = new Set(['token', 'session', 'auth', 'access_token'])

export function rawPathOf(url) {
  return String(url || '/').split('?')[0]
}

/**
 * CL+TE / 重复长度头 / 歧义 TE 直接拒绝。
 * rawHeaders 是 Node 的 [name, value, ...] 原始数组，保留重复头。
 */
export function inspectSmuggling(rawHeaders) {
  if (!Array.isArray(rawHeaders)) return null
  const contentLength = []
  const transferEncoding = []
  for (let i = 0; i + 1 < rawHeaders.length; i += 2) {
    const name = String(rawHeaders[i] || '').toLowerCase()
    const value = String(rawHeaders[i + 1] || '').trim()
    if (name === 'content-length') contentLength.push(value)
    if (name === 'transfer-encoding') transferEncoding.push(value)
  }
  if (contentLength.length > 1) return { reason: 'request-smuggling', detail: 'duplicate content-length' }
  if (transferEncoding.length > 1) return { reason: 'request-smuggling', detail: 'duplicate transfer-encoding' }
  if (contentLength.length > 0 && transferEncoding.length > 0) {
    return { reason: 'request-smuggling', detail: 'CL+TE' }
  }
  if (contentLength.length === 1 && !/^\d+$/.test(contentLength[0])) {
    return { reason: 'request-smuggling', detail: 'malformed content-length' }
  }
  if (transferEncoding.length === 1 && transferEncoding[0].toLowerCase() !== 'chunked') {
    return { reason: 'request-smuggling', detail: 'ambiguous transfer-encoding' }
  }
  return null
}

export function inspectPath(rawUrl) {
  const path = rawPathOf(rawUrl)
  if (path === '') return null
  if (/%00/i.test(path)) return { reason: 'path-normalization', detail: 'null byte' }
  if (/%2e|%2f/i.test(path)) return { reason: 'path-normalization', detail: 'encoded separator' }
  if (/(?:^|\/)\.{1,2}(?:\/|$)/.test(path)) return { reason: 'path-normalization', detail: 'dot segment' }
  if (/\/\//.test(path)) return { reason: 'path-normalization', detail: 'double slash' }
  return null
}

function cookiePairs(header) {
  const pairs = []
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    pairs.push([part.slice(0, index).trim(), part.slice(index + 1).trim()])
  }
  return pairs
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

function cookieValue(header, name) {
  const pairs = cookiePairs(header)
  for (const [key, value] of pairs) if (key === name) return decodeURIComponent(value)
  return ''
}

export function decodeJwtHeader(token) {
  const parts = String(token || '').split('.')
  if (parts.length < 2) return null
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function inspectJwt(headers) {
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

/**
 * @param {{url:string, headers:object, body?:string, contentType?:string}} request
 * @returns {null | {reason:string, detail:string}}
 */
export function inspectRequest(request) {
  return inspectSmuggling(request.rawHeaders)
    || inspectPath(request.url)
    || inspectCookies(request.headers && request.headers.cookie)
    || inspectJwt(request.headers || {})
    || inspectBody(request.body || '', request.contentType || (request.headers && request.headers['content-type']))
}
