/**
 * 路径策略（3.0，M3）。
 *
 * 判定顺序：
 *   builtin deny -> policy deny -> protected allow -> protected block -> default
 *
 * 保护前缀按路径段边界匹配：/admin 匹配 /admin 和 /admin/...，
 * 不匹配 /administrator。
 */
import { createHash } from 'node:crypto'
import { canonicalJson } from '../shared/json.js'
import { BlueError } from '../shared/errors.js'

export const BUILTIN_DENY = Object.freeze([
  { id: 'git', prefix: '/.git' },
  { id: 'svn', prefix: '/.svn' },
  { id: 'env', prefix: '/.env' },
  { id: 'server-status', prefix: '/server-status' },
  { id: 'actuator-env', prefix: '/actuator/env' },
  { id: 'actuator-heapdump', prefix: '/actuator/heapdump' },
  { id: 'pprof', prefix: '/debug/pprof' },
])

export const DEFAULT_POLICY = Object.freeze({
  version: 1,
  default_action: 'allow',
  case_insensitive: true,
  max_path_length: 4096,
  reject_semicolon: true,
  protected: Object.freeze([
    Object.freeze({ id: 'admin', prefix: '/admin', action: 'block', allow: Object.freeze([]) }),
    Object.freeze({ id: 'manage', prefix: '/manage', action: 'block', allow: Object.freeze([]) }),
    Object.freeze({ id: 'console', prefix: '/console', action: 'block', allow: Object.freeze([]) }),
  ]),
  deny: Object.freeze([]),
})

function invalid(message, details = {}) {
  throw new BlueError('POLICY_INVALID', message, details)
}

function normalizePrefix(value, field) {
  if (typeof value !== 'string') invalid(`${field} 必须是字符串`)
  if (!value.startsWith('/')) invalid(`${field} 必须以 / 开头`)
  if (value === '/') invalid(`${field} 不能是根路径`)
  if (value.includes('?') || value.includes('#')) invalid(`${field} 不能含 query/fragment`)
  if (value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) invalid(`${field} 含非法字符`)
  if (/%(?![0-9a-fA-F]{2})/.test(value) || /%2f|%5c/i.test(value)) invalid(`${field} 不能含编码分隔符`)
  if (value.includes('/./') || value.includes('/../') || value.startsWith('/./') || value.startsWith('/../')) {
    invalid(`${field} 不能含点段`)
  }
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value
}

function normalizeRule(rule, field, options = {}) {
  if (rule === null || typeof rule !== 'object') invalid(`${field} 必须是对象`)
  const id = typeof rule.id === 'string' ? rule.id.trim() : ''
  if (id === '') invalid(`${field}.id 不能为空`)
  const prefix = normalizePrefix(rule.prefix, `${field}.prefix`)
  if (rule.action !== undefined && rule.action !== 'block') {
    invalid(`${field}.action 只能是 block`)
  }
  const normalized = { id, prefix, action: 'block' }
  if (options.allow === true) {
    if (rule.allow !== undefined && !Array.isArray(rule.allow)) {
      invalid(`${field}.allow 必须是数组`)
    }
    const allow = Array.isArray(rule.allow) ? rule.allow : []
    normalized.allow = allow.map((item, index) => {
      if (typeof item !== 'string' || !item.startsWith('/')) {
        invalid(`${field}.allow[${index}] 必须是绝对路径`)
      }
      return normalizePrefix(item, `${field}.allow[${index}]`)
    })
  }
  return normalized
}

export function validatePolicy(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    invalid('policy 必须是对象')
  }
  if (input.version !== 1) invalid('policy.version 必须是 1')
  if (input.default_action !== 'allow' && input.default_action !== 'block') {
    invalid('default_action 必须是 allow/block')
  }
  const maxLength = input.max_path_length === undefined ? 4096 : Number(input.max_path_length)
  if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 65535) {
    invalid('max_path_length 必须是 1..65535 的整数')
  }
  if (input.case_insensitive !== undefined && typeof input.case_insensitive !== 'boolean') {
    invalid('case_insensitive 必须是布尔值')
  }
  if (input.reject_semicolon !== undefined && typeof input.reject_semicolon !== 'boolean') {
    invalid('reject_semicolon 必须是布尔值')
  }

  const seenIds = new Set()
  const seenPrefixes = new Set()
  if (input.protected !== undefined && !Array.isArray(input.protected)) {
    invalid('protected 必须是数组')
  }
  if (input.deny !== undefined && !Array.isArray(input.deny)) {
    invalid('deny 必须是数组')
  }
  const protectedRules = (Array.isArray(input.protected) ? input.protected : []).map((rule, index) => {
    const normalized = normalizeRule(rule, `protected[${index}]`, { allow: true })
    if (seenIds.has(normalized.id)) invalid(`重复规则 id：${normalized.id}`)
    if (seenPrefixes.has(normalized.prefix)) invalid(`重复前缀：${normalized.prefix}`)
    seenIds.add(normalized.id)
    seenPrefixes.add(normalized.prefix)
    for (const allowed of normalized.allow) {
      if (allowed !== normalized.prefix && !allowed.startsWith(normalized.prefix + '/')) {
        invalid(`protected[${index}].allow 必须在保护前缀下：${allowed}`)
      }
    }
    return normalized
  })

  const denyRules = (Array.isArray(input.deny) ? input.deny : []).map((rule, index) => {
    const normalized = normalizeRule(rule, `deny[${index}]`)
    if (seenIds.has(normalized.id)) invalid(`重复规则 id：${normalized.id}`)
    if (seenPrefixes.has(normalized.prefix)) invalid(`重复前缀：${normalized.prefix}`)
    seenIds.add(normalized.id)
    seenPrefixes.add(normalized.prefix)
    return normalized
  })

  return {
    version: 1,
    default_action: input.default_action,
    case_insensitive: input.case_insensitive !== false,
    max_path_length: maxLength,
    reject_semicolon: input.reject_semicolon !== false,
    protected: protectedRules,
    deny: denyRules,
  }
}

export function policyHash(policy) {
  return createHash('sha256').update(canonicalJson(policy)).digest('hex').slice(0, 16)
}

function boundaryMatch(path, prefix, caseInsensitive) {
  const left = caseInsensitive ? path.toLowerCase() : path
  const right = caseInsensitive ? prefix.toLowerCase() : prefix
  return left === right || left.startsWith(right + '/')
}

export function evaluatePolicy(canonicalPath, policy) {
  if (typeof canonicalPath !== 'string' || canonicalPath === '') {
    throw new BlueError('POLICY_EVAL', 'canonicalPath 不能为空')
  }
  const caseInsensitive = policy.case_insensitive !== false

  for (const rule of BUILTIN_DENY) {
    if (boundaryMatch(canonicalPath, rule.prefix, caseInsensitive)) {
      return { decision: 'block', rule_id: `builtin:${rule.id}`, reason: 'DENY_RULE' }
    }
  }

  for (const rule of policy.deny || []) {
    if (boundaryMatch(canonicalPath, rule.prefix, caseInsensitive)) {
      return { decision: 'block', rule_id: rule.id, reason: 'DENY_RULE' }
    }
  }

  let matched = null
  for (const rule of policy.protected || []) {
    if (!boundaryMatch(canonicalPath, rule.prefix, caseInsensitive)) continue
    if (matched === null || rule.prefix.length > matched.prefix.length) matched = rule
  }

  if (matched !== null) {
    for (const allowed of matched.allow || []) {
      if (boundaryMatch(canonicalPath, allowed, caseInsensitive)) {
        return { decision: 'allow', rule_id: matched.id, reason: 'ALLOW_RULE' }
      }
    }
    return { decision: 'block', rule_id: matched.id, reason: 'PROTECTED_PREFIX' }
  }

  if (policy.default_action === 'block') {
    return { decision: 'block', rule_id: 'default', reason: 'DEFAULT_BLOCK' }
  }
  return { decision: 'allow', rule_id: 'default', reason: 'DEFAULT_ALLOW' }
}
