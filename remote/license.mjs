import { createPublicKey, verify, createHmac, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

function b64urlDecode(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function verifyCard(card, publicKeyPem) {
  try {
    const [payloadB64, sigB64] = String(card).trim().split('.')
    if (!payloadB64 || !sigB64) return null
    const payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'))
    const sig = b64urlDecode(sigB64)
    const key = createPublicKey(publicKeyPem)
    const ok = verify(null, Buffer.from(payloadB64), key, sig)
    if (!ok) return null
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function signSession(secret, data, ttlMs = 12 * 3600 * 1000) {
  const body = Buffer.from(JSON.stringify(Object.assign({}, data, { exp: Date.now() + ttlMs }))).toString('base64url')
  const mac = createHmac('sha256', secret).update(body).digest('base64url')
  return body + '.' + mac
}

export function readSession(secret, token) {
  try {
    const [body, mac] = String(token || '').split('.')
    if (!body || !mac) return null
    const want = createHmac('sha256', secret).update(body).digest('base64url')
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null
    const data = JSON.parse(b64urlDecode(body).toString('utf8'))
    if (data.exp && Date.now() > data.exp) return null
    return data
  } catch {
    return null
  }
}

export function loadWhitelist(path) {
  try {
    const list = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function addWhitelist(path, ip) {
  mkdirSync(join(path, '..'), { recursive: true })
  const list = loadWhitelist(path)
  if (!list.includes(ip)) {
    list.push(ip)
    writeFileSync(path, JSON.stringify(list.slice(-500), null, 2))
  }
  return list
}
