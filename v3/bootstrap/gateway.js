/** 进程内防守网关管理器：复用 2.0 的 lab 体验，不要求用户手工起 node。 */
import { startGateway } from '../infra/gateway/server.js'
import { loadConfig } from './config.js'
import { loadPolicy } from '../infra/policy/store.js'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function createGatewayManager() {
  let current = null

  async function start(options = {}) {
    const port = Number(options.port ?? 18787)
    const upstream = String(options.upstream || '').trim()
    if (upstream === '') throw new Error('GATEWAY_UPSTREAM: 缺少上游地址')
    if (current !== null) {
      if (current.port === port && current.upstream === upstream) {
        return { ok: true, reused: true, ...status() }
      }
      await stop()
    }
    const env = loadConfig(process.env)
    const policyPath = options.policyPath || env.policyPath
    const logPath = options.logPath || env.logPath
    const policy = loadPolicy(policyPath)
    try {
      mkdirSync(dirname(logPath), { recursive: true })
      appendFileSync(logPath, '')
    } catch { /* 日志文件由网关自己创建 */ }
    const gateway = await startGateway({
      ...env,
      host: '127.0.0.1',
      port,
      upstream,
      mode: 'enforce',
      policyPath,
      logPath,
    }, {
      policy: policy.policy,
      logAllow: true,
      watchPolicy: true,
    })
    current = {
      port: gateway.port,
      url: gateway.url,
      upstream: gateway.upstream,
      logPath: gateway.logPath,
      policyPath,
      gateway,
      startedAt: new Date().toISOString(),
    }
    return { ok: true, ...status() }
  }

  async function stop() {
    if (current === null) return { ok: true, stopped: false }
    const instance = current
    current = null
    await instance.gateway.close()
    return { ok: true, stopped: true, port: instance.port }
  }

  function status() {
    if (current === null) return { running: false }
    return {
      running: true,
      url: current.url,
      port: current.port,
      upstream: current.upstream,
      log_path: current.logPath,
      policy_path: current.policyPath,
      started_at: current.startedAt,
    }
  }

  function reload() {
    if (current === null) return { ok: false, running: false }
    return current.gateway.reload()
  }

  return { start, stop, status, reload }
}
