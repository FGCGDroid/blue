/**
 * 路径规范化（3.0，M3）。
 *
 * 顺序固定：
 *   origin/absolute-form -> 切 query -> 拒绝 #、控制字符、反斜杠、编码分隔符
 *   -> 百分号解码一次 -> 拒绝二次编码 -> 拒绝点段/分号/尾随点空格
 *   -> canonical
 *
 * 失败一律返回 { ok:false }，调用方不得转发。
 */
const CONTROL = /[\u0000-\u001f\u007f]/

function reject(query, reason, detail = '') {
  return { ok: false, canonical: null, query, reason, detail }
}

function decodeOnce(path) {
  if (/%(?![0-9a-fA-F]{2})/.test(path)) {
    return { ok: false, reason: 'BAD_PERCENT', detail: 'malformed percent escape' }
  }
  try {
    return { ok: true, value: decodeURIComponent(path) }
  } catch {
    return { ok: false, reason: 'BAD_UTF8', detail: 'invalid utf-8 escape' }
  }
}

export function normalizeRequestPath(rawUrl, policy = {}) {
  const maxLength = Math.min(Math.max(Number(policy.max_path_length) || 4096, 1), 65535)
  const raw = String(rawUrl ?? '')
  if (raw === '') return reject('', 'EMPTY', 'empty request target')
  if (raw.length > maxLength) return reject('', 'TOO_LONG', `path longer than ${maxLength}`)

  let value = raw
  if (/^https?:\/\//i.test(value)) {
    let parsed
    try {
      parsed = new URL(value)
    } catch {
      return reject('', 'BAD_ABSOLUTE_FORM', 'invalid absolute-form url')
    }
    if (parsed.hash !== '') return reject(parsed.search.slice(1), 'FRAGMENT', 'fragment not allowed')
    value = parsed.pathname + parsed.search
  }

  if (value.startsWith('*')) return reject('', 'ASTERISK_FORM', 'asterisk-form not allowed')
  if (!value.startsWith('/')) return reject('', 'NOT_ORIGIN_FORM', 'request target must start with /')

  const question = value.indexOf('?')
  const pathPart = question >= 0 ? value.slice(0, question) : value
  const query = question >= 0 ? value.slice(question + 1) : ''

  if (pathPart.includes('#')) return reject(query, 'FRAGMENT', 'fragment not allowed')
  if (CONTROL.test(pathPart)) return reject(query, 'CONTROL_CHAR', 'control character in path')
  if (pathPart.includes('\\')) return reject(query, 'BACKSLASH', 'backslash in path')
  if (/%2f|%5c/i.test(pathPart)) {
    return reject(query, 'ENCODED_SEPARATOR', 'encoded path separator')
  }

  const decoded = decodeOnce(pathPart)
  if (!decoded.ok) return reject(query, decoded.reason, decoded.detail)

  let path = decoded.value
  if (CONTROL.test(path)) return reject(query, 'CONTROL_CHAR', 'control character after decode')
  if (path.includes('\\')) return reject(query, 'BACKSLASH', 'backslash after decode')
  if (/%[0-9a-fA-F]{2}/.test(path)) {
    return reject(query, 'DOUBLE_ENCODED', 'double-encoded percent escape')
  }

  path = path.normalize('NFC')

  const segments = []
  for (const segment of path.split('/')) {
    if (segment === '') continue

    if (segment === '.' || segment === '..') {
      if (policy.allow_dot_segments !== true) {
        return reject(query, 'DOT_SEGMENT', 'dot segment not allowed')
      }
      if (segment === '..') {
        if (segments.length === 0) return reject(query, 'TRAVERSAL', 'path escapes root')
        segments.pop()
      }
      continue
    }

    let clean = segment
    if (clean.includes(';')) {
      if (policy.reject_semicolon !== false) {
        return reject(query, 'MATRIX_PARAM', 'semicolon matrix parameter')
      }
      clean = clean.split(';')[0]
      if (clean === '') continue
    }

    if (clean.endsWith('.') || clean.endsWith(' ')) {
      return reject(query, 'SUSPICIOUS_SEGMENT', 'trailing dot or space')
    }
    segments.push(clean)
  }

  const canonical = segments.length === 0 ? '/' : '/' + segments.join('/')
  return { ok: true, canonical, query, reason: '', detail: '' }
}
