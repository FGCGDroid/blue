/** 3.0 检测规则匹配（Sigma-lite，M4.3）。 */
import { BlueError } from '../../domain/shared/errors.js'

export const BUILTIN_RULES = Object.freeze([
  {
    id: 'builtin-http-401-403',
    rule_key: 'builtin-http-401-403',
    title: '内置：HTTP 401/403 认证失败',
    severity: 'high',
    condition: 'any',
    enabled: true,
    source: 'builtin',
    selection: {
      status: [401, 403],
      status_code: [401, 403],
      'http.status': [401, 403],
      'http.status_code': [401, 403],
      'http.response.status_code': [401, 403],
      'response.status': [401, 403],
      'response.status_code': [401, 403],
      code: [401, 403],
    },
  },
  {
    id: 'builtin-auth-path',
    rule_key: 'builtin-auth-path',
    title: '内置：登录/管理路径失败',
    severity: 'high',
    condition: 'all',
    enabled: true,
    source: 'builtin',
    selection: {
      path: ['*login*', '*admin*', '*auth*', '*signin*'],
      'status|status_code|http.status|http.status_code|http.response.status_code|response.status|response.status_code': [401, 403],
    },
  },
  {
    id: 'builtin-windows-logon-fail',
    rule_key: 'builtin-windows-logon-fail',
    title: '内置：Windows 登录失败事件',
    severity: 'medium',
    condition: 'any',
    enabled: true,
    source: 'builtin',
    selection: {
      'event.code': [4625],
      'event.outcome': ['failure'],
    },
  },
  {
    id: 'builtin-webshell-file',
    rule_key: 'builtin-webshell-file',
    title: '内置：上传/临时目录 PHP 文件',
    severity: 'high',
    condition: 'any',
    enabled: true,
    source: 'builtin',
    selection: {
      path: ['*/uploads/*.php', '*/upload/*.php', '*/tmp/*.php', '*/temp/*.php'],
      file: ['*.php', '*.phtml', '*.phar'],
    },
  },
  {
    id: 'builtin-scanner',
    rule_key: 'builtin-scanner',
    title: '内置：扫描器/敏感路径',
    severity: 'medium',
    condition: 'any',
    enabled: true,
    source: 'builtin',
    selection: {
      user_agent: ['*sqlmap*', '*nikto*', '*nuclei*', '*masscan*', '*gobuster*', '*dirsearch*'],
      'http.user_agent': ['*sqlmap*', '*nikto*', '*nuclei*', '*masscan*', '*gobuster*', '*dirsearch*'],
      path: ['*/.git/*', '*/phpmyadmin*', '*/wp-admin*', '*/server-status*'],
    },
  },
  {
    id: 'builtin-gateway-block',
    rule_key: 'builtin-gateway-block',
    title: '内置：网关已阻断请求',
    severity: 'high',
    condition: 'all',
    enabled: true,
    source: 'builtin',
    selection: { decision: ['block'] },
  },
])

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

function valueAtAny(event, field) {
  for (const path of String(field).split('|')) {
    const value = valueAt(event, path)
    if (value !== undefined && value !== null) return { found: true, value }
  }
  return { found: false, value: undefined }
}

export function matchRule(rule, event) {
  const selection = rule.selection && typeof rule.selection === 'object' ? rule.selection : {}
  const entries = Object.entries(selection)
  if (entries.length === 0) return false
  const checks = entries.map(([path, expected]) => {
    const result = valueAtAny(event, path)
    if (!result.found) return false
    const values = Array.isArray(expected) ? expected : [expected]
    return values.some((item) => equalish(result.value, item))
  })
  return rule.condition === 'any' ? checks.some(Boolean) : checks.every(Boolean)
}

export function eventAlertFingerprint(sourceName, ruleKey, event = {}) {
  const at = Date.parse(String(event.at || event.time || event.ts || ''))
  const bucket = Number.isFinite(at) ? Math.floor(at / 60000) : Math.floor(Date.now() / 60000)
  const method = String(event.method || event.http?.method || '').toUpperCase()
  const path = String(event.path || event.url || event.http?.path || '')
  const status = String(event.status ?? event.status_code ?? event.http?.status ?? event.http?.status_code ?? event.http?.response?.status_code ?? '')
  const remote = String(event.remote || event.src_ip || event.http?.remote || '')
  const ua = String(event.user_agent || event.http?.user_agent || '').slice(0, 80)
  return [sourceName, ruleKey, method, path, status, remote, ua, bucket].join('|')
}

export function rulesFor(store, engagementId) {
  return [...BUILTIN_RULES, ...store.detection.list(engagementId)].filter((rule) => rule.enabled)
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
        source: rule.source || 'custom',
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
  const rules = rulesFor(store, engagementId)
  return {
    count: rules.length,
    rules,
    builtin: BUILTIN_RULES.length,
    custom: rules.length - BUILTIN_RULES.length,
  }
}

export function scanSource(store, engagementId, sourceName, events, options = {}) {
  const source = store.telemetry.listSources(engagementId).find((item) => item.name === sourceName)
  if (!source) throw new BlueError('TELEMETRY_NOT_FOUND', '遥测源不存在：' + sourceName)
  const rules = rulesFor(store, engagementId)
  const result = scanEvents(rules, events, options)
  return {
    source: source.name,
    scanned: events.length,
    rules: rules.length,
    ...result,
  }
}
