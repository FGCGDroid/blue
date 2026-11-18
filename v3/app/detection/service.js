/** 3.0 检测规则匹配（Sigma-lite，M4.3）。 */
import { BlueError } from '../../domain/shared/errors.js'

function valueAt(event, path) {
  const parts = String(path).split('.')
  let cursor = event
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    if (part === '*') return Object.values(cursor)
    cursor = cursor[part]
  }
  return cursor
}

function equalish(actual, expected) {
  if (Array.isArray(actual)) return actual.some((item) => equalish(item, expected))
  if (typeof expected === 'string' && expected.includes('*')) {
    const pattern = new RegExp('^' + expected.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i')
    return typeof actual === 'string' && pattern.test(actual)
  }
  if (typeof expected === 'number') return Number(actual) === expected
  if (typeof expected === 'boolean') return Boolean(actual) === expected
  return String(actual ?? '').toLowerCase() === String(expected ?? '').toLowerCase()
}

export function matchRule(rule, event) {
  const selection = rule.selection && typeof rule.selection === 'object' ? rule.selection : {}
  const entries = Object.entries(selection)
  if (entries.length === 0) return false
  const checks = entries.map(([path, expected]) => {
    const actual = valueAt(event, path)
    const values = Array.isArray(expected) ? expected : [expected]
    return values.some((item) => equalish(actual, item))
  })
  return rule.condition === 'any' ? checks.some(Boolean) : checks.every(Boolean)
}

export function scanEvents(rules, events, options = {}) {
  const maxHits = Math.min(Math.max(Number(options.maxHits) || 1000, 1), 10000)
  const hits = []
  for (const event of events) {
    for (const rule of rules) {
      if (!rule.enabled) continue
      if (!matchRule(rule, event)) continue
      hits.push({
        rule: rule.rule_key,
        title: rule.title,
        severity: rule.severity,
        event,
      })
      if (hits.length >= maxHits) return { hits, truncated: true }
    }
  }
  return { hits, truncated: false }
}

export function addRule(store, engagementId, input = {}) {
  const rule = store.detection.upsert(engagementId, input)
  return { rule }
}

export function listRules(store, engagementId) {
  return { count: store.detection.list(engagementId).length, rules: store.detection.list(engagementId) }
}

export function scanSource(store, engagementId, sourceName, events, options = {}) {
  const source = store.telemetry.listSources(engagementId).find((item) => item.name === sourceName)
  if (!source) throw new BlueError('TELEMETRY_NOT_FOUND', '遥测源不存在：' + sourceName)
  const rules = store.detection.list(engagementId).filter((rule) => rule.enabled)
  const result = scanEvents(rules, events, options)
  return {
    source: source.name,
    scanned: events.length,
    rules: rules.length,
    ...result,
  }
}
