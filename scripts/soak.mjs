#!/usr/bin/env node
/**
 * 可恢复的稳定性 soak。
 *
 * 进度按“实际采样运行时间”累计；退出/关机不会丢进度。
 * 再次运行默认从 state 继续；完成 24h 后不会重复跑。
 *
 * 用法：
 *   node scripts/soak.mjs --hours 24 --interval 60
 *   node scripts/soak.mjs --status
 *   node scripts/soak.mjs --reset
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { BlueStore } from '../lib/store.js'
import { pollTelemetry } from '../lib/telemetry.js'

function argsOf(argv) {
  const out = {
    hours: 24,
    interval: 60,
    out: '',
    state: '',
    engagement: '',
    status: false,
    reset: false,
    resume: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (key === '--hours') out.hours = Number(argv[++i])
    else if (key === '--interval') out.interval = Number(argv[++i])
    else if (key === '--out') out.out = String(argv[++i] || '')
    else if (key === '--state') out.state = String(argv[++i] || '')
    else if (key === '--engagement') out.engagement = String(argv[++i] || '')
    else if (key === '--status') out.status = true
    else if (key === '--reset') out.reset = true
    else if (key === '--resume') out.resume = true
  }
  out.hours = Math.max(Number(out.hours) || 24, 0.001)
  out.interval = Math.min(Math.max(Number(out.interval) || 60, 5), 3600)
  return out
}

function iso() {
  return new Date().toISOString()
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function writeJsonAtomic(path, value) {
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8')
  renameSync(tmp, path)
}

function inferElapsedFromReport(path) {
  try {
    const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean)
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const row = JSON.parse(lines[i])
      if (Number.isFinite(Number(row.elapsed_sec))) return { elapsed_sec: Number(row.elapsed_sec), samples: i + 1, last_sample_at: row.at || null }
    }
  } catch {}
  return null
}

function hoursText(seconds) {
  const value = Math.max(Number(seconds) || 0, 0) / 3600
  return value >= 1 ? value.toFixed(2) : value.toFixed(3)
}

function printProgress(state, last = null) {
  const target = state.target_hours * 3600
  const done = Math.min(state.elapsed_sec, target)
  const remain = Math.max(target - done, 0)
  const percent = target > 0 ? (done / target) * 100 : 0
  console.log([
    `[soak] 完成 ${hoursText(done)}h / ${state.target_hours}h`,
    `剩余 ${hoursText(remain)}h`,
    `进度 ${percent.toFixed(1)}%`,
    `采样 ${state.samples}`,
    `状态 ${state.status}`,
    state.pid ? `pid=${state.pid}` : '',
    last ? `integrity=${last.integrity || 'unknown'} timeline=${last.timeline_ok === false ? 'broken' : 'ok'}` : '',
  ].filter(Boolean).join(' · '))
}

function pidAlive(pid) {
  const value = Number(pid)
  if (!Number.isInteger(value) || value <= 0) return false
  try {
    process.kill(value, 0)
    return true
  } catch (error) {
    return error && error.code === 'EPERM'
  }
}

const options = argsOf(process.argv.slice(2))
const root = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'), 'blue')
const report = resolve(options.out || join(root, 'soak-beta31.jsonl'))
const statePath = resolve(options.state || join(root, 'soak-beta31.state.json'))
mkdirSync(dirname(report), { recursive: true })
mkdirSync(dirname(statePath), { recursive: true })

if (options.reset) {
  rmSync(statePath, { force: true })
  rmSync(report, { force: true })
  console.log(JSON.stringify({ ok: true, reset: true, state: statePath, report }))
  process.exit(0)
}

let state = readJson(statePath)
if (state !== null && options.hours !== 24 && state.target_hours !== options.hours) {
  state.target_hours = options.hours
}
if (state === null) {
  const inferred = inferElapsedFromReport(report)
  state = {
    version: 1,
    target_hours: options.hours,
    interval_sec: options.interval,
    elapsed_sec: inferred ? inferred.elapsed_sec : 0,
    samples: inferred ? inferred.samples : 0,
    started_at: inferred ? null : iso(),
    last_sample_at: inferred ? inferred.last_sample_at : null,
    updated_at: iso(),
    status: 'paused',
    report,
    last_integrity: null,
    last_timeline_ok: null,
  }
}

if (options.status) {
  printProgress(state)
  console.log(JSON.stringify(state, null, 2))
  process.exit(0)
}

if (state.status === 'completed') {
  printProgress(state)
  console.log(JSON.stringify({ ok: true, completed: true, state: statePath, report }))
  process.exit(0)
}

if (state.status === 'running' && state.pid && state.pid !== process.pid && pidAlive(state.pid)) {
  printProgress(state)
  console.log(JSON.stringify({ ok: true, already_running: true, pid: state.pid, state: statePath, report }))
  process.exit(0)
}

state.status = 'running'
state.pid = process.pid
state.interval_sec = options.interval
state.report = report
state.updated_at = iso()
if (state.started_at === null) state.started_at = iso()
writeJsonAtomic(statePath, state)

const store = new BlueStore(root)
const targetSec = state.target_hours * 3600
let stopping = false
process.on('SIGINT', () => { stopping = true })
process.on('SIGTERM', () => { stopping = true })

function sample() {
  const at = iso()
  let alerts = 0
  let timelineOk = true
  const sources = []
  for (const engagement of store.listEngagements().filter((item) => item.status === 'active')) {
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
  const record = {
    at,
    elapsed_sec: state.elapsed_sec,
    integrity,
    timeline_ok: timelineOk,
    alerts,
    sources,
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }
  appendFileSync(report, JSON.stringify(record) + '\n', 'utf8')
  state.samples += 1
  state.last_sample_at = at
  state.updated_at = at
  state.last_integrity = integrity
  state.last_timeline_ok = timelineOk
  state.elapsed_sec = Math.min(state.elapsed_sec + state.interval_sec, targetSec)
  if (state.elapsed_sec >= targetSec) state.status = 'completed'
  writeJsonAtomic(statePath, state)
  printProgress(state, record)
}

try {
  while (!stopping && state.status !== 'completed') {
    sample()
    if (state.status === 'completed') break
    await new Promise((resolveSleep) => setTimeout(resolveSleep, state.interval_sec * 1000))
  }
} finally {
  if (state.status !== 'completed') state.status = 'paused'
  state.pid = null
  state.updated_at = iso()
  writeJsonAtomic(statePath, state)
  store.close()
}
console.log(JSON.stringify({ ok: true, status: state.status, elapsed_sec: state.elapsed_sec, state: statePath, report }))
