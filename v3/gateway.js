#!/usr/bin/env node
/**
 * 3.0 网关 CLI（骨架）。
 *
 * 现在只做配置校验：
 *   node v3/gateway.js --check
 *
 * M3 才会真正监听端口。骨架阶段没有 --check 就返回 2，
 * 防止有人以为“进程起来了就是网关在工作”。
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './bootstrap/config.js'

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

  if (argv.includes('--check')) {
    console.log(JSON.stringify({
      ok: true,
      mode: config.mode,
      host: config.host,
      port: config.port,
      upstream: config.upstream,
      policy_path: config.policyPath,
      log_path: config.logPath,
    }, null, 2))
    return 0
  }

  console.error('blue-gateway-v3: 骨架只支持 --check；M3 再启用监听')
  return 2
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
