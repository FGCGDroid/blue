import { readFileSync, existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createServer } from 'node:http'
import { collectHost } from './collect.mjs'

const CONFIG_PATH = process.env.HUB_CONFIG || new URL('./config.json', import.meta.url).pathname
function loadConfig() {
  if (!existsSync(CONFIG_PATH)) throw new Error('缺少配置文件 ' + CONFIG_PATH)
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
}

const cfg = loadConfig()
const db = new DatabaseSync(cfg.db || 'hub.db')
db.exec(`
CREATE TABLE IF NOT EXISTS hosts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL, port INTEGER DEFAULT 22, user TEXT, site_url TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS samples (id INTEGER PRIMARY KEY AUTOINCREMENT, host_id INTEGER, at TEXT, ok INTEGER, load REAL, disk INTEGER, uptime INTEGER, req INTEGER, e5 INTEGER, authfail INTEGER, bans INTEGER, site TEXT, ms INTEGER, error TEXT);
CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, host_id INTEGER, at TEXT, kind TEXT, message TEXT, notified INTEGER DEFAULT 0);
`)

for (const h of cfg.hosts || []) {
  const row = db.prepare('SELECT id FROM hosts WHERE name = ?').get(h.name)
  if (!row) db.prepare('INSERT INTO hosts (name, address, port, user, site_url, created_at) VALUES (?,?,?,?,?,?)').run(h.name, h.host, h.port || 22, h.user || cfg.ssh.user || 'root', h.siteUrl || '', new Date().toISOString())
}

const HOSTS = db.prepare('SELECT * FROM hosts').all()
const HOST_CFG = new Map((cfg.hosts || []).map((h) => [h.name, h]))

function nowIso() { return new Date().toISOString() }

async function notify(text) {
  const d = cfg.dingtalk
  if (!d || !d.webhook) return false
  const body = JSON.stringify({ msgtype: 'text', text: { content: `${d.keyword || '蓝队汇报'} ${text}` } })
  try {
    const res = await fetch(d.webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    const json = await res.json().catch(() => ({}))
    return json.errcode === 0
  } catch { return false }
}

function lastAlert(hostId, kind) {
  const row = db.prepare('SELECT at FROM alerts WHERE host_id = ? AND kind = ? ORDER BY id DESC LIMIT 1').get(hostId, kind)
  return row ? Date.parse(row.at) : 0
}

async function raise(host, kind, message) {
  const cooldown = (cfg.cooldownSec || 600) * 1000
  if (Date.now() - lastAlert(host.id, kind) < cooldown) return
  const at = nowIso()
  const sent = await notify(`[${host.name}] ${message}`)
  db.prepare('INSERT INTO alerts (host_id, at, kind, message, notified) VALUES (?,?,?,?,?)').run(host.id, at, kind, message, sent ? 1 : 0)
  console.log(at, host.name, kind, message, sent ? 'sent' : 'stored')
}

const thresholds = Object.assign({ load: 4, disk: 85, e5: 20, authDelta: 20, banDelta: 30 }, cfg.thresholds || {})

async function checkHost(host) {
  const hc = HOST_CFG.get(host.name) || { host: host.address, port: host.port, user: host.user, siteUrl: host.site_url }
  const r = await collectHost(cfg, hc)
  db.prepare('INSERT INTO samples (host_id, at, ok, load, disk, uptime, req, e5, authfail, bans, site, ms, error) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(host.id, nowIso(), r.ok ? 1 : 0, r.load || 0, r.disk || 0, r.uptime || 0, r.req || 0, r.e5 || 0, r.authfail || 0, r.bans || 0, r.site || '000', r.ms || 0, r.error || '')

  if (!r.ok) { await raise(host, 'down', `不可达：${r.error || 'ssh 失败'}`); return }

  const prev = db.prepare('SELECT authfail, bans FROM samples WHERE host_id = ? AND ok = 1 ORDER BY id DESC LIMIT 1 OFFSET 1').get(host.id)
  if (r.site && r.site !== '200' && hc.siteUrl) await raise(host, 'site', `站点返回 ${r.site}`)
  if (r.load > thresholds.load) await raise(host, 'load', `负载 ${r.load}`)
  if (r.disk > thresholds.disk) await raise(host, 'disk', `磁盘 ${r.disk}%`)
  if (r.e5 > thresholds.e5) await raise(host, '5xx', `5xx ${r.e5} 条`)
  if (prev && r.authfail - prev.authfail > thresholds.authDelta) await raise(host, 'auth', `SSH 失败 +${r.authfail - prev.authfail}`)
  if (prev && r.bans - prev.bans > thresholds.banDelta) await raise(host, 'ban', `封禁 +${r.bans - prev.bans}`)
  console.log(nowIso(), host.name, 'ok', `${r.ms}ms`, `load=${r.load}`, `site=${r.site}`)
}

let running = false
async function cycle() {
  if (running) return
  running = true
  for (const host of HOSTS) {
    try { await checkHost(host) } catch (e) { console.error(host.name, e.message) }
  }
  running = false
}

function state() {
  const out = []
  for (const h of HOSTS) {
    const s = db.prepare('SELECT * FROM samples WHERE host_id = ? ORDER BY id DESC LIMIT 1').get(h.id)
    const a = db.prepare('SELECT * FROM alerts WHERE host_id = ? ORDER BY id DESC LIMIT 5').all(h.id)
    out.push({ host: h, sample: s || null, alerts: a })
  }
  return out
}

function page() {
  const rows = state().map(({ host, sample, alerts }) => {
    const s = sample || {}
    const cls = s.ok ? (s.site === '200' || !host.site_url ? 'ok' : 'warn') : 'bad'
    return `<tr class="${cls}"><td>${host.name}</td><td>${host.address}</td><td>${s.ok ? 'up' : 'down'}</td><td>${s.load ?? '-'}</td><td>${s.disk ?? '-'}%</td><td>${s.site ?? '-'}</td><td>${s.e5 ?? '-'}</td><td>${s.authfail ?? '-'}</td><td>${s.bans ?? '-'}</td><td>${s.at ? s.at.slice(11, 19) : '-'}</td><td>${alerts.map((a) => a.message).join('<br>') || '-'}</td></tr>`
  }).join('')
  return `<!doctype html><html lang="zh"><meta charset="utf-8"><title>远程防控</title>
<style>body{font:14px/1.6 system-ui;margin:24px;color:#0f172a;background:#f8fafc}h1{font-size:18px}table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;font-size:13px}th{background:#f1f5f9}tr.bad td{background:#fef2f2}tr.warn td{background:#fffbeb}</style>
<h1>远程防控 · ${new Date().toLocaleString('zh-CN')}</h1>
<p>每 ${cfg.intervalSec || 120} 秒采集一次 · 共 ${HOSTS.length} 台</p>
<table><thead><tr><th>名称</th><th>地址</th><th>状态</th><th>负载</th><th>磁盘</th><th>站点</th><th>5xx</th><th>SSH失败</th><th>封禁</th><th>时间</th><th>最近告警</th></tr></thead><tbody>${rows}</tbody></table>
<p><a href="/api/state?token=${encodeURIComponent(cfg.hub?.token || '')}">JSON</a></p></html>`
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const token = cfg.hub?.token || ''
  if (token) {
    const given = url.searchParams.get('token') || (req.headers.authorization || '').replace(/^Bearer /, '')
    if (given !== token) { res.writeHead(401); res.end('unauthorized'); return }
  }
  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(state(), null, 2)); return
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(page())
})

const once = process.argv.includes('--once')
if (once) {
  await cycle()
  process.exit(0)
}

server.listen(cfg.hub?.port || 8090, cfg.hub?.bind || '127.0.0.1', () => {
  console.log('hub listening', cfg.hub?.bind || '127.0.0.1', cfg.hub?.port || 8090)
})
await cycle()
setInterval(() => { void cycle() }, (cfg.intervalSec || 120) * 1000)
