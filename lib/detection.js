/**
 * Sigma-lite 检测规则：JSON selection + all/any，不执行表达式。
 *
 * selection 形如：
 *   { "path": ["/admin*"], "status": [401, 403] }
 * 字段名支持点路径；值支持字符串通配符 *，数组表示任一。
 */

export const SELECTION_CONDITIONS = ['all', 'any']

export function parseSelection(input) {
  const value = typeof input === 'string' ? input.trim() : input
  if (value === '' || value === null || value === undefined) throw new Error('selection 不能为空')
  let parsed = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) } catch { throw new Error('selection 必须是 JSON 对象') }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('selection 必须是 JSON 对象')
  const fields = Object.keys(parsed)
  if (fields.length === 0) throw new Error('selection 至少需要一个字段')
  return parsed
}

function flatten(value, prefix = '', out = {}) {
  if (value === null || typeof value !== 'object') {
    if (prefix !== '') out[prefix] = value
    return out
  }
  if (Array.isArray(value)) {
    out[prefix] = value
    return out
  }
  for (const [key, item] of Object.entries(value)) {
    const next = prefix === '' ? key : `${prefix}.${key}`
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) flatten(item, next, out)
    else out[next] = item
  }
  return out
}

function wildcard(value) {
  const escaped = String(value).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

function valueMatches(actual, expected) {
  if (Array.isArray(expected)) return expected.some((item) => valueMatches(actual, item))
  if (actual === undefined || actual === null) return false
  if (typeof expected === 'string' && expected.includes('*')) return wildcard(expected).test(String(actual))
  return String(actual).toLowerCase() === String(expected).toLowerCase()
}

export function matchRule(rule, event) {
  const selection = typeof rule.selection === 'string' ? JSON.parse(rule.selection) : rule.selection
  if (selection === null || typeof selection !== 'object') return false
  const flat = flatten(event)
  const condition = rule.condition === 'any' ? 'any' : 'all'
  const checks = Object.entries(selection).map(([field, expected]) => valueMatches(flat[field], expected))
  return condition === 'any' ? checks.some(Boolean) : checks.every(Boolean)
}

export function ruleFromRow(row) {
  return {
    id: row.id,
    rule_key: row.rule_key,
    title: row.title,
    severity: row.severity,
    condition: row.condition,
    tags: (() => { try { return JSON.parse(row.tags || '[]') } catch { return [] } })(),
    selection: (() => { try { return JSON.parse(row.selection || '{}') } catch { return {} } })(),
  }
}

export function loadRules(store, engagementId) {
  return store.sql('SELECT * FROM detection_rules WHERE engagement_id = ? AND enabled = 1 ORDER BY rule_key')
    .all(engagementId).map(ruleFromRow)
}

export function matchAny(rules, event) {
  for (const rule of rules) {
    try {
      if (matchRule(rule, event)) return rule
    } catch { /* 单条规则坏掉不影响其他规则 */ }
  }
  return null
}
