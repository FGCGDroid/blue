/**
 * 3.0 配置解析（骨架）。
 *
 * 只解析网关需要的环境变量。默认值按设计文档：
 *   127.0.0.1:8787
 *   mode=enforce
 *   upstream=http://127.0.0.1:8080
 *
 * 非法配置直接抛错，不自动降级。
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { BlueError } from '../domain/shared/errors.js'

const MODES = new Set(['off', 'observe', 'enforce'])
const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost'])

function truthy(value) {
  return value === '1' || value === 'true'
}

function dataDirOf(env) {
  if (env.BLUE_HOME) return env.BLUE_HOME
  const home = env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'blue')
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function loadConfig(env = process.env) {
  const mode = String(env.BLUE_GATEWAY_MODE || 'enforce').trim().toLowerCase()
  if (!MODES.has(mode)) {
    throw new BlueError('CONFIG_MODE', 'BLUE_GATEWAY_MODE 必须是 off / observe / enforce')
  }

  const host = String(env.BLUE_GATEWAY_HOST || '127.0.0.1').trim().toLowerCase()
  const port = Number(env.BLUE_GATEWAY_PORT ?? 8787)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BlueError('CONFIG_PORT', 'BLUE_GATEWAY_PORT 必须是 1..65535 的整数')
  }

  const allowPublic = truthy(env.BLUE_GATEWAY_ALLOW_PUBLIC)
  if (!LOOPBACK.has(host) && !allowPublic) {
    throw new BlueError('CONFIG_HOST', '非回环监听需要 BLUE_GATEWAY_ALLOW_PUBLIC=1')
  }

  const upstreamRaw = String(env.BLUE_GATEWAY_UPSTREAM || 'http://127.0.0.1:8080').trim()
  let upstream
  try {
    upstream = new URL(upstreamRaw)
  } catch {
    throw new BlueError('CONFIG_UPSTREAM', 'BLUE_GATEWAY_UPSTREAM 不是合法 URL')
  }
  if (upstream.protocol !== 'http:' && upstream.protocol !== 'https:') {
    throw new BlueError('CONFIG_UPSTREAM', 'BLUE_GATEWAY_UPSTREAM 只支持 http/https')
  }
  if (upstream.username !== '' || upstream.password !== '') {
    throw new BlueError('CONFIG_UPSTREAM', 'BLUE_GATEWAY_UPSTREAM 不能带用户名/密码')
  }
  if (upstream.pathname !== '/' || upstream.search !== '' || upstream.hash !== '') {
    throw new BlueError('CONFIG_UPSTREAM', 'BLUE_GATEWAY_UPSTREAM 只接受 origin，不能带 path/query/fragment')
  }
  const allowPublicUpstream = truthy(env.BLUE_GATEWAY_ALLOW_PUBLIC_UPSTREAM)
  if (!LOOPBACK.has(upstream.hostname) && !allowPublicUpstream) {
    throw new BlueError('CONFIG_UPSTREAM', '非回环上游需要 BLUE_GATEWAY_ALLOW_PUBLIC_UPSTREAM=1')
  }

  const dataDir = dataDirOf(env)
  return Object.freeze({
    mode,
    host,
    port,
    upstream: upstream.origin,
    dataDir,
    policyPath: env.BLUE_GATEWAY_POLICY || join(dataDir, 'path-policy.json'),
    logPath: env.BLUE_GATEWAY_LOG || join(dataDir, 'gateway-decisions.jsonl'),
    anchorSinksPath: env.BLUE_ANCHOR_SINKS || join(dataDir, 'anchor-sinks.json'),
  })
}
