/** 远程无人值守统一配置：TTL、白名单、默认值只在这里定义。 */
export const REMOTE_BAN = Object.freeze({
  ttlDefaultSec: 1800,
  ttlMinSec: 60,
  ttlMaxSec: 86400,
  defaultLog: '/www/wwwlogs/access.log',
  set: 'blocked',
  table: 'blue_guard',
})

export function normalizeTtl(value) {
  const seconds = Number(value) || REMOTE_BAN.ttlDefaultSec
  return Math.min(Math.max(Math.trunc(seconds), REMOTE_BAN.ttlMinSec), REMOTE_BAN.ttlMaxSec)
}

/** 逗号/空格分隔 → 去重小写 IP 列表；只接受 IPv4/IPv6 字符。 */
export function normalizeAllowIps(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  const out = []
  for (const part of raw.split(/[,\s]+/)) {
    const item = part.trim()
    if (item === '') continue
    const ipv4 = /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(item)
    const ipv6 = item.includes(':') && /^[0-9a-fA-F:]+$/.test(item)
    if (!ipv4 && !ipv6) continue
    if (!out.includes(item)) out.push(item)
  }
  return out
}
