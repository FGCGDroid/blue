/** 无人值守 agent 的纯判定逻辑：日志行解析 + 是否封禁。 */
export function parseLine(line) {
  const text = String(line || '').trim()
  if (text === '') return null
  if (text.startsWith('{')) {
    try {
      const event = JSON.parse(text)
      return event && typeof event === 'object' ? event : null
    } catch {
      return null
    }
  }
  const m = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*)" (\d{3}) \S+ "([^"]*)" "([^"]*)"/.exec(text)
  if (!m) return null
  return {
    at: new Date().toISOString(),
    remote: m[1],
    method: m[3],
    path: m[4].split(' ')[0].split('?')[0],
    raw_path: m[4],
    status: Number(m[5]),
    referer: m[6],
    user_agent: m[7],
    source: 'blue-agent',
  }
}

export function isPrivate(ip) {
  const value = String(ip || '')
  return value === '127.0.0.1' || value === '::1'
    || /^10\./.test(value) || /^192\.168\./.test(value)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(value) || /^169\.254\./.test(value)
}

/**
 * @returns {{reason: string, path: string, count?: number}|null}
 */
export function shouldBlock(event, state = {}) {
  const allow = state.allow instanceof Set ? state.allow : new Set(state.allow || [])
  const failures = state.failures instanceof Map ? state.failures : new Map()
  const now = typeof state.now === 'function' ? state.now() : Date.now()
  const ip = String(event.remote || '')
  if (!ip || ip === '-' || allow.has(ip) || isPrivate(ip)) return null
  if (!/^[0-9.]+$/.test(ip)) return null

  const raw = String(event.raw_path || event.path || '')
  const path = String(event.path || '')
  const ua = String(event.user_agent || '')
  const lower = raw.toLowerCase()

  // 上传 webshell：路径里出现上传目录 + 可执行脚本后缀
  if (/(?:\/upload|\/uploads|\/upfile|\/tmp|\/temp|\/attachment)[^\s?]*\.(?:php\d?|jspx?|aspx?|cgi|pl|sh)\b/i.test(lower)) {
    return { reason: 'upload-shell', path }
  }
  // XSS / 脚本注入：URL 或参数里带 script 标签、事件属性、javascript:
  if (/(?:%3c|<)\s*script|onerror\s*=|onload\s*=|javascript\s*:|document\.cookie|alert\s*\(/i.test(raw)) {
    return { reason: 'xss', path }
  }
  // 目录穿越
  if (/(?:\.\.\/|%2e%2e|%2f\.\.|\.\.%5c)/i.test(raw)) {
    return { reason: 'traversal', path }
  }
  if (/^\/(?:\.env|\.git|\.svn|\.hg|server-status|actuator|\.DS_Store|wp-config|config\.php\.bak|backup)/i.test(path)) {
    return { reason: 'sensitive-path', path }
  }
  if (/sqlmap|nikto|nuclei|gobuster|dirsearch|masscan|zgrab|acunetix|nessus/i.test(ua)) {
    return { reason: 'scanner-ua', path }
  }
  if (Number(event.status) === 401 || Number(event.status) === 403) {
    const entry = failures.get(ip) || { count: 0, first: now }
    if (now - entry.first > 60000) {
      entry.count = 0
      entry.first = now
    }
    entry.count += 1
    failures.set(ip, entry)
    if (entry.count >= 6) return { reason: 'auth-failures', path, count: entry.count }
  }
  return null
}
