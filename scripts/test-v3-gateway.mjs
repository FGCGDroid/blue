#!/usr/bin/env node
/**
 * 3.0 M3 网关集成测试。
 *
 * 覆盖：
 *   - 保护前缀阻断，上游 0 命中
 *   - 放行路径转发 canonical + query
 *   - 编码分隔符、点段、绕过头
 *   - canary 上游 0 命中
 *   - body 超限不转发
 *   - jwt-none 内容阻断
 *   - /healthz、/metrics、决策日志
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { startGateway } from '../v3/infra/gateway/server.js'

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve(server.address().port)
    })
  })
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.()
    server.close(resolve)
  })
}

const hits = {
  admin: 0,
  login: 0,
  canary: 0,
  public: 0,
  publicX: 0,
  lastUrl: '',
}

const upstream = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://upstream.test')
  hits.lastUrl = req.url
  if (url.pathname === '/admin') {
    hits.admin += 1
    res.end('admin')
    return
  }
  if (url.pathname === '/admin/login') {
    hits.login += 1
    res.end('login')
    return
  }
  if (url.pathname === '/admin/canary') {
    hits.canary += 1
    res.end('canary')
    return
  }
  if (url.pathname === '/public') {
    hits.public += 1
    res.end('public')
    return
  }
  if (url.pathname === '/public/x') {
    hits.publicX += 1
    res.end('public-x')
    return
  }
  res.statusCode = 404
  res.end('not found')
})

const tmp = mkdtempSync(join(tmpdir(), 'blue-v3-gateway-'))
let gateway
let upstreamPort

try {
  upstreamPort = await listen(upstream)

  const policy = {
    version: 1,
    default_action: 'allow',
    case_insensitive: true,
    max_path_length: 4096,
    reject_semicolon: true,
    protected: [
      { id: 'admin', prefix: '/admin', action: 'block', allow: ['/admin/login'] },
    ],
    deny: [],
  }

  gateway = await startGateway({
    mode: 'enforce',
    host: '127.0.0.1',
    port: 0,
    upstream: `http://127.0.0.1:${upstreamPort}`,
    policyPath: join(tmp, 'path-policy.json'),
    logPath: join(tmp, 'gateway-decisions.jsonl'),
  }, {
    policy,
    logAllow: true,
    watchPolicy: false,
    maxBody: 64 * 1024,
  })

  const request = async (path, options = {}) => {
    const response = await fetch(gateway.url + path, { redirect: 'manual', ...options })
    return { status: response.status, body: await response.text() }
  }

  assert.equal((await request('/public')).status, 200)
  assert.equal(hits.public, 1)
  assert.equal(hits.lastUrl, '/public')

  assert.equal((await request('/admin')).status, 403)
  assert.equal(hits.admin, 0)

  assert.equal((await request('/%61dmin')).status, 403)
  assert.equal(hits.admin, 0)

  assert.equal((await request('/admin/login')).status, 200)
  assert.equal(hits.login, 1)

  assert.equal((await request('/admin%2f..%2fpublic')).status, 400)
  assert.equal(hits.public, 1)

  assert.equal((await request('/public/%252e')).status, 400)
  assert.equal(hits.public, 1)

  assert.equal((await request('/admin', { headers: { 'x-original-url': '/public' } })).status, 400)
  assert.equal(hits.public, 1)

  assert.equal((await request('/admin/canary')).status, 403)
  assert.equal(hits.canary, 0)

  const tooLarge = 'x'.repeat(80 * 1024)
  assert.equal((await request('/public', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: tooLarge,
  })).status, 413)
  assert.equal(hits.public, 1)

  assert.equal((await request('/public', {
    headers: { authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.' },
  })).status, 403)
  assert.equal(hits.public, 1)

  assert.equal((await request('/public/x?y=1')).status, 200)
  assert.equal(hits.publicX, 1)
  assert.equal(hits.lastUrl, '/public/x?y=1')

  assert.equal((await request('/public//x')).status, 200)
  assert.equal(hits.publicX, 2)
  assert.equal(hits.lastUrl, '/public/x')

  const health = await request('/healthz')
  assert.equal(health.status, 200)
  const healthBody = JSON.parse(health.body)
  assert.equal(healthBody.ok, true)
  assert.equal(healthBody.policy_hash, gateway.policyHash)

  const metrics = await request('/metrics')
  assert.equal(metrics.status, 200)
  assert.match(metrics.body, /blue_gateway_requests_total/)
  assert.match(metrics.body, /blue_gateway_blocked_total/)

  const log = readFileSync(join(tmp, 'gateway-decisions.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  assert.ok(log.some((item) => item.decision === 'block' && item.reason === 'PROTECTED_PREFIX'))
  assert.ok(log.some((item) => item.decision === 'block' && item.reason === 'BYPASS_HEADER'))
  assert.ok(log.some((item) => item.decision === 'block' && item.reason === 'jwt-none'))
  assert.ok(log.every((item) => typeof item.canonical_path === 'string' || item.canonical_path === null))
  assert.ok(log.every((item) => !('cookie' in item) && !('authorization' in item)))

  const policyPath = join(tmp, 'path-policy.json')
  writeFileSync(policyPath, JSON.stringify({ ...policy, protected: [] }), 'utf8')
  const reloaded = gateway.reload()
  assert.equal(reloaded.changed, true)
  assert.equal((await request('/admin')).status, 200)
  assert.equal(hits.admin, 1)

  writeFileSync(policyPath, '{ bad json', 'utf8')
  const broken = gateway.reload()
  assert.equal(broken.changed, false)
  assert.ok(broken.error)
  assert.equal((await request('/admin')).status, 200)

  console.log('✓ v3 网关集成通过：阻断/放行/canary/body/内容/日志/metrics/热加载')
} finally {
  if (gateway) await gateway.close()
  await close(upstream)
  rmSync(tmp, { recursive: true, force: true })
}
