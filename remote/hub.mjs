import { readFileSync, existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createServer } from 'node:http'
import { collectHost } from './collect.mjs'
import { setupHost, listOffenders, banIp, ignoreIp } from './defend.mjs'
import { deployWeb } from './webdefend.mjs'

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
CREATE TABLE IF NOT EXISTS bans (id INTEGER PRIMARY KEY AUTOINCREMENT, host_id INTEGER, ip TEXT, reason TEXT, at TEXT, ttl TEXT, active INTEGER DEFAULT 1);
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
const defense = Object.assign({ enabled: false, autoBan: false, maxPerCycle: 10, ttl: '24h' }, cfg.defense || {})
const SETUP_DONE = new Set()

async function checkHost(host) {
  const base = HOST_CFG.get(host.name) || { host: host.address, port: host.port, user: host.user, siteUrl: host.site_url }
  const hc = Object.assign({}, base)
  if (!hc.password && cfg.ssh.password) hc.password = cfg.ssh.password
  const r = await collectHost(cfg, hc)
  db.prepare('INSERT INTO samples (host_id, at, ok, load, disk, uptime, req, e5, authfail, bans, site, ms, error) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(host.id, nowIso(), r.ok ? 1 : 0, r.load || 0, r.disk || 0, r.uptime || 0, r.req || 0, r.e5 || 0, r.authfail || 0, r.bans || 0, r.site || '000', r.ms || 0, r.error || '')

  if (!r.ok) { await raise(host, 'down', `不可达：${r.error || 'ssh 失败'}`); return }

  if (defense.enabled && !SETUP_DONE.has(host.id)) {
    if (defense.web?.enabled && hc.nginxConf) {
      const w = await deployWeb(cfg, hc)
      console.log(nowIso(), host.name, w.ok ? 'web defense ready' : 'web defense failed: ' + w.error)
    }
    const s = await setupHost(cfg, hc)
    SETUP_DONE.add(host.id)
    if (!s.ok) console.log(nowIso(), host.name, 'defense setup failed:', s.error)
    else console.log(nowIso(), host.name, 'defense ready')
  }

  const prev = db.prepare('SELECT authfail, bans FROM samples WHERE host_id = ? AND ok = 1 ORDER BY id DESC LIMIT 1 OFFSET 1').get(host.id)
  if (r.site && r.site !== '200' && hc.siteUrl) await raise(host, 'site', `站点返回 ${r.site}`)
  if (r.load > thresholds.load) await raise(host, 'load', `负载 ${r.load}`)
  if (r.disk > thresholds.disk) await raise(host, 'disk', `磁盘 ${r.disk}%`)
  if (r.e5 > thresholds.e5) await raise(host, '5xx', `5xx ${r.e5} 条`)
  if (prev && r.authfail - prev.authfail > thresholds.authDelta) await raise(host, 'auth', `SSH 失败 +${r.authfail - prev.authfail}`)
  if (prev && r.bans - prev.bans > thresholds.banDelta) await raise(host, 'ban', `封禁 +${r.bans - prev.bans}`)

  if (defense.enabled && defense.autoBan) {
    const trigger = (r.e5 > thresholds.e5) || (prev && r.authfail - prev.authfail > thresholds.authDelta)
    if (trigger) {
      const offenders = (await listOffenders(cfg, hc, 30)).filter((o) => !ignoreIp(cfg, o.ip)).slice(0, defense.maxPerCycle)
      let done = 0
      for (const o of offenders) {
        const b = await banIp(cfg, hc, o.ip, defense.ttl, `hits=${o.hits}`)
        if (b.ok) {
          db.prepare('INSERT INTO bans (host_id, ip, reason, at, ttl, active) VALUES (?,?,?,?,?,1)').run(host.id, o.ip, `hits=${o.hits}`, nowIso(), defense.ttl)
          done += 1
        }
      }
      if (done) await raise(host, 'autoban', `自动封禁 ${done} 个 IP（TTL ${defense.ttl}）`)
    }
  }
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
  const hosts = []
  for (const h of HOSTS) {
    const s = db.prepare('SELECT * FROM samples WHERE host_id = ? ORDER BY id DESC LIMIT 1').get(h.id)
    const history = db.prepare('SELECT load, e5, site, at FROM samples WHERE host_id = ? ORDER BY id DESC LIMIT 40').all(h.id).reverse()
    const alerts = db.prepare('SELECT * FROM alerts WHERE host_id = ? ORDER BY id DESC LIMIT 5').all(h.id)
    const bans = db.prepare('SELECT ip, reason, at, ttl FROM bans WHERE host_id = ? AND active = 1 ORDER BY id DESC LIMIT 10').all(h.id)
    const banCount = db.prepare('SELECT COUNT(*) AS c FROM bans WHERE host_id = ? AND active = 1').get(h.id).c
    hosts.push({ host: h, sample: s || null, history, alerts, bans, banCount })
  }
  const recent = db.prepare('SELECT a.*, h.name FROM alerts a JOIN hosts h ON h.id = a.host_id ORDER BY a.id DESC LIMIT 20').all()
  return { generatedAt: new Date().toISOString(), hosts, recent }
}

function spark(values) {
  if (!values.length) return '<svg viewBox="0 0 160 36"></svg>'
  const w = 160
  const h = 36
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => `${((i / Math.max(values.length - 1, 1)) * w).toFixed(1)},${(h - (v / max) * (h - 6) - 3).toFixed(1)}`).join(' ')
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="1.6"/></svg>`
}

function page() {
  const d = state()
  const up = d.hosts.filter((x) => x.sample && x.sample.ok).length
  const down = d.hosts.length - up
  const dayAgo = Date.now() - 86400000
  const alerts24 = d.recent.filter((a) => Date.parse(a.at) > dayAgo).length
  const bans = d.hosts.reduce((n, x) => n + x.banCount, 0)
  const avgLoad = d.hosts.length ? (d.hosts.reduce((n, x) => n + (x.sample?.load || 0), 0) / d.hosts.length).toFixed(2) : '0.00'
  const cards = d.hosts.map(({ host, sample, history, banCount }) => {
    const s = sample || {}
    const ok = s.ok && (s.site === '200' || !host.site_url)
    const cls = ok ? 'ok' : 'bad'
    const loads = history.map((x) => Number(x.load) || 0)
    return `<div class="host ${cls}">
<div class="host-h"><span class="dot"></span><b>${host.name}</b><span class="addr">${host.address}:${host.port}</span></div>
<div class="host-kpis">
<div><i>站点</i><b>${s.site ?? '-'}</b></div>
<div><i>负载</i><b>${s.load ?? '-'}</b></div>
<div><i>磁盘</i><b>${s.disk ?? '-'}%</b></div>
<div><i>5xx</i><b>${s.e5 ?? '-'}</b></div>
<div><i>SSH失败</i><b>${s.authfail ?? '-'}</b></div>
<div><i>封禁</i><b>${banCount}</b></div>
</div>
<div class="spark">${spark(loads)}</div>
<div class="host-f">${s.at ? s.at.slice(11, 19) : '-'}</div>
</div>`
  }).join('')
  const rows = d.recent.map((a) => `<tr><td>${a.at.slice(11, 19)}</td><td>${a.name}</td><td>${a.kind}</td><td>${a.message}</td></tr>`).join('')
  const banRows = d.hosts.flatMap((x) => (x.bans || []).map((b) => ({ ...b, host: x.host.name }))).slice(0, 15)
  const banTable = banRows.map((b) => `<tr><td>${b.ip}</td><td>${b.host}</td><td>${b.reason || '-'}</td><td>${b.at.slice(11, 19)}</td><td>${b.ttl}</td></tr>`).join('')
  return `<!doctype html><html lang="zh"><meta charset="utf-8"><meta http-equiv="refresh" content="30"><title>安全大屏</title>
<style>
:root{--bg:#0b1220;--panel:#111c2e;--line:#1e2b44;--sub:#7486a3;--txt:#dbe4f0;--ok:#34d399;--bad:#f87171}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 20% -10%,#14233d,#0b1220 60%);color:var(--txt);font:14px/1.55 system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
header{display:flex;align-items:baseline;justify-content:space-between;padding:22px 28px 6px}
h1{font-size:22px;margin:0;letter-spacing:.02em}
.upd{color:var(--sub);font-size:12px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:12px 28px}
.kpi{background:linear-gradient(160deg,rgba(56,189,248,.12),rgba(17,28,46,.9));border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.kpi b{display:block;font-size:28px;line-height:1.2}
.kpi span{color:var(--sub);font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:14px;padding:6px 28px}
.host{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.host.bad{border-color:rgba(248,113,113,.5);box-shadow:0 0 0 1px rgba(248,113,113,.15) inset}
.host-h{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 8px var(--ok)}
.host.bad .dot{background:var(--bad);box-shadow:0 0 8px var(--bad)}
.addr{margin-left:auto;color:var(--sub);font-size:12px}
.host-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.host-kpis div{background:#0b1626;border:1px solid #1a2740;border-radius:8px;padding:6px 8px}
.host-kpis i{display:block;font-style:normal;color:var(--sub);font-size:11px}
.host-kpis b{font-size:15px}
.spark{margin-top:10px;height:36px}
.spark svg{width:100%;height:36px;display:block}
.host-f{color:var(--sub);font-size:11px;text-align:right;margin-top:4px}
.panels{display:grid;grid-template-columns:1.5fr 1fr;gap:14px;margin:18px 28px 30px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.panel h2{font-size:15px;margin:0 0 10px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{color:var(--sub);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);font-weight:500}
td{padding:6px 8px;border-bottom:1px solid #16223a}
td:nth-child(3){color:#fbbf24}
@media(max-width:900px){.panels{grid-template-columns:1fr}}
@media(max-width:760px){.kpis{grid-template-columns:repeat(2,1fr)}header,.kpis,.grid{padding-left:16px;padding-right:16px}}
</style>
<header><h1>安全大屏</h1><span class="upd">更新于 ${d.generatedAt.slice(11, 19)} · 每 ${cfg.intervalSec || 120}s 采集 · 30s 刷新</span></header>
<div class="kpis">
<div class="kpi"><b>${up}<span style="font-size:14px;color:var(--sub)">/${d.hosts.length}</span></b><span>主机在线</span></div>
<div class="kpi"><b style="color:${down ? 'var(--bad)' : 'inherit'}">${down}</b><span>离线主机</span></div>
<div class="kpi"><b>${alerts24}</b><span>24h 告警</span></div>
<div class="kpi"><b>${bans}</b><span>封禁中 · 平均负载 ${avgLoad}</span></div>
</div>
<div class="grid">${cards || '<div class="host">还没有被控机，去 config.json 里加 hosts</div>'}</div>
<div class="panels"><div class="panel"><h2>最近告警</h2><table><thead><tr><th>时间</th><th>主机</th><th>类型</th><th>内容</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="color:var(--sub)">暂无</td></tr>'}</tbody></table></div>
<div class="panel"><h2>当前封禁</h2><table><thead><tr><th>IP</th><th>主机</th><th>原因</th><th>时间</th><th>TTL</th></tr></thead><tbody>${banTable || '<tr><td colspan="5" style="color:var(--sub)">暂无</td></tr>'}</tbody></table></div></div>
</html>`
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
