#!/usr/bin/env node
/**
 * 蓝队无人值守防御组（服务器端）。
 *
 * 只读 tail 访问日志；命中扫描器/敏感路径/集中登录失败时，把来源 IP 加入
 * nftables 的 blue_guard 集合，TTL 到期自动解封。
 *
 * 默认 dry-run；只有显式 --enforce 才真正改 nftables。
 */
import { closeSync, openSync, readSync, statSync, appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { spawn } from 'node:child_process'
import { parseLine, shouldBlock as detectBlock } from './agent-detect.mjs'

function argsOf(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    out[key.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
  }
  return out
}

const args = argsOf(process.argv.slice(2))
const url = String(args.url || process.env.BLUE_AGENT_URL || '').replace(/\/+$/, '')
const token = String(args.token || process.env.BLUE_AGENT_TOKEN || '')
const engagement = String(args.engagement || process.env.BLUE_AGENT_ENGAGEMENT || '')
const logPath = String(args.log || process.env.BLUE_AGENT_LOG || '/www/wwwlogs/access.log')
const dryRun = args.enforce !== 'true'
const ttl = Math.min(Math.max(Number(args.ttl) || 1800, 60), 86400)
const allow = new Set(String(args['allow-ips'] || process.env.BLUE_AGENT_ALLOW_IPS || '').split(',').map((item) => item.trim()).filter(Boolean))
const stateLog = '/var/log/blue-agent.log'
const spoolPath = String(args.spool || process.env.BLUE_AGENT_SPOOL || '/opt/blue-agent/spool.jsonl')
const webhook = String(args.webhook || process.env.BLUE_AGENT_WEBHOOK || '')
const digestHour = Math.min(Math.max(Number(args['digest-hour'] || process.env.BLUE_AGENT_DIGEST_HOUR || 9), 0), 23)
const digestPath = '/opt/blue-agent/digest.json'
let digest = { day: '', blocked: 0, would: 0, failed: 0, lastSent: '' }
try { digest = Object.assign(digest, JSON.parse(readFileSync(digestPath, 'utf8'))) } catch { /* 首次运行 */ }
function saveDigest() { try { writeFileSync(digestPath, JSON.stringify(digest)) } catch { /* 忽略 */ } }
function loadSpool() {
  try {
    for (const line of readFileSync(spoolPath, 'utf8').split('\n')) {
      if (line.trim() === '') continue
      const event = JSON.parse(line)
      if (event && typeof event === 'object') pending.push(event)
    }
  } catch { /* 无 spool */ }
}
function saveSpool() {
  try {
    mkdirSync(dirname(spoolPath), { recursive: true })
    writeFileSync(spoolPath, pending.slice(-5000).map((event) => JSON.stringify(event)).join('\n'))
  } catch { /* 忽略 */ }
}
async function maybeDigest() {
  if (webhook === '') return
  const nowMs = Date.now()
  const hours = Math.max(Number(args['report-interval-hours'] || 2), 1)
  const intervalMs = hours * 3600000
  if (nowMs - (Number(digest.lastSentAt) || 0) < intervalMs) return
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  if (digest.day !== day) { digest.day = day; digest.would = 0 }
  const label = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }).format(new Date())
  const content = '蓝队汇报 ' + day + ' ' + label + '｜近 ' + hours + ' 小时封禁 ' + (digest.blocked || 0) + '｜失败 ' + (digest.failed || 0)
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(webhook.includes('oapi.dingtalk.com') ? { msgtype: 'text', text: { content } } : { text: content }),
    })
    digest.lastSentAt = Date.now()
    digest.blocked = 0
    digest.failed = 0
    saveDigest()
  } catch { /* 下分钟重试 */ }
}
setInterval(() => { void maybeDigest() }, 60000)


if (!url || !token || !engagement) {
  console.error('缺少 --url / --token / --engagement')
  process.exit(2)
}

function logSize() { try { return statSync(logPath).size } catch { return 0 } }
let position = args['from-start'] === 'true' ? 0 : Math.max(logSize(), 0)
let pending = []
loadSpool()
const failures = new Map()
const mergedSeen = new Map()
const MERGE_PATH = /^\/\.(?:env|git)|^\/download|^\/wp-admin|^\/administrator|^\/phpinfo|^\/server-status|^\/admin$/i
function shouldMerge(event) {
  const path = String(event.path || '')
  const now = Date.now()
  let key = ''
  if (path === '/') {
    const raw = String(event.raw_path || '')
    const query = raw.split('?')[1] || ''
    if (query === '') return false
    const names = Array.from(new Set(query.split('&').map((pair) => pair.split('=')[0]).filter(Boolean))).sort().join(',')
    if (names === '') return false
    key = [event.remote, event.method, '/', names, event.status].join('|')
  } else if (MERGE_PATH.test(path)) {
    key = [event.remote, event.method, path, event.status].join('|')
  } else {
    return false
  }
  const last = mergedSeen.get(key) || 0
  if (now - last < 300000) return true
  mergedSeen.set(key, now)
  if (mergedSeen.size > 5000) mergedSeen.clear()
  return false
}
const blockedAt = new Map()

function writeState(event) {
  try {
    mkdirSync('/var/log', { recursive: true })
    appendFileSync(stateLog, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n')
  } catch { /* 日志失败不影响判断 */ }
}

function nft(commandArgs) {
  return new Promise((resolve) => {
    const child = spawn('nft', commandArgs, { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += String(chunk) })
    child.on('error', (error) => resolve({ ok: false, error: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, stderr }))
  })
}

async function block(ip, reason) {
  if (dryRun) {
    digest.would += 1
    saveDigest()
    writeState({ action: 'would_block', ip, reason, ttl })
    return false
  }
  if (blockedAt.has(ip) && Date.now() - blockedAt.get(ip) < ttl * 1000) return false
  const result = await nft(['add', 'element', 'inet', 'blue_guard', 'blocked', '{', ip, 'timeout', `${ttl}s`, '}'])
  if (result.ok) blockedAt.set(ip, Date.now())
  if (result.ok) digest.blocked += 1; else digest.failed += 1
  saveDigest()
  writeState({ action: result.ok ? 'blocked' : 'block_failed', ip, reason, ttl, error: result.stderr || result.error })
  return result.ok
}

async function flush() {
  if (pending.length === 0) return
  const batch = pending.slice(0, 200)
  saveSpool()
  try {
    await fetch(url + '/blue/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ engagement, events: batch }),
      signal: AbortSignal.timeout(5000),
    })
    pending = pending.slice(batch.length)
    saveSpool()
  } catch (error) {
    saveSpool()
    writeState({ action: 'post_failed', error: error.message })
  }
}

setInterval(() => { if (pending.length > 0) void flush() }, 5000)

async function readOnce() {
  let size
  try { size = statSync(logPath).size } catch { return }
  if (size < position) position = 0
  if (size === position) return
  const fd = openSync(logPath, 'r')
  try {
    const length = Math.min(size - position, 1024 * 1024)
    const buffer = Buffer.alloc(length)
    const read = readSync(fd, buffer, 0, length, position)
    position += read
    for (const line of buffer.subarray(0, read).toString('utf8').split(/\r?\n/)) {
      const event = parseLine(line)
      if (!event) continue
      const hit = detectBlock(event, { allow, failures })
      if (hit) {
        event.action = dryRun ? 'would_block' : 'block'
        event.block_reason = hit.reason
        await block(String(event.remote), hit.reason)
      }
      if (shouldMerge(event)) continue
      pending.push(event)
    }
  } finally {
    closeSync(fd)
  }
  await flush()
}

writeState({ action: 'start', dry_run: dryRun, ttl, log: logPath, allow: [...allow] })
console.log(`blue-agent started mode=${dryRun ? 'dry-run' : 'enforce'} log=${logPath} ttl=${ttl}s`)
process.on('SIGINT', async () => { await flush(); process.exit(0) })
while (true) {
  await readOnce()
  await sleep(2000)
}
