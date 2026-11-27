import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'

const PORT = Number(process.env.AGENT_PORT || 8099)
const TOKEN = process.env.AGENT_TOKEN || ''
const TABLE = 'blue_remote'

function sh(cmd, args) {
  try { execFileSync(cmd, args, { timeout: 8000 }); return true } catch { return false }
}

function ensureTable() {
  try { execFileSync('nft', ['list', 'table', 'inet', TABLE], { stdio: 'ignore' }) } catch {
    sh('nft', ['add', 'table', 'inet', TABLE])
    sh('nft', ['add', 'set', 'inet', TABLE, 'blocked', '{ type ipv4_addr; flags timeout; }'])
    sh('nft', ['add', 'chain', 'inet', TABLE, 'input', '{ type filter hook input priority -10; policy accept; }'])
    sh('nft', ['add', 'rule', 'inet', TABLE, 'input', 'ip', 'saddr', '@blocked', 'drop'])
  }
}

function has(cmd) {
  return sh('sh', ['-c', 'command -v ' + cmd])
}

function validIp(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every((n) => Number(n) <= 255)
}

function ban(ip, ttl, reason) {
  ensureTable()
  const nft = sh('nft', ['add', 'element', 'inet', TABLE, 'blocked', '{', ip, 'timeout', ttl, '}'])
  let f2b = false
  if (has('fail2ban-client')) f2b = sh('fail2ban-client', ['set', 'sshd', 'banip', ip])
  let cs = false
  if (has('cscli')) cs = sh('cscli', ['decisions', 'add', '--ip', ip, '--duration', ttl, '--reason', reason || 'blue-remote'])
  return { nft, f2b, cs }
}

function unban(ip) {
  const nft = sh('nft', ['delete', 'element', 'inet', TABLE, 'blocked', '{', ip, '}'])
  if (has('fail2ban-client')) sh('fail2ban-client', ['set', 'sshd', 'unbanip', ip])
  if (has('cscli')) sh('cscli', ['decisions', 'delete', '--ip', ip])
  return { nft }
}

function caps() {
  const out = []
  if (has('nft')) out.push('nft')
  if (has('fail2ban-client')) out.push('fail2ban')
  if (has('cscli')) out.push('crowdsec')
  return out
}

createServer((req, res) => {
  const auth = String(req.headers.authorization || '').replace(/^Bearer /, '')
  if (TOKEN && auth !== TOKEN) { res.writeHead(401); res.end('unauthorized'); return }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, caps: caps(), table: TABLE, at: new Date().toISOString() })); return
  }
  if (req.method === 'POST' && req.url === '/decisions') {
    let b = ''
    req.on('data', (c) => { b += c; if (b.length > 8192) req.destroy() })
    req.on('end', () => {
      let d = {}
      try { d = JSON.parse(b) } catch { d = {} }
      const ip = String(d.ip || '')
      if (!validIp(ip)) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: 'bad ip' })); return }
      const action = d.action === 'unban' ? 'unban' : 'ban'
      const result = action === 'unban' ? unban(ip) : ban(ip, String(d.ttl || '24h'), String(d.reason || ''))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, action, ip, result }))
    })
    return
  }
  res.writeHead(404); res.end('not found')
}).listen(PORT, process.env.AGENT_BIND || '0.0.0.0', () => {
  console.log('blue-remote agent on', process.env.AGENT_BIND || '0.0.0.0', PORT, 'caps:', caps().join(',') || 'none')
})
