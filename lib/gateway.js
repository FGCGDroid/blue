/**
 * 可选内联 HTTP 网关：同一入口上做检查、访问日志，再转发到上游。
 *
 * 它不会自己改端口/防火墙；只有把上游服务藏到代理后面，网关才是必经路径。
 */
import { createServer, request as httpRequest } from 'node:http'
import { appendFileSync, mkdirSync, accessSync, constants as fsConstants } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { inspectRequest, rawPathOf } from './inline-guard.js'

const HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
])

function isLoopback(host) {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost'
}

function ensureLogPath(requested) {
  if (requested) {
    mkdirSync(dirname(requested), { recursive: true })
    return requested
  }
  const preferred = join(process.env.BLUE_LOG_DIR || join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'blue'), 'inline-gateway.jsonl')
  const fallback = join(process.cwd(), '.blue-gateway', 'inline-gateway.jsonl')
  for (const candidate of [preferred, fallback]) {
    try {
      mkdirSync(dirname(candidate), { recursive: true })
      appendFileSync(candidate, '')
      accessSync(dirname(candidate), fsConstants.W_OK)
      return candidate
    } catch { /* 试下一个 */ }
  }
  throw new Error('没有可写的网关日志目录；用 --log 或 BLUE_LOG_DIR 指定')
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      if (tooLarge) return
      size += chunk.length
      if (size > maxBytes) {
        tooLarge = true
        chunks.length = 0
      } else {
        chunks.push(chunk)
      }
    })
    req.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8'), tooLarge }))
    req.on('error', reject)
  })
}

function writeLog(logPath, event) {
  try {
    appendFileSync(logPath, JSON.stringify(event) + '\n')
  } catch { /* 日志失败不影响转发 */ }
}

function sendText(res, status, text) {
  const body = Buffer.from(text, 'utf8')
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': body.length,
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function upstreamFrom(raw) {
  const url = new URL(raw)
  if (url.protocol !== 'http:') throw new Error('上游只支持 http://')
  return { hostname: url.hostname, port: Number(url.port || 80), origin: url.origin }
}

function forward(upstream, req, body, headers) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: req.url,
      headers,
      timeout: 15000,
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve({
        status: response.statusCode || 502,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }))
    })
    request.on('timeout', () => request.destroy(new Error('上游超时')))
    request.on('error', reject)
    request.end(body)
  })
}

export async function createGateway(options = {}) {
  const listenHost = options.listenHost || '127.0.0.1'
  const listenPort = Number(options.listenPort ?? 0)
  const upstream = upstreamFrom(options.upstream || 'http://127.0.0.1:8080')
  const guard = options.guard || 'strict'
  if (!['off', 'jwt-none', 'strict'].includes(guard)) throw new Error('guard 必须是 off/jwt-none/strict')
  if (!options.allowPublic && !isLoopback(listenHost)) throw new Error('非回环监听需要 allowPublic')
  if (!options.allowPublicUpstream && !isLoopback(upstream.hostname)) throw new Error('非回环上游需要 allowPublicUpstream')
  const maxBody = Math.min(Math.max(Number(options.maxBody) || 1024 * 1024, 1024), 8 * 1024 * 1024)
  const logPath = ensureLogPath(options.logPath)

  const server = createServer((req, res) => {
    const started = Date.now()
    const rawPath = rawPathOf(req.url)
    const event = {
      at: new Date().toISOString(),
      remote: req.socket.remoteAddress || '',
      method: req.method || '',
      raw_path: rawPath,
      path: rawPath,
      status: 0,
      upstream_status: 0,
      guard: '',
      duration_ms: 0,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    }
    const finish = (status) => {
      event.status = status
      event.duration_ms = Date.now() - started
      writeLog(logPath, event)
    }

    readBody(req, maxBody).then(async ({ body, tooLarge }) => {
      if (tooLarge) {
        event.guard = 'body-too-large'
        sendText(res, 413, 'request body too large')
        finish(413)
        return
      }
      if (guard !== 'off') {
        const hit = inspectRequest({
          url: req.url,
          headers: req.headers,
          body,
          contentType: req.headers['content-type'],
        })
        if (hit !== null && (guard === 'strict' || hit.reason === 'jwt-none' || hit.reason === 'path-normalization')) {
          event.guard = hit.reason
          sendText(res, 403, 'request blocked')
          finish(403)
          return
        }
      }
      const headers = { ...req.headers }
      for (const name of Object.keys(headers)) if (HOP_HEADERS.has(name.toLowerCase())) delete headers[name]
      headers.host = upstream.hostname + (upstream.port === 80 ? '' : ':' + upstream.port)
      headers['content-length'] = Buffer.byteLength(body)
      try {
        const response = await forward(upstream, req, body, headers)
        event.upstream_status = response.status
        for (const [name, value] of Object.entries(response.headers)) {
          if (value !== undefined && !HOP_HEADERS.has(name.toLowerCase())) res.setHeader(name, value)
        }
        res.statusCode = response.status
        res.end(response.body)
        finish(response.status)
      } catch {
        sendText(res, 502, 'upstream error')
        finish(502)
      }
    }).catch(() => {
      sendText(res, 400, 'bad request')
      finish(400)
    })
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(listenPort, listenHost, resolve)
  })
  const address = server.address()
  const port = address && typeof address === 'object' ? address.port : listenPort
  return {
    server,
    port,
    logPath,
    upstream: upstream.origin,
    url: `http://${listenHost}:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}
