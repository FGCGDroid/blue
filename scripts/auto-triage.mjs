#!/usr/bin/env node
// 自动清理积压告警：只处理可判定的类别，未知一律保留。
// 用法：
//   node scripts/auto-triage.mjs                 # 预览（dry-run）
//   node scripts/auto-triage.mjs --apply         # 真正写库
//   node scripts/auto-triage.mjs --apply --interval 300   # 常驻，每 5 分钟一轮
import { execSync } from 'node:child_process'

function argOf(name, fallback = '') {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}
const APPLY = process.argv.includes('--apply')
const LIMIT = Math.max(Number(argOf('--limit', '500')) || 500, 1)
const INTERVAL = Math.max(Number(argOf('--interval', '0')) || 0, 0)
const ENGAGEMENT = argOf('--engagement', '')
let API = argOf('--api', '')

function discoverApi() {
  try {
    const pids = new Set()
    for (const line of execSync('tasklist /FO CSV /NH', { encoding: 'utf8' }).split('\n')) {
      if (!line.toLowerCase().includes('deepseek harness')) continue
      const pid = Number(line.split('","')[1])
      if (pid > 0) pids.add(pid)
    }
    for (const line of execSync('netstat -ano -p tcp', { encoding: 'utf8' }).split('\n')) {
      if (!line.includes('LISTENING')) continue
      const cols = line.trim().split(/\s+/)
      const pid = Number(cols[cols.length - 1])
      if (pids.has(pid) && Number(cols[1].split(':').pop()) > 1024) return `http://127.0.0.1:${cols[1].split(':').pop()}/blue/api`
    }
  } catch { /* ignore */ }
  return ''
}
if (!API) API = discoverApi()
if (!API) {
  console.error('找不到 DSH 端口，请用 --api http://127.0.0.1:PORT/blue/api')
  process.exit(1)
}

const SENSITIVE = /\/\.env|\/\.git|\/download|\/wp-admin|\/administrator|\/phpinfo|\/server-status/i
const SCANNER_UA = /nmap|zgrab|sqlmap|nikto|nuclei|masscan|gobuster|dirsearch|whatweb|wpscan/i

function rawOf(alert) {
  if (typeof alert.raw !== 'string') return {}
  try { return JSON.parse(alert.raw) } catch { return {} }
}

function classify(alert) {
  const raw = rawOf(alert)
  const ip = String(raw.remote || raw.src_ip || '')
  const path = String(raw.path || raw.url || '')
  const ua = String(raw.user_agent || raw.ua || '')
  const status = Number(raw.status || 0)
  if (/^(198\.51\.100\.|203\.0\.113\.)/.test(ip)) {
    return { status: 'false_positive', reason: 'synthetic', note: '[auto] 合成测试来源 ' + ip }
  }
  if (alert.source === 'deception' || /诱饵命中/.test(alert.title || '')) {
    return { status: 'closed', reason: 'decoy', note: '[auto] 诱饵命中，已由 blue-decoy 封禁策略处理' }
  }
  if (SCANNER_UA.test(ua) && (status === 403 || status === 404)) {
    return { status: 'closed', reason: 'scanner', note: '[auto] 扫描器 UA 已被拦截：' + ua.slice(0, 60) }
  }
  if (status === 403 && SENSITIVE.test(path)) {
    return { status: 'closed', reason: 'waf-sensitive', note: '[auto] 敏感路径已被 WAF 拦截：' + path }
  }
  if (status === 404 && !SENSITIVE.test(path) && /检测命中/.test(alert.title || '')) {
    return { status: 'false_positive', reason: '404-noise', note: '[auto] 404 普通探测噪音：' + path }
  }
  return null
}

async function call(body) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: new URL(API).origin },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function round() {
  const overview = await call({ op: 'overview', ...(ENGAGEMENT ? { engagement: ENGAGEMENT } : {}) })
  const alerts = (overview.alerts || []).filter((alert) => alert.status === 'open' || alert.status === 'investigating')
  const decisions = []
  for (const alert of alerts.slice(0, LIMIT)) {
    const decision = classify(alert)
    if (decision) decisions.push({ alert, decision })
  }
  const counts = {}
  for (const item of decisions) counts[item.decision.reason] = (counts[item.decision.reason] || 0) + 1
  console.log(`[${new Date().toISOString()}] open=${alerts.length} 可自动处理=${decisions.length} ${JSON.stringify(counts)}`)
  if (!APPLY) {
    for (const item of decisions.slice(0, 10)) console.log('  ', item.alert.id, item.decision.status, item.decision.reason, String(item.alert.title).slice(0, 50))
    return
  }
  let ok = 0
  let failed = 0
  for (const item of decisions) {
    try {
      const result = await call({ op: 'triageAlert', alert: { id: item.alert.id, status: item.decision.status, note: item.decision.note } })
      if (result.ok) ok += 1
      else { failed += 1; console.error('  fail', item.alert.id, result.error || '') }
    } catch (error) {
      failed += 1
      console.error('  fail', item.alert.id, error.message)
    }
  }
  console.log('  applied=' + ok + ' failed=' + failed)
}

async function main() {
  await round()
  if (INTERVAL > 0) {
    console.log('常驻模式，间隔 ' + INTERVAL + ' 秒')
    setInterval(() => { round().catch((error) => console.error(error.message)) }, INTERVAL * 1000)
  }
}
main().catch((error) => { console.error('ERR', error.message); process.exit(1) })
