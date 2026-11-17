#!/usr/bin/env node
/**
 * 本地靶场 soak。
 *
 * 用法：
 *   node lab/scenarios/soak.mjs --duration 60 --concurrency 4
 *   node lab/scenarios/soak.mjs --duration 86400 --concurrency 8
 *
 * 只打本地 127.0.0.1，独立端口；不压 DSH 所在进程。
 */
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { startUpstream } from '../upstream/server.js'
import { startLabGateway } from '../gateway/start.js'

const LAB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function argValue(args, name, fallback) {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const args = process.argv.slice(2)
const durationSec = Math.max(Number(argValue(args, '--duration', 60)) || 60, 1)
const concurrency = Math.min(Math.max(Number(argValue(args, '--concurrency', 4)) || 4, 1), 32)
const rate = Math.max(Number(argValue(args, '--rate', 40)) || 40, 1)
const perWorkerDelayMs = Math.max(1, Math.floor(concurrency * 1000 / rate))
const deadline = Date.now() + durationSec * 1000
const logPath = join(LAB_ROOT, '.run', `soak-${Date.now()}.jsonl`)

const safePaths = ['/public', '/public/x?y=1', '/admin/login']
const attackPaths = ['/admin', '/%61dmin', '/admin/canary']
const counts = { safe: 0, attack: 0, blocked: 0, allowed: 0, errors: 0 }
const errors = []
let index = 0
let lastPrint = Date.now()
const startHeap = process.memoryUsage().heapUsed

const upstream = await startUpstream({ port: 0 })
let gateway

try {
  gateway = await startLabGateway({
    port: 0,
    upstream: upstream.url,
    logPath,
  })

  async function worker() {
    while (Date.now() < deadline) {
      const attack = index % 3 === 0
      index += 1
      const path = attack
        ? attackPaths[index % attackPaths.length]
        : safePaths[index % safePaths.length]
      try {
        const response = await fetch(gateway.url + path, {
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        })
        await response.arrayBuffer()
        if (attack) {
          counts.attack += 1
          if (response.status === 400 || response.status === 403) counts.blocked += 1
          else {
            counts.errors += 1
            if (errors.length < 20) errors.push({ path, status: response.status, kind: 'not-blocked' })
          }
        } else {
          counts.safe += 1
          if (response.status === 200) counts.allowed += 1
          else {
            counts.errors += 1
            if (errors.length < 20) errors.push({ path, status: response.status, kind: 'not-allowed' })
          }
        }
      } catch (error) {
        counts.errors += 1
        if (errors.length < 20) errors.push({ path, error: error.message })
      }
      await delay(perWorkerDelayMs)

      if (Date.now() - lastPrint >= 10000) {
        lastPrint = Date.now()
        console.log(JSON.stringify({ elapsed_sec: durationSec - Math.ceil((deadline - Date.now()) / 1000), ...counts }))
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  const endHeap = process.memoryUsage().heapUsed
  const summary = {
    ok: counts.errors === 0 && upstream.hits.admin === 0 && upstream.hits.canary === 0,
    duration_sec: durationSec,
    concurrency,
    rate,
    ...counts,
    upstream: {
      admin: upstream.hits.admin,
      canary: upstream.hits.canary,
      login: upstream.hits.login,
      public: upstream.hits.public,
      publicX: upstream.hits.publicX,
    },
    heap_delta_mb: Number(((endHeap - startHeap) / 1024 / 1024).toFixed(2)),
    log: logPath,
    errors,
  }
  console.log(JSON.stringify(summary, null, 2))
  if (!summary.ok) process.exitCode = 1
} finally {
  if (gateway) await gateway.close()
  await upstream.close()
}
