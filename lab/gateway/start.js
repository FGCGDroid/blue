#!/usr/bin/env node
/**
 * 本地靶场网关（零依赖）。
 *
 * 独立进程、独立端口；默认只监听 127.0.0.1。
 */
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { startGateway } from '../../v3/infra/gateway/server.js'

const LAB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export async function startLabGateway(options = {}) {
  const host = options.host || '127.0.0.1'
  const port = options.port === undefined ? 18787 : Number(options.port)
  const upstream = options.upstream || 'http://127.0.0.1:18080'
  const policyPath = options.policyPath || join(LAB_ROOT, 'policy.json')
  const logPath = options.logPath || join(LAB_ROOT, '.run', 'gateway-decisions.jsonl')

  return startGateway({
    mode: 'enforce',
    host,
    port,
    upstream,
    policyPath,
    logPath,
  }, {
    logAllow: true,
    watchPolicy: false,
    maxBody: 64 * 1024,
  })
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false

if (isMain) {
  const args = process.argv.slice(2)
  const portIndex = args.indexOf('--port')
  const upstreamIndex = args.indexOf('--upstream')
  const port = portIndex >= 0 && args[portIndex + 1] ? Number(args[portIndex + 1]) : 18787
  const upstream = upstreamIndex >= 0 && args[upstreamIndex + 1]
    ? args[upstreamIndex + 1]
    : 'http://127.0.0.1:18080'

  startLabGateway({ port, upstream })
    .then((gateway) => {
      console.log(JSON.stringify({
        ok: true,
        url: gateway.url,
        upstream: gateway.upstream,
        policy_hash: gateway.policyHash,
        log_path: gateway.logPath,
      }))
      const shutdown = async () => {
        await gateway.close()
        process.exitCode = 0
      }
      process.once('SIGINT', shutdown)
      process.once('SIGTERM', shutdown)
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : error)
      process.exitCode = 1
    })
}
