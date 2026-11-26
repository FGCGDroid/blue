#!/usr/bin/env node
/**
 * 2.0 / 3.0 网关对照跑：同一个 upstream、同一批请求，比较状态码与耗时。
 * 不启动 DSH，不需要服务器。
 */
import http from 'node:http'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createGateway as createGateway20 } from '../lib/gateway.js'
import { startGateway as startGateway30 } from '../v3/infra/gateway/server.js'

const root = mkdtempSync(join(tmpdir(), 'blue-compare-'))
const upstream = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('ok\n')
})
await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
const upstreamPort = upstream.address().port
const upstreamUrl = `http://127.0.0.1:${upstreamPort}`

const gateway20 = await createGateway20({
  upstream: upstreamUrl,
  listenPort: 0,
  guard: 'strict',
  logPath: join(root, '2.0-gateway.jsonl'),
})
const policyPath = join(root, 'policy.json')
const gateway30 = await startGateway30({
  host: '127.0.0.1',
  port: 0,
  upstream: upstreamUrl,
  policyPath,
  logPath: join(root, '3.0-gateway.jsonl'),
  mode: 'enforce',
}, { logAllow: true })

function rawRequest(base, path, { method = 'GET', headers = {}, body = '' } = {}) {
  return new Promise((resolve) => {
    const url = new URL(base)
    const request = http.request({
      hostname: url.hostname,
      port: url.port,
      method,
      path,
      headers,
      timeout: 5000,
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    request.on('timeout', () => { request.destroy(); resolve({ status: 0, body: 'timeout' }) })
    request.on('error', () => resolve({ status: 0, body: 'error' }))
    if (body) request.write(body)
    request.end()
  })
}

const cases = [
  { name: '正常首页', path: '/', method: 'GET' },
  { name: '敏感文件', path: '/.env', method: 'GET' },
  { name: '管理入口', path: '/admin', method: 'GET' },
  { name: '编码穿越', path: '/%2e%2e%2fetc/passwd', method: 'GET' },
  {
    name: 'JWT alg=none',
    path: '/api/me',
    method: 'GET',
    headers: { authorization: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiJ9.' },
  },
  {
    name: '提权字段',
    path: '/api/profile',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ is_admin: true }),
  },
  {
    name: '重复 Cookie',
    path: '/api/me',
    method: 'GET',
    headers: { cookie: 'token=a; token=b' },
  },
  {
    name: 'JWT Cookie',
    path: '/api/me',
    method: 'GET',
    headers: { cookie: 'token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.' },
  },
  {
    name: '原型污染',
    path: '/api/profile',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"__proto__":{"polluted":true}}',
  },
  {
    name: '表单提权',
    path: '/api/profile',
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'json=' + encodeURIComponent(JSON.stringify({ is_admin: true })),
  },
  {
    name: '嵌套提权',
    path: '/api/profile',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user: { role: 'admin' } }),
  },
]

console.log('2.0 vs 3.0 网关对照（同一 upstream）\n')
console.log('case'.padEnd(16), '2.0', '3.0', '2.0 ms', '3.0 ms')
for (const test of cases) {
  const a = performance.now()
  const r20 = await rawRequest(gateway20.url, test.path, test)
  const t20 = performance.now() - a
  const b = performance.now()
  const r30 = await rawRequest(gateway30.url, test.path, test)
  const t30 = performance.now() - b
  console.log(
    test.name.padEnd(16),
    String(r20.status).padStart(3),
    String(r30.status).padStart(3),
    t20.toFixed(1).padStart(7),
    t30.toFixed(1).padStart(7),
  )
}

console.log('\n说明：状态不同不代表谁更安全，需结合业务误杀判断。')

await gateway30.close()
await gateway20.close()
upstream.closeAllConnections?.()
await new Promise((resolve) => upstream.close(resolve))
rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
