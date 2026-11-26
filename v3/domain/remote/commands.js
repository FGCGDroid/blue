/** nftables 封禁命令：只允许合法 IP，命令拼接统一在这里。 */
import { REMOTE_BAN } from './config.js'

export function validIp(ip) {
  const value = String(ip || '').trim()
  const ipv4 = /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/.test(value)
  const ipv6 = value.includes(':') && /^[0-9a-fA-F:]+$/.test(value)
  if (!ipv4 && !ipv6) return null
  return value
}

export function banElementCommand(ip, ttlSeconds = REMOTE_BAN.ttlDefaultSec) {
  const value = validIp(ip)
  if (value === null) return null
  const ttl = Math.min(Math.max(Number(ttlSeconds) || REMOTE_BAN.ttlDefaultSec, REMOTE_BAN.ttlMinSec), REMOTE_BAN.ttlMaxSec)
  return `nft add element inet ${REMOTE_BAN.table} ${REMOTE_BAN.set} '{ ${value} timeout ${ttl}s }'`
}

export function unbanElementCommand(ip) {
  const value = validIp(ip)
  if (value === null) return null
  return `nft delete element inet ${REMOTE_BAN.table} ${REMOTE_BAN.set} '{ ${value} }'`
}

export function flushBanCommand() {
  return `nft flush set inet ${REMOTE_BAN.table} ${REMOTE_BAN.set}`
}
