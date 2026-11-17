#!/usr/bin/env node
/**
 * 3.0 网关 CLI。
 *
 *   node v3/gateway.js --check
 *   node v3/gateway.js
 *
 * 网关必须独立进程运行；不要挂进 DSH 进程。
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './bootstrap/config.js'
import { loadPolicy } from './infra/policy/store.js'
import { startGateway } from './infra/gateway/server.js'

export async function main(argv = process.argv.slice(2), env = process.env) {
  let config
  try {
    config = loadConfig(env)
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      code: error.code || 'CONFIG_ERROR',
      error: error.message,
    }))
    return 1
  }

  if (argv.includes('--help')) {
    console.log('用法：node v3/gateway.js [--check] [--policy <path>]')
    return 0
  }

  const policyArg = argv.indexOf('--policy')
  if (policyArg >= 0 && argv[policyArg + 1]) config = { ...config, policyPath: resolve(argv[policyArg + 1]) }

  if (argv.includes('--check')) {
    try {
      const loaded = loadPolicy(config.policyPath)
      console.log(JSON.stringify({
        ok: true,
        mode: config.mode,
        host: config.host,
        port: config.port,
        upstream: config.upstream,
        policy_path: config.policyPath,
        policy_source: loaded.source,
        policy_hash: loaded.hash,
      }, null, 2))
      return 0
    } catch (error) {
      console.error(JSON.stringify({
        ok: false,
        code: error.code || 'POLICY_ERROR',
        error: error.message,
      }))
      return 1
    }
  }

  let gateway
  try {
    gateway = await startGateway(config)
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      code: error.code || 'GATEWAY_START',
      error: error.message,
    }))
    return 1
  }

  console.log(JSON.stringify({
    ok: true,
    url: gateway.url,
    upstream: gateway.upstream,
    mode: gateway.mode,
    policy_hash: gateway.policyHash,
    log_path: gateway.logPath,
  }))

  const shutdown = async () => {
    await gateway.close()
    process.exitCode = 0
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  return 0
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false

if (isMain) {
  main()
    .then((code) => { process.exitCode = code })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : error)
      process.exitCode = 1
    })
}
