import { generateKeyPairSync, sign } from 'node:crypto'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

const [cmd, ...args] = process.argv.slice(2)

function b64url(b) {
  return Buffer.from(b).toString('base64url')
}

if (cmd === 'keygen') {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  writeFileSync('license-private.pem', privateKey.export({ type: 'pkcs8', format: 'pem' }))
  writeFileSync('license-public.pem', publicKey.export({ type: 'spki', format: 'pem' }))
  console.log('written license-private.pem / license-public.pem')
  console.log('把 license-public.pem 内容放进客户配置的 license.publicKey')
  process.exit(0)
}

if (cmd === 'issue') {
  const sub = args[0] || 'cust_0001'
  const ips = (args[1] || '').split(',').map((s) => s.trim()).filter(Boolean)
  const days = Number(args[2] || 365)
  const privateKey = readFileSync('license-private.pem', 'utf8')
  const payload = {
    sub,
    ips,
    plan: 'pro',
    exp: Math.floor(Date.now() / 1000) + days * 86400,
    iat: Math.floor(Date.now() / 1000),
  }
  const payloadB64 = b64url(JSON.stringify(payload))
  const sig = sign(null, Buffer.from(payloadB64), privateKey)
  const card = payloadB64 + '.' + b64url(sig)
  console.log('客户:', sub)
  console.log('授权 IP:', ips.join(', ') || '(未限制)')
  console.log('到期:', new Date(payload.exp * 1000).toISOString())
  console.log('卡密:')
  console.log(card)
  process.exit(0)
}

if (cmd === 'issue-batch') {
  const n = Math.min(Number(args[0] || 1), 1000)
  const days = Number(args[1] || 365)
  const out = args[2] || 'cards.txt'
  const privateKey = readFileSync('license-private.pem', 'utf8')
  const lines = []
  for (let i = 0; i < n; i++) {
    const sub = 'cust_' + Date.now().toString(36) + '_' + i
    const payload = { sub, ips: [], plan: 'pro', exp: Math.floor(Date.now() / 1000) + days * 86400, iat: Math.floor(Date.now() / 1000) }
    const b = b64url(JSON.stringify(payload))
    lines.push(b + '.' + b64url(sign(null, Buffer.from(b), privateKey)))
  }
  writeFileSync(out, lines.join('\n') + '\n')
  console.log('生成', n, '张，写入', out)
  process.exit(0)
}

console.log('用法:')
console.log('  node license-issue.mjs keygen')
console.log('  node license-issue.mjs issue <客户ID> <IP1,IP2> [天数]')
console.log('  node license-issue.mjs issue-batch <数量> <天数> [输出文件]')
