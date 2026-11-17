#!/usr/bin/env node
/**
 * 启动本地靶场（两个独立进程的等价：两个独立端口）。
 *
 * 前台运行，Ctrl+C 同时关网关和上游。
 */
import { startUpstream } from './upstream/server.js'
import { startLabGateway } from './gateway/start.js'

const upstream = await startUpstream({ port: 18080 })
let gateway

try {
  gateway = await startLabGateway({
    port: 18787,
    upstream: upstream.url,
  })
} catch (error) {
  await upstream.close()
  throw error
}

console.log(JSON.stringify({
  ok: true,
  upstream: upstream.url,
  gateway: gateway.url,
  policy: 'lab/policy.json',
  health: gateway.url + '/healthz',
  metrics: gateway.url + '/metrics',
  note: 'Ctrl+C 停止；受保护路径 /admin，允许 /admin/login，canary /admin/canary',
}, null, 2))

const shutdown = async () => {
  await gateway.close()
  await upstream.close()
  process.exitCode = 0
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
