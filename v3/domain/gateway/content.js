/**
 * 请求内容检查（3.0，M3）。
 *
 * 发生在路径放行之后、转发之前。
 * 只返回 { reason, detail }，不发响应、不写日志。
 *
 * 对照 docs/3.0/attack-methods.md：
 *   M05 JWT alg 变体（大小写/空白/null/缺失/重复键）
 *   M06 重复 Cookie（顺序无关、名字大小写无关）
 *   M11 JSON \uXXXX 转义（先完整解码再判断字段名）
 *   M13 重复键（同一对象内同名危险键）
 *   M15 深嵌套 / multipart 里的 json / 重复 json 参数
 *   M17 原型链污染（字面量与转义形式）
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const PRIVILEGE_KEY = /^(?:is_?admin|admin|role|is_?staff|staff|permission|manager|superuser)$/i
const TOKEN_COOKIES = new Set(['token', 'session', 'auth', 'access_token', 'jwt'])
const MAX_DEPTH = 8
const DUPLICATE_WATCH = new Set([
  'alg', 'admin', 'is_admin', 'isadmin', 'is_staff', 'isstaff',
  'permission', 'manager', 'superuser', '__proto__', 'constructor', 'prototype',
])

function decodeUnicodeEscapes(text) {
  return String(text || '').replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    const code = Number.parseInt(hex, 16)
    if (!Number.isFinite(code) || (code >= 0xd800 && code <= 0xdbff)) return match
    return String.fromCharCode(code)
  })
}

function normalizeKey(key) {
  return decodeUnicodeEscapes(key).trim().toLowerCase()
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

function cookieValue(header, name) {
  for (const [key, value] of cookiePairs(header)) {
    if (key.toLowerCase() !== name) continue
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  return ''
}

export function inspectCookies(header) {
  const counts = new Map()
  for (const [name] of cookiePairs(header)) {
    const key = name.toLowerCase()
    if (!TOKEN_COOKIES.has(key)) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  for (const [name, count] of counts) {
    if (count > 1) return { reason: 'duplicate-cookie', detail: name }
  }
  return null
}

function normalizeAlg(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

/**
 * 同一对象内同名键检测（M13）。
 * 只跟踪 watch 里的键；数组里每个对象单独一个作用域，不会把两个用户的 role 误判成重复。
 */
export function findDuplicateKey(text, watch = DUPLICATE_WATCH) {
  const scopes = []
  let index = 0
  while (index < text.length) {
    const ch = text[index]
    if (ch === '"') {
      let end = index + 1
      while (end < text.length) {
        if (text[end] === '\\') { end += 2; continue }
        if (text[end] === '"') break
        end += 1
      }
      const raw = text.slice(index + 1, end)
      index = end + 1
      let cursor = index
      while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1
      if (text[cursor] === ':' && scopes.length > 0) {
        const key = normalizeKey(raw)
        if (watch.has(key)) {
          const scope = scopes[scopes.length - 1]
          if (scope.has(key)) return key
          scope.add(key)
        }
      }
      continue
    }
    if (ch === '{') { scopes.push(new Set()); index += 1; continue }
    if (ch === '}') { scopes.pop(); index += 1; continue }
    index += 1
  }
  return null
}

function decodeJwtHeader(token) {
  const parts = String(token || '').split('.')
  if (parts.length < 2 || parts[0] === '') return null
  const raw = Buffer.from(parts[0], 'base64url').toString('utf8')
  try {
    return { header: JSON.parse(raw), raw }
  } catch {
    return null
  }
}

export function inspectJwt(headers = {}) {
  const bearer = String(headers.authorization || '').replace(/^Bearer\s+/i, '')
  const token = bearer || cookieValue(headers.cookie, 'token')
  if (token === '') return null
  const decoded = decodeJwtHeader(token)
  if (decoded === null) return null
  const alg = normalizeAlg(decoded.header && decoded.header.alg)
  if (alg === 'none' || alg === '') {
    return { reason: 'jwt-none', detail: alg === '' ? 'missing-alg' : 'alg=none' }
  }
  const duplicate = findDuplicateKey(decoded.raw, new Set(['alg']))
  if (duplicate !== null) return { reason: 'duplicate-key', detail: `jwt.${duplicate}` }
  return null
}

function scanValue(value, depth = 0) {
  if (value === null || typeof value !== 'object') return null
  if (depth > MAX_DEPTH) return { reason: 'deep-nesting', detail: `depth>${MAX_DEPTH}` }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = scanValue(item, depth + 1)
      if (hit !== null) return hit
    }
    return null
  }
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizeKey(key)
    if (DANGEROUS_KEYS.has(normalized)) return { reason: 'prototype-pollution', detail: key }
    if (PRIVILEGE_KEY.test(normalized)) return { reason: 'privilege-field', detail: key }
    const hit = scanValue(item, depth + 1)
    if (hit !== null) return hit
  }
  return null
}

function inspectJsonText(text) {
  const duplicate = findDuplicateKey(text)
  if (duplicate !== null) return { reason: 'duplicate-key', detail: duplicate }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  return scanValue(parsed)
}

function parseMultipartJson(body, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  if (!match) return null
  const boundary = '--' + String(match[1] || match[2]).trim()
  for (const part of String(body).split(boundary)) {
    const trimmed = part.replace(/^\r\n/, '')
    if (trimmed.trim() === '' || trimmed.trim() === '--') continue
    const separator = trimmed.indexOf('\r\n\r\n')
    if (separator < 0) continue
    const head = trimmed.slice(0, separator)
    if (/filename\s*=/i.test(head)) continue
    const name = /name\s*=\s*"([^"]*)"/i.exec(head)
    if (name === null) continue
    const field = name[1].toLowerCase()
    if (field !== 'json' && field !== 'payload' && field !== 'data') continue
    const value = trimmed.slice(separator + 4).replace(/\r\n$/, '')
    return value
  }
  return null
}

export function inspectBody(body, contentType) {
  const text = String(body || '')
  if (text === '') return null
  const type = String(contentType || '').toLowerCase()

  if (type.includes('multipart/form-data')) {
    const part = parseMultipartJson(text, type)
    return part === null ? null : inspectJsonText(part)
  }

  if (type.includes('application/x-www-form-urlencoded')) {
    let params
    try {
      params = new URLSearchParams(text)
    } catch {
      return null
    }
    const all = params.getAll('json')
    if (all.length > 1) return { reason: 'duplicate-param', detail: 'json' }
    if (all.length === 1) return inspectJsonText(all[0])
    return null
  }

  const trimmed = text.trim()
  if (type.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return inspectJsonText(trimmed)
  }
  return null
}

export function inspectContent({ headers = {}, body = '', contentType = '' } = {}) {
  return inspectCookies(headers.cookie)
    || inspectJwt(headers)
    || inspectBody(body, contentType || headers['content-type'])
}
