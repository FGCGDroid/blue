import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { sign } from 'node:crypto'

const DIR = process.cwd()
const PRIV = join(DIR, 'license-private.pem')
const SECRET = process.env.SIGN_SECRET || ''
const PORT = Number(process.env.SIGN_PORT || 8125)

function issue(sub, ips, days) {
  const payload = { sub, ips, plan: 'pro', exp: Math.floor(Date.now() / 1000) + days * 86400, iat: Math.floor(Date.now() / 1000) }
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return b + '.' + sign(null, Buffer.from(b), readFileSync(PRIV, 'utf8')).toString('base64url')
}

function body(req) {
  return new Promise((r) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 65536) req.destroy() }); req.on('end', () => r(b)) })
}

createServer(async (req, res) => {
  const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
  if (req.method === 'GET' && req.url === '/health') return json(200, { ok: true })
  if (req.method === 'POST' && req.url === '/sign') {
    if (!SECRET) return json(503, { ok: false, error: 'SIGN_SECRET not set' })
    if (String(req.headers['x-sign-secret'] || '') !== SECRET) return json(401, { ok: false, error: 'unauthorized' })
    if (!existsSync(PRIV)) return json(500, { ok: false, error: 'license-private.pem missing' })
    let d = {}
    try { d = JSON.parse(await body(req)) } catch { return json(400, { ok: false, error: 'bad json' }) }
    const sub = String(d.sub || d.orderId || 'order_' + Date.now())
    const days = Number(d.days || 365)
    const ips = Array.isArray(d.ips) ? d.ips : String(d.ips || '').split(',').map((s) => s.trim()).filter(Boolean)
    const key = issue(sub, ips, days)
    return json(200, { ok: true, key, sub, days, ips })
  }
  json(404, { ok: false })
}).listen(PORT, process.env.SIGN_HOST || '127.0.0.1', () => {
  console.log('sign server on ' + (process.env.SIGN_HOST || '127.0.0.1') + ':' + PORT)
})
