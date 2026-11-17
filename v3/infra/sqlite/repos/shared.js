/** SQLite 仓储共享工具（3.0，M2）。 */
import { createHash, randomUUID } from 'node:crypto'

export function newId(prefix) {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

export function fingerprintOf(parts) {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32)
}

export function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function parseJson(text, fallback) {
  if (typeof text !== 'string' || text === '') return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

export const SEVERITIES = Object.freeze(['critical', 'high', 'medium', 'low', 'info'])

export function clampSeverity(value, fallback = 'medium') {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return SEVERITIES.includes(normalized) ? normalized : fallback
}

export function normalizeIocValue(type, raw) {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (type === 'domain' || type === 'hostname') return value.toLowerCase().replace(/\.$/, '')
  if (type === 'hash' || type === 'md5' || type === 'sha1' || type === 'sha256') return value.toLowerCase()
  if (type === 'ip') return value.toLowerCase()
  if (type === 'url') {
    try {
      const url = new URL(value)
      url.hostname = url.hostname.toLowerCase()
      return url.toString()
    } catch {
      return value
    }
  }
  return value
}
