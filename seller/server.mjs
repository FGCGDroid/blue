import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sign, randomUUID } from 'node:crypto'

const DIR = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.CARDS_DB || join(DIR, 'cards.db')
const PRIV = process.env.LICENSE_KEY || join(DIR, 'license-private.pem')
const PORT = Number(process.env.PORT || 8124)
const HOST = process.env.HOST || '127.0.0.1'
const TOKEN = process.env.ADMIN_TOKEN || ''

function db() {
  const d = new DatabaseSync(DB_PATH)
  d.exec(`CREATE TABLE IF NOT EXISTS cards (
    key TEXT PRIMARY KEY, sub TEXT, product TEXT, price REAL DEFAULT 0, days INTEGER DEFAULT 365,
    status TEXT DEFAULT 'unsold', created_at TEXT, sold_at TEXT, activated_at TEXT, order_id TEXT
  )`)
  d.exec(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, amount REAL, at TEXT, channel TEXT, note TEXT)`)
  d.exec(`CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`)
  return d
}

function issueCards(n, days, product, price) {
  const priv = readFileSync(PRIV, 'utf8')
  const d = db()
  const out = []
  for (let i = 0; i < n; i++) {
    const sub = 'cust_' + Date.now().toString(36) + '_' + i
    const payload = { sub, ips: [], plan: product || 'pro', exp: Math.floor(Date.now() / 1000) + days * 86400, iat: Math.floor(Date.now() / 1000) }
    const b = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const key = b + '.' + sign(null, Buffer.from(b), priv).toString('base64url')
    d.prepare('INSERT INTO cards (key, sub, product, price, days, status, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(key, sub, product || 'pro', price, days, 'unsold', new Date().toISOString())
    out.push(key)
  }
  return out
}

function stats(d) {
  return {
    total: d.prepare('SELECT COUNT(*) c FROM cards').get().c,
    unsold: d.prepare("SELECT COUNT(*) c FROM cards WHERE status='unsold'").get().c,
    sold: d.prepare("SELECT COUNT(*) c FROM cards WHERE status='sold'").get().c,
    activated: d.prepare("SELECT COUNT(*) c FROM cards WHERE status='activated'").get().c,
    revenue: d.prepare('SELECT COALESCE(SUM(amount),0) s FROM orders').get().s,
  }
}

function readBody(req) {
  return new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy() }); req.on('end', () => resolve(b)) })
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

function mime(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8'
  if (p.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (p.endsWith('.css')) return 'text/css; charset=utf-8'
  return 'application/octet-stream'
}

const PUBLIC = join(DIR, 'public')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const p = url.pathname

  if (TOKEN && p.startsWith('/api/') && p !== '/api/login') {
    const given = String(req.headers['x-admin-token'] || '')
    if (given !== TOKEN) return sendJson(res, 401, { ok: false, error: 'unauthorized' })
  }

  if (p === '/' || p === '/index.html') {
    try {
      const html = readFileSync(join(PUBLIC, 'index.html'))
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return
    } catch { res.writeHead(404); res.end('not found'); return }
  }
  if (p.startsWith('/assets/')) {
    try {
      const f = readFileSync(join(PUBLIC, p.slice(1)))
      res.writeHead(200, { 'content-type': mime(p) }); res.end(f); return
    } catch { res.writeHead(404); res.end('not found'); return }
  }

  if (p === '/api/login' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}')
    if (!TOKEN || b.token === TOKEN) return sendJson(res, 200, { ok: true })
    return sendJson(res, 401, { ok: false })
  }

  if (p === '/api/stats') {
    return sendJson(res, 200, { ok: true, stats: stats(db()) })
  }

  if (p === '/api/cards') {
    const d = db()
    const q = String(url.searchParams.get('q') || '')
    const status = String(url.searchParams.get('status') || '')
    let sql = 'SELECT * FROM cards'
    const args = []
    const where = []
    if (q) { where.push('(key LIKE ? OR sub LIKE ?)'); args.push('%' + q + '%', '%' + q + '%') }
    if (status) { where.push('status = ?'); args.push(status) }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY created_at DESC LIMIT 300'
    return sendJson(res, 200, { ok: true, cards: d.prepare(sql).all(...args) })
  }

  if (p === '/api/gen' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}')
    const n = Math.min(Math.max(Number(b.n) || 1, 1), 1000)
    const days = Number(b.days) || 365
    const product = String(b.product || 'pro')
    const price = Number(b.price) || 0
    if (!existsSync(PRIV)) return sendJson(res, 400, { ok: false, error: '缺少 license-private.pem' })
    const keys = issueCards(n, days, product, price)
    return sendJson(res, 200, { ok: true, count: keys.length })
  }

  if (p === '/api/sell' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}')
    const d = db()
    const card = d.prepare('SELECT * FROM cards WHERE key = ?').get(String(b.key || ''))
    if (!card) return sendJson(res, 404, { ok: false, error: 'no card' })
    if (card.status !== 'unsold') return sendJson(res, 400, { ok: false, error: 'already sold' })
    const at = new Date().toISOString()
    const oid = randomUUID()
    d.prepare("UPDATE cards SET status='sold', sold_at=?, order_id=? WHERE key=?").run(at, oid, card.key)
    d.prepare('INSERT INTO orders (id, amount, at, channel, note) VALUES (?,?,?,?,?)').run(oid, card.price, at, 'manual', '')
    return sendJson(res, 200, { ok: true, order: oid })
  }

  if (p === '/api/activate' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}')
    const d = db()
    const r = d.prepare("UPDATE cards SET status='activated', activated_at=? WHERE key=? AND status IN ('sold','activated')")
      .run(new Date().toISOString(), String(b.key || ''))
    if (r.changes === 0) return sendJson(res, 400, { ok: false, error: '卡密不存在或未售出' })
    return sendJson(res, 200, { ok: true })
  }

  if (p === '/api/orders') {
    const d = db()
    return sendJson(res, 200, { ok: true, orders: d.prepare('SELECT * FROM orders ORDER BY at DESC LIMIT 200').all() })
  }

  if (p === '/api/export') {
    const d = db()
    const rows = d.prepare("SELECT key FROM cards WHERE status='unsold'").all()
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': 'attachment; filename=cards.txt' })
    return res.end(rows.map((r) => r.key).join('\n') + '\n')
  }

  sendJson(res, 404, { ok: false })
})

server.listen(PORT, HOST, () => {
  console.log('seller console on http://' + HOST + ':' + PORT)
  if (process.env.OPEN_BROWSER !== '0') {
    try { require('node:child_process').spawn('explorer.exe', ['http://127.0.0.1:' + PORT], { detached: true, stdio: 'ignore' }) } catch { /* ignore */ }
  }
})
