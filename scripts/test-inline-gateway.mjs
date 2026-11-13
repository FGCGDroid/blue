import { createServer, request as httpRequest } from 'node:http'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createGateway } from '../lib/gateway.js'

const root = mkdtempSync(join(tmpdir(), 'blue-gateway-'))
const logPath = join(root, 'access.jsonl')
const upstream = createServer((req, res) => {
  if (req.url === '/upstream') {
    res.writeHead(418, { 'content-type': 'text/plain' })
    res.end('teapot')
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('ok')
})
await new Promise((resolve, reject) => {
  upstream.once('error', reject)
  upstream.listen(0, '127.0.0.1', resolve)
})
const upstreamPort = upstream.address().port
const gateway = await createGateway({
  listenHost: '127.0.0.1',
  listenPort: 0,
  upstream: `http://127.0.0.1:${upstreamPort}`,
  guard: 'strict',
  logPath,
})

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      hostname: '127.0.0.1',
      port: gateway.port,
      method: options.method || 'GET',
      path,
      headers: { connection: 'close', ...(options.headers || {}) },
    }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', reject)
    req.end(options.body || '')
  })
}

const forged = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  + '.' + Buffer.from(JSON.stringify({ role: 'admin' })).toString('base64url') + '.'
const valid = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiZ3Vlc3QifQ.signature'

const cases = []
cases.push(['normal', await request('/')])
cases.push(['path', await request('/./config')])
cases.push(['cookie', await request('/admin', { headers: { cookie: `token=${valid}; token=${forged}` } })])
cases.push(['jwt', await request('/admin', { headers: { cookie: `token=${forged}` } })])
cases.push(['proto', await request('/settings', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{"__proto__":{"isAdmin":true}}',
})])
cases.push(['privilege', await request('/settings', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ role: 'admin' }),
})])
cases.push(['upstream', await request('/upstream')])

const expected = { normal: 200, path: 403, cookie: 403, jwt: 403, proto: 403, privilege: 403, upstream: 418 }
for (const [name, response] of cases) {
  if (response.status !== expected[name]) throw new Error(`${name}: expected ${expected[name]}, got ${response.status}`)
}
const events = readFileSync(logPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
const reasons = new Set(events.map((event) => event.guard).filter(Boolean))
for (const reason of ['path-normalization', 'duplicate-cookie', 'jwt-none', 'prototype-pollution', 'privilege-field']) {
  if (!reasons.has(reason)) throw new Error('missing guard reason: ' + reason)
}
if (!events.every((event) => !Object.prototype.hasOwnProperty.call(event, 'body'))) throw new Error('access log leaked body')

await gateway.close()
await new Promise((resolve) => upstream.close(resolve))
rmSync(root, { recursive: true, force: true })
console.log('✓ inline gateway: 转发/路径/重复 Cookie/JWT/原型/权限字段/日志')
