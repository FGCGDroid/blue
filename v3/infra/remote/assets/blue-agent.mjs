#!/usr/bin/env node
/**
 * 蓝队无人值守防御组（服务器端）。
 *
 * 只读 tail 访问日志；命中扫描器/敏感路径/集中登录失败时，把来源 IP 加入
 * nftables 的 blue_guard 集合，TTL 到期自动解封。
 *
 * 默认 dry-run；只有显式 --enforce 才真正改 nftables。
 */
import { closeSync, openSync, readSync, statSync, appendFileSync, mkdirSync } from 'node:fs'
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
const ttl = Math.min(Math.max(Number(args.ttl) || 1800, 60), 7200)
const allow = new Set(String(args['allow-ips'] || process.env.BLUE_AGENT_ALLOW_IPS || '').split(',').map((item) => item.trim()).filter(Boolean))
const stateLog = '/var/log/blue-agent.log'

if (!url || !token || !engagement) {
  console.error('缺少 --url / --token / --engagement')
  process.exit(2)
}

let position = args['from-start'] === 'true' ? 0 : Math.max(statSync(logPath).size, 0)
let pending = []
const failures = new Map()
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
    writeState({ action: 'would_block', ip, reason, ttl })
    return false
  }
  if (blockedAt.has(ip) && Date.now() - blockedAt.get(ip) < ttl * 1000) return false
  const result = await nft(['add', 'element', 'inet', 'blue_guard', 'blocked', '{', ip, 'timeout', `${ttl}s`, '}'])
  if (result.ok) blockedAt.set(ip, Date.now())
  writeState({ action: result.ok ? 'blocked' : 'block_failed', ip, reason, ttl, error: result.stderr || result.error })
  return result.ok
}

async function flush() {
  if (pending.length === 0) return
  const batch = pending.splice(0, 200)
  try {
    await fetch(url + '/blue/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ engagement, events: batch }),
    })
  } catch (error) {
    pending = batch.concat(pending).slice(-1000)
    writeState({ action: 'post_failed', error: error.message })
  }
}

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
