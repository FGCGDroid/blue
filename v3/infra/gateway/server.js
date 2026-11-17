/**
 * 3.0 独立网关（M3）。
 *
 * 固定顺序：
 *   走私头 -> 绕过头 -> 规范化 -> 策略 -> 读 body -> 内容检查 -> 转发
 *
 * 路径阻断发生在 readBody 之前；block 不读 body。
 * 网关不写 SQLite；决策日志写 JSONL。
 */
import http from 'node:http'
import { statSync } from 'node:fs'
import { inspectSmuggling } from '../../domain/gateway/headers.js'
import { inspectContent } from '../../domain/gateway/content.js'
import { normalizeRequestPath } from '../../domain/gateway/normalize.js'
import { evaluatePolicy, policyHash, validatePolicy } from '../../domain/gateway/policy.js'
import { createDecision } from '../../domain/gateway/decision.js'
import { loadPolicy } from '../policy/store.js'
import { reloadPolicy } from '../policy/reload.js'
import { appendDecision } from './decision-log.js'
import { readBody } from './read-body.js'
import { forwardRequest } from './forward.js'
import { createCounters } from '../metrics/counters.js'
import { renderMetrics } from '../metrics/server.js'

const HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
])

const BYPASS_HEADERS = new Set([
  'x-original-url', 'x-rewrite-url', 'x-forwarded-prefix',
  'x-forwarded-uri', 'x-forwarded-path', 'x-envoy-original-path',
])

function isLoopbackRemote(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  if (res.headersSent) return
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8')
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': buffer.length,
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
  })
  res.end(buffer)
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8')
}

export async function startGateway(config, deps = {}) {
  const upstream = new URL(deps.upstream || config.upstream)
  const policyPath = deps.policyPath || config.policyPath
  const logPath = deps.logPath || config.logPath
  const mode = deps.mode || config.mode || 'enforce'
  const maxBody = Math.min(Math.max(Number(deps.maxBody ?? config.maxBody) || 1024 * 1024, 1024), 8 * 1024 * 1024)
  const timeoutMs = Math.min(Math.max(Number(deps.timeoutMs) || 15000, 1000), 60000)
  const logAllow = deps.logAllow === true || process.env.BLUE_GATEWAY_LOG_ALLOW === '1'
  const logger = deps.logger || console
  const counters = deps.counters || createCounters()

  let loaded
  if (deps.policy) {
    const policy = validatePolicy(deps.policy)
    loaded = { policy, hash: policyHash(policy), path: policyPath, source: 'injected' }
  } else {
    loaded = loadPolicy(policyPath)
  }

  let policy = loaded.policy
  let currentHash = loaded.hash
  let lastMtime = 0
  try { lastMtime = statSync(policyPath).mtimeMs } catch { /* 缺失时使用默认策略 */ }

  const startedAt = Date.now()

  const server = http.createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
    handle(req, res).catch((error) => {
      logger.warn?.('gateway handler error: %s', error && error.message ? error.message : String(error))
      if (!res.headersSent) send(res, 500, 'internal error')
      else res.destroy()
    })
  })

  async function handle(req, res) {
    const started = Date.now()
    const rawUrl = String(req.url || '')
    const remote = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : ''
    const method = req.method || 'GET'
    const pathOnly = rawUrl.split('?')[0]

    if (pathOnly === '/healthz' || pathOnly === '/metrics') {
      if (!isLoopbackRemote(remote)) {
        send(res, 404, 'not found')
        return
      }
      if (pathOnly === '/healthz') {
        sendJson(res, 200, {
          ok: true,
          mode,
          policy_hash: currentHash,
          uptime_sec: Math.floor((Date.now() - startedAt) / 1000),
          version: '3.0.0-dev',
        })
        return
      }
      send(res, 200, renderMetrics(counters), 'text/plain; version=0.0.4; charset=utf-8')
      return
    }

    counters.inc('blue_gateway_requests_total')
    const decision = createDecision({
      remote,
      method,
      raw_path: rawUrl,
      policy_version: policy.version,
      policy_hash: currentHash,
    })

    const finish = (status, upstreamStatus = 0) => {
      decision.upstream_status = upstreamStatus || 0
      decision.duration_ms = Date.now() - started
      if (decision.decision === 'block' || logAllow) {
        const result = appendDecision(logPath, decision)
        if (!result.ok) counters.inc('blue_gateway_log_errors_total')
      }
      if (status >= 400) {
        counters.inc('blue_gateway_blocked_total', { rule: decision.rule_id || decision.reason })
      }
    }

    const block = (status, reason, ruleId, text = 'request blocked') => {
      decision.decision = 'block'
      decision.reason = reason
      decision.rule_id = ruleId
      send(res, status, text)
      finish(status)
      req.resume()
    }

    const smuggling = inspectSmuggling(req.rawHeaders)
    if (smuggling !== null) {
      block(400, 'SMUGGLING', 'header:smuggling', 'bad request')
      return
    }

    for (const name of Object.keys(req.headers)) {
      if (BYPASS_HEADERS.has(name.toLowerCase())) {
        block(400, 'BYPASS_HEADER', 'header:bypass', 'bad request')
        return
      }
    }

    const normalized = normalizeRequestPath(rawUrl, policy)
    if (!normalized.ok) {
      decision.canonical_path = null
      block(400, normalized.reason, `normalize:${normalized.reason}`, 'bad request')
      return
    }

    decision.canonical_path = normalized.canonical
    decision.query = normalized.query
    const verdict = evaluatePolicy(normalized.canonical, policy)
    if (verdict.decision === 'block') {
      block(403, verdict.reason, verdict.rule_id)
      return
    }

    let body
    try {
      body = await readBody(req, maxBody)
    } catch {
      block(400, 'BAD_BODY', 'body:read', 'bad request')
      return
    }
    if (body.tooLarge) {
      block(413, 'BODY_TOO_LARGE', 'body:too-large', 'request body too large')
      return
    }

    const hit = inspectContent({
      headers: req.headers,
      body: body.body.toString('utf8'),
      contentType: String(req.headers['content-type'] || ''),
    })
    if (hit !== null) {
      block(403, hit.reason, `content:${hit.reason}`)
      return
    }

    const targetPath = normalized.canonical + (normalized.query ? '?' + normalized.query : '')
    let response
    try {
      response = await forwardRequest(upstream, req, {
        body: body.body,
        path: targetPath,
        timeoutMs,
      })
    } catch (error) {
      counters.inc('blue_gateway_upstream_errors_total')
      decision.reason = 'UPSTREAM_ERROR'
      decision.rule_id = 'upstream:error'
      send(res, 502, 'upstream error')
      finish(502, 502)
      return
    }

    counters.inc('blue_gateway_allowed_total')
    const headers = {}
    for (const [name, value] of Object.entries(response.headers)) {
      if (value === undefined || HOP.has(name.toLowerCase()) || name.toLowerCase() === 'content-length') continue
      headers[name] = value
    }
    headers['content-length'] = String(response.body.length)
    res.writeHead(response.status, headers)
    res.end(response.body)
    finish(response.status, response.status)
  }

  let timer = null
  if (deps.watchPolicy !== false && policyPath) {
    timer = setInterval(() => {
      let mtime
      try {
        mtime = statSync(policyPath).mtimeMs
      } catch {
        return
      }
      if (mtime === lastMtime) return
      lastMtime = mtime
      const result = reloadPolicy(policyPath, currentHash)
      if (result.error) {
        counters.inc('blue_gateway_policy_reload_total', { result: 'error' })
        logger.warn?.('gateway policy reload failed: %s', result.error.message)
        return
      }
      if (result.changed) {
        policy = result.policy
        currentHash = result.hash
        counters.inc('blue_gateway_policy_reload_total', { result: 'ok' })
        logger.info?.('gateway policy reloaded: %s', currentHash)
      }
    }, 1000)
    timer.unref?.()
  }

  server.requestTimeout = 10000
  server.headersTimeout = 5000
  server.keepAliveTimeout = 5000
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
  })

  const host = deps.host || config.host || '127.0.0.1'
  const port = deps.port === undefined ? config.port : Number(deps.port)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.off('error', reject)
      resolve()
    })
  })
  const address = server.address()
  const actualPort = address && typeof address === 'object' ? address.port : port

  return {
    server,
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    upstream: upstream.origin,
    mode,
    counters,
    logPath,
    get policyHash() { return currentHash },
    reload() {
      const result = reloadPolicy(policyPath, currentHash)
      if (result.error) {
        counters.inc('blue_gateway_policy_reload_total', { result: 'error' })
        return result
      }
      if (result.changed) {
        policy = result.policy
        currentHash = result.hash
        counters.inc('blue_gateway_policy_reload_total', { result: 'ok' })
      }
      return result
    },
    async close() {
      if (timer) clearInterval(timer)
      server.closeAllConnections?.()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}
