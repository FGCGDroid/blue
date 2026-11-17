/** 上游转发（3.0，M3）。 */
import http from 'node:http'
import https from 'node:https'
import { BlueError } from '../../domain/shared/errors.js'

const HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
])

const BYPASS = new Set([
  'x-original-url', 'x-rewrite-url', 'x-forwarded-prefix',
  'x-forwarded-uri', 'x-forwarded-path', 'x-envoy-original-path',
])

export function forwardRequest(upstream, req, options = {}) {
  const target = typeof upstream === 'string' ? new URL(upstream) : upstream
  const body = Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body || '')
  const timeoutMs = Number(options.timeoutMs) || 15000
  const maxResponseBytes = Number(options.maxResponseBytes) || 8 * 1024 * 1024

  const headers = {}
  for (const [name, value] of Object.entries(req.headers || {})) {
    const lower = name.toLowerCase()
    if (HOP.has(lower) || BYPASS.has(lower) || lower === 'host' || lower === 'content-length') continue
    headers[name] = value
  }
  headers.host = target.hostname + (target.port ? ':' + target.port : '')
  headers['content-length'] = String(body.length)

  const client = target.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const request = client.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      method: req.method || 'GET',
      path: options.path || '/',
      headers,
      timeout: timeoutMs,
    }, (response) => {
      const chunks = []
      let size = 0
      let tooLarge = false
      response.on('data', (chunk) => {
        if (tooLarge) return
        size += chunk.length
        if (size > maxResponseBytes) {
          tooLarge = true
          chunks.length = 0
          response.destroy()
          return
        }
        chunks.push(chunk)
      })
      response.on('end', () => {
        if (tooLarge) {
          reject(new BlueError('UPSTREAM_RESPONSE_TOO_LARGE', '上游响应过大'))
          return
        }
        resolve({
          status: response.statusCode || 502,
          headers: response.headers,
          body: Buffer.concat(chunks),
        })
      })
      response.on('error', reject)
    })
    request.on('timeout', () => request.destroy(new BlueError('UPSTREAM_TIMEOUT', '上游超时')))
    request.on('error', reject)
    request.end(body)
  })
}
