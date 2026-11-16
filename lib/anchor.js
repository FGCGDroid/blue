/**
 * 审计链锚定：用本机 Ed25519 密钥签名链头，证明某个链头曾经存在。
 *
 * 这不是外部公证：私钥仍在本机。它的价值是让“整条链重算”也过不了旧锚点。
 */
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function ensureAuditKey(root) {
  const path = join(root, '.audit-key.pem')
  if (existsSync(path)) return { path, privateKey: readFileSync(path, 'utf8') }
  const { privateKey } = generateKeyPairSync('ed25519')
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  writeFileSync(path, pem, { encoding: 'utf8', mode: 0o600 })
  return { path, privateKey: pem }
}

export function auditPublicKey(root) {
  const { privateKey } = ensureAuditKey(root)
  return createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
}

export function anchorTimeline(store, engagementId, actor = 'commander') {
  const chain = store.verifyTimeline(engagementId)
  if (!chain.ok) throw new Error(`审计链异常，拒绝锚定：${chain.reason} @ ${chain.broken_at}`)
  const { privateKey } = ensureAuditKey(store.root)
  const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
  const keyId = createHash('sha256').update(publicKey).digest('hex').slice(0, 16)
  const signature = sign(null, Buffer.from(chain.head || '', 'utf8'), privateKey).toString('base64')
  const id = 'ANC-' + createHash('sha256').update(`${engagementId}|${chain.head}|${signature}`).digest('hex').slice(0, 16).toUpperCase()
  store.sql(`INSERT INTO audit_anchors (id, engagement_id, head_hash, signature, public_key, key_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, engagementId, chain.head || '', signature, publicKey, keyId, new Date().toISOString())
  store.addTimeline(engagementId, {
    actor,
    action: 'audit_anchor',
    target: chain.head || '(empty)',
    detail: `anchor=${id} key=${keyId} checked=${chain.checked}`,
  })
  return { id, head: chain.head || '', key_id: keyId, checked: chain.checked }
}

export function verifyAnchors(store, engagementId) {
  const chain = store.verifyTimeline(engagementId)
  const anchors = store.sql('SELECT * FROM audit_anchors WHERE engagement_id = ? ORDER BY created_at ASC').all(engagementId)
  const hashes = new Set(store.sql('SELECT hash FROM timeline WHERE engagement_id = ?').all(engagementId).map((row) => row.hash))
  if (anchors.length === 0) return { ok: false, anchored: false, reason: 'no_anchor', checked: 0, chain_ok: chain.ok }
  for (const anchor of anchors) {
    let valid = false
    try {
      valid = verify(null, Buffer.from(anchor.head_hash || '', 'utf8'), anchor.public_key, Buffer.from(anchor.signature, 'base64'))
    } catch {
      valid = false
    }
    if (!valid) return { ok: false, anchored: true, reason: 'bad_signature', anchor: anchor.id, checked: anchors.length, chain_ok: chain.ok }
    if ((anchor.head_hash || '') !== '' && !hashes.has(anchor.head_hash)) {
      return { ok: false, anchored: true, reason: 'head_missing', anchor: anchor.id, checked: anchors.length, chain_ok: chain.ok }
    }
  }
  if (!chain.ok) return { ok: false, anchored: true, reason: 'chain_broken', checked: anchors.length, chain_ok: false, broken_at: chain.broken_at }
  return { ok: true, anchored: true, reason: '', checked: anchors.length, chain_ok: true, latest: anchors[anchors.length - 1].id }
}
