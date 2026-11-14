#!/usr/bin/env node
/**
 * 稳定性 soak：只读审计链 + 增量轮询遥测源，不主动攻击、不压测。
 *
 * 用法：
 *   node scripts/soak.mjs --hours 24 --interval 60
 *   node scripts/soak.mjs --hours 0.05 --interval 5 --out .tmp/soak-smoke.jsonl
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { BlueStore } from '../lib/store.js'
import { pollTelemetry } from '../lib/telemetry.js'

function argsOf(argv) {
  const out = { hours: 24, interval: 60, out: '', engagement: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (key === '--hours') out.hours = Number(argv[++i])
    else if (key === '--interval') out.interval = Number(argv[++i])
    else if (key === '--out') out.out = String(argv[++i] || '')
    else if (key === '--engagement') out.engagement = String(argv[++i] || '')
  }
  out.hours = Math.max(Number(out.hours) || 0, 0)
  out.interval = Math.min(Math.max(Number(out.interval) || 60, 5), 3600)
  return out
}

const options = argsOf(process.argv.slice(2))
const root = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'), 'blue')
const out = resolve(options.out || join(root, 'soak.jsonl'))
mkdirSync(dirname(out), { recursive: true })
const store = new BlueStore(root)
const started = Date.now()
const deadline = options.hours > 0 ? started + options.hours * 3600 * 1000 : Infinity
let stopping = false
process.on('SIGINT', () => { stopping = true })
process.on('SIGTERM', () => { stopping = true })

function write(record) {
  appendFileSync(out, JSON.stringify(record) + '\n', 'utf8')
  console.log(JSON.stringify({ at: record.at, integrity: record.integrity, alerts: record.alerts, timeline_ok: record.timeline_ok }))
}

while (!stopping && Date.now() < deadline) {
  const at = new Date().toISOString()
  const engagements = store.listEngagements().filter((item) => item.status === 'active')
  let alerts = 0
  let timelineOk = true
  const sources = []
  for (const engagement of engagements) {
    if (options.engagement !== '' && engagement.id !== options.engagement) continue
    try {
      const results = pollTelemetry(store, engagement.id, { maxAlerts: 10 })
      alerts += results.reduce((sum, item) => sum + (Number(item.inserted) || 0), 0)
      for (const item of results) sources.push({ engagement: engagement.id, ...item })
    } catch (error) {
      sources.push({ engagement: engagement.id, ok: false, error: String(error.message || error) })
    }
    try {
      const chain = store.verifyTimeline(engagement.id)
      if (!chain.ok) timelineOk = false
    } catch {
      timelineOk = false
    }
  }
  let integrity = 'unknown'
  try { integrity = store.sql('PRAGMA integrity_check').get().integrity_check } catch {}
  write({
    at,
    elapsed_sec: Math.round((Date.now() - started) / 1000),
    integrity,
    timeline_ok: timelineOk,
    alerts,
    sources,
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  })
  if (Date.now() + options.interval * 1000 >= deadline) break
  await new Promise((resolveSleep) => setTimeout(resolveSleep, options.interval * 1000))
}
store.close()
console.log(JSON.stringify({ ok: true, out, elapsed_sec: Math.round((Date.now() - started) / 1000) }))
