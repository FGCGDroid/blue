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

/**
 * 内置必须拦的路径。
 *
 * kind='dir' 按段边界覆盖子资源（M32：/backup 拦 403 时，/backup/flag.txt 也要拦）；
 * kind='file' 额外覆盖 .bak/.old/~/备份后缀，避免 /wp-config.php.bak 漏过去。
 * 只放“正常业务几乎不会公开提供”的东西，宁可少而准。
 */
export const BUILTIN_DENY = Object.freeze([
  { id: 'git', prefix: '/.git' },
  { id: 'svn', prefix: '/.svn' },
  { id: 'hg', prefix: '/.hg' },
  { id: 'bzr', prefix: '/.bzr' },
  { id: 'ssh', prefix: '/.ssh' },
  { id: 'aws', prefix: '/.aws' },
  { id: 'env', prefix: '/.env', kind: 'file' },
  { id: 'ds-store', prefix: '/.ds_store', kind: 'file' },
  { id: 'htaccess', prefix: '/.htaccess', kind: 'file' },
  { id: 'htpasswd', prefix: '/.htpasswd', kind: 'file' },
  { id: 'npmrc', prefix: '/.npmrc', kind: 'file' },
  { id: 'wp-config', prefix: '/wp-config.php', kind: 'file' },
  { id: 'phpinfo', prefix: '/phpinfo.php', kind: 'file' },
  { id: 'server-status', prefix: '/server-status' },
  { id: 'actuator-env', prefix: '/actuator/env' },
  { id: 'actuator-heapdump', prefix: '/actuator/heapdump' },
  { id: 'pprof', prefix: '/debug/pprof' },
  { id: 'backup-dir', prefix: '/backup' },
  { id: 'backups-dir', prefix: '/backups' },
  { id: 'sql-backup', prefix: '/backup.sql', kind: 'file' },
  { id: 'sql-dump', prefix: '/dump.sql', kind: 'file' },
  { id: 'sql-db', prefix: '/db.sql', kind: 'file' },
  { id: 'sql-database', prefix: '/database.sql', kind: 'file' },
  { id: 'sqlite-backup', prefix: '/db.sqlite', kind: 'file' },
  { id: 'zip-www', prefix: '/www.zip', kind: 'file' },
  { id: 'zip-site', prefix: '/site.zip', kind: 'file' },
  { id: 'zip-web', prefix: '/web.zip', kind: 'file' },
  { id: 'tar-backup', prefix: '/backup.tar.gz', kind: 'file' },
])

/**
 * 可疑但可能业务真在用：只提示，不默认拦（拦错会把网站打坏）。
 * 出现在 protectionStatus 的建议里，由人决定要不要加 protected。
 */
export const ADVISORY_PATHS = Object.freeze([
  { prefix: '/config.json', why: '配置接口/文件可能泄露 isAdmin、env（M21）' },
  { prefix: '/settings.json', why: '配置接口/文件可能泄露判定位（M21）' },
  { prefix: '/appsettings.json', why: '.NET 配置可能含连接串（M21）' },
  { prefix: '/web.config', why: 'IIS 配置可能被下载' },
  { prefix: '/api/config', why: '未授权配置接口（M21）' },
  { prefix: '/debug', why: '调试入口可能无鉴权（M03/M23）' },
  { prefix: '/internal', why: '内部入口可能无鉴权' },
  { prefix: '/package.json', why: '依赖清单泄露组件版本' },
])

export const DEFAULT_POLICY = Object.freeze({
  version: 1,
  default_action: 'allow',
  case_insensitive: true,
  max_path_length: 4096,
  reject_semicolon: true,
  protected: Object.freeze([]),
  deny: Object.freeze([]),
  builtin_allow: Object.freeze([]),
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
  if (input.builtin_allow !== undefined && !Array.isArray(input.builtin_allow)) {
    invalid('builtin_allow 必须是数组')
  }
  const builtinAllow = (Array.isArray(input.builtin_allow) ? input.builtin_allow : []).map((item, index) => {
    if (typeof item !== 'string') invalid(`builtin_allow[${index}] 必须是字符串`)
    return normalizePrefix(item, `builtin_allow[${index}]`)
  })
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
    builtin_allow: builtinAllow,
  }
}

export function policyHash(policy) {
  return createHash('sha256').update(canonicalJson(policy)).digest('hex').slice(0, 16)
}

function boundaryMatch(path, prefix, caseInsensitive, kind = 'dir') {
  const left = caseInsensitive ? path.toLowerCase() : path
  const right = caseInsensitive ? prefix.toLowerCase() : prefix
  if (left === right) return true
  if (left.startsWith(right + '/')) return true
  if (kind === 'file') {
    return left.startsWith(right + '.') || left.startsWith(right + '~') || left.startsWith(right + '_')
  }
  return false
}

export function isBuiltinDenied(canonicalPath, policy, caseInsensitive = true) {
  for (const allowed of policy.builtin_allow || []) {
    if (boundaryMatch(canonicalPath, allowed, caseInsensitive)) return null
  }
  for (const rule of BUILTIN_DENY) {
    if (boundaryMatch(canonicalPath, rule.prefix, caseInsensitive, rule.kind)) {
      return { rule_id: `builtin:${rule.id}`, prefix: rule.prefix }
    }
  }
  return null
}

export function evaluatePolicy(canonicalPath, policy) {
  if (typeof canonicalPath !== 'string' || canonicalPath === '') {
    throw new BlueError('POLICY_EVAL', 'canonicalPath 不能为空')
  }
  const caseInsensitive = policy.case_insensitive !== false

  const builtin = isBuiltinDenied(canonicalPath, policy, caseInsensitive)
  if (builtin !== null) {
    return { decision: 'block', rule_id: builtin.rule_id, reason: 'DENY_RULE' }
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
