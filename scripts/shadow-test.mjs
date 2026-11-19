#!/usr/bin/env node
/**
 * 影子测试：不启动 DSH、不碰真实服务器，起本地 upstream + 3.0 网关 + 临时事实库，
 * 用真实 HTTP 验证“直连暴露、网关阻断、后台告警”三件事，并打印耗时。
 *
 * Windows：shadow-test.cmd
 * 任意平台：node scripts/shadow-test.mjs
 */
import http from 'node:http'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { BlueStoreV3 } from '../v3/store.js'
import { startGateway } from '../v3/infra/gateway/server.js'
import { createCollector } from '../v3/bootstrap/collector.js'

const root = mkdtempSync(join(tmpdir(), 'blue-shadow-'))
process.env.BLUE_TELEMETRY_ROOT = root
const results = []
let failed = 0
let store = null
let collector = null

function record(name, ok, ms, detail = '') {
  results.push({ name, ok, ms: Number(ms.toFixed(2)), detail })
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(28)} ${ms.toFixed(1).padStart(7)} ms  ${detail}`)
}

async function timed(fn) {
  const start = performance.now()
  try {
    const value = await fn()
    return { value, ms: performance.now() - start }
  } catch (error) {
    return { error, ms: performance.now() - start }
  }
}

const upstream = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end(req.url === '/.env' ? 'FAKE_ENV=1\n' : 'ok\n')
})
await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
const upstreamPort = upstream.address().port
const policyPath = join(root, 'policy.json')
const logPath = join(root, 'gateway.jsonl')
writeFileSync(policyPath, JSON.stringify({
  version: 1,
  default_action: 'allow',
  case_insensitive: true,
  max_path_length: 4096,
  reject_semicolon: true,
  protected: [],
  deny: [],
}), 'utf8')

const gateway = await startGateway({
  host: '127.0.0.1',
  port: 0,
  upstream: `http://127.0.0.1:${upstreamPort}`,
  policyPath,
  logPath,
  mode: 'enforce',
}, { logAllow: true })
const gatewayUrl = gateway.url

try {
  const direct = await timed(() => fetch(`http://127.0.0.1:${upstreamPort}/.env`))
  record('直连 /.env 暴露', direct.value.status === 200, direct.ms, `HTTP ${direct.value.status}`)

  const blocked = await timed(() => fetch(`${gatewayUrl}/.env`))
  record('网关 /.env 阻断', blocked.value.status === 403, blocked.ms, `HTTP ${blocked.value.status}`)

  const allowed = await timed(() => fetch(`${gatewayUrl}/`))
  record('网关 / 放行', allowed.value.status === 200, allowed.ms, `HTTP ${allowed.value.status}`)

  const storeLocal = new BlueStoreV3(root)
  store = storeLocal
  const engagement = storeLocal.engagements.open('shadow-test', ['127.0.0.1'])
  storeLocal.telemetry.addSource(engagement.id, { name: 'gateway-shadow', kind: 'jsonl', path: logPath })
  collector = createCollector(storeLocal, { intervalMs: 60000 })
  const collect = await timed(() => collector.tick())
  const alerts = storeLocal.facts.listAlerts(engagement.id, { limit: 20 })
  record('后台采集生成告警', collect.value.alerts >= 1 && alerts.some((a) => /网关/.test(a.title)), collect.ms, `alerts=${alerts.length}`)

  const artifact = storeLocal.artifacts.capture(engagement.id, { content: 'GET /.env -> 403', source: 'shadow-test', kind: 'http' })
  const verify = storeLocal.artifacts.verify(artifact.id)
  record('artifact 可校验', verify.ok === true, 0, artifact.id)

  collector.stop()
  collector = null
  storeLocal.close()
  store = null
} catch (error) {
  record('影子链路异常', false, 0, error && error.message ? error.message : String(error))
} finally {
  collector?.stop()
  store?.close()
  gateway.server?.closeAllConnections?.()
  await gateway.close()
  upstream.closeAllConnections?.()
  await new Promise((resolve) => upstream.close(resolve))
  await new Promise((resolve) => setTimeout(resolve, 50))
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

const total = results.reduce((sum, item) => sum + item.ms, 0)
console.log('')
console.log(`总计 ${results.length} 项，失败 ${failed} 项，累计 ${total.toFixed(1)} ms`)
process.exit(failed === 0 ? 0 : 1)
