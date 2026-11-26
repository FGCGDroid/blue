#!/usr/bin/env node
/**
 * 本地靶场验收（零依赖、合成数据）。
 *
 * 起真实的上游 + 真实网关（独立端口），跑路径/内容/canary 回归。
 */
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { startUpstream } from '../upstream/server.js'
import { startLabGateway } from '../gateway/start.js'

const LAB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const upstream = await startUpstream({ port: 0 })
let gateway

try {
  gateway = await startLabGateway({
    port: 0,
    upstream: upstream.url,
    logPath: join(LAB_ROOT, '.run', 'acceptance.jsonl'),
  })

  const request = async (path, options = {}) => {
    const response = await fetch(gateway.url + path, { redirect: 'manual', ...options })
    return { status: response.status, body: await response.text() }
  }

  assert.equal((await request('/public')).status, 200)
  assert.equal(upstream.hits.public, 1)

  assert.equal((await request('/admin')).status, 403)
  assert.equal(upstream.hits.admin, 0)

  assert.equal((await request('/%61dmin')).status, 403)
  assert.equal(upstream.hits.admin, 0)

  assert.equal((await request('/admin/login')).status, 200)
  assert.equal(upstream.hits.login, 1)

  assert.equal((await request('/admin%2f..%2fpublic')).status, 400)
  assert.equal(upstream.hits.public, 1)

  assert.equal((await request('/public/%252e')).status, 400)
  assert.equal(upstream.hits.public, 1)

  assert.equal((await request('/admin', {
    headers: { 'x-original-url': '/public' },
  })).status, 400)

  assert.equal((await request('/admin/canary')).status, 403)
  assert.equal(upstream.hits.canary, 0)

  assert.equal((await request('/public', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'x'.repeat(80 * 1024),
  })).status, 413)
  assert.equal(upstream.hits.public, 1)

  assert.equal((await request('/public', {
    headers: { authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.' },
  })).status, 403)
  assert.equal(upstream.hits.public, 1)

  assert.equal((await request('/public/x?y=1')).status, 200)
  assert.equal(upstream.hits.lastUrl, '/public/x?y=1')

  assert.equal((await request('/public//x')).status, 200)
  assert.equal(upstream.hits.lastUrl, '/public/x')

  const health = await request('/healthz')
  assert.equal(health.status, 200)
  assert.equal(JSON.parse(health.body).ok, true)

  const metrics = await request('/metrics')
  assert.equal(metrics.status, 200)
  assert.match(metrics.body, /blue_gateway_requests_total/)
  assert.match(metrics.body, /blue_gateway_blocked_total/)

  console.log('✓ 本地靶场验收通过：阻断/放行/编码/canary/body/JWT/canonical/metrics')
} finally {
  if (gateway) await gateway.close()
  await upstream.close()
}
