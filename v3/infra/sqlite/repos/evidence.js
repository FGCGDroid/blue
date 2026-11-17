/**
 * 证据/审计锚定仓储（M2）。
 *
 * 使用本机 Ed25519 密钥签名 timeline 链头；私钥仍在主机上。
 * 这是“让整条链重算也过不了旧锚点”，不是外部公证。
 */
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BlueError } from '../../../domain/shared/errors.js'
import { asText } from './shared.js'

function ensureAuditKey(root) {
  const path = join(root, '.audit-key.pem')
  if (existsSync(path)) return { path, privateKey: readFileSync(path, 'utf8') }
  const { privateKey } = generateKeyPairSync('ed25519')
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  writeFileSync(path, pem, { encoding: 'utf8', mode: 0o600 })
  return { path, privateKey: pem }
}

export class EvidenceRepo {
  constructor(db, timeline, root) {
    this.db = db
    this.timeline = timeline
    this.root = root
  }

  listAnchors(engagementId) {
    return this.db.sql('SELECT * FROM audit_anchors WHERE engagement_id = ? ORDER BY created_at ASC')
      .all(engagementId)
  }

  addAnchor(engagementId, options = {}) {
    const chain = this.timeline.verify(engagementId)
    if (!chain.ok) {
      throw new BlueError('ANCHOR_CHAIN_BROKEN', `审计链异常，拒绝锚定：${chain.reason} @ ${chain.broken_at}`)
    }
    const { privateKey } = ensureAuditKey(this.root)
    const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
    const keyId = createHash('sha256').update(publicKey).digest('hex').slice(0, 16)
    const signature = sign(null, Buffer.from(chain.head || '', 'utf8'), privateKey).toString('base64')
    const id = 'ANC-' + createHash('sha256')
      .update(`${engagementId}|${chain.head || ''}|${signature}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase()
    this.db.sql(`INSERT INTO audit_anchors (id, engagement_id, head_hash, signature, public_key, key_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, chain.head || '', signature, publicKey, keyId, new Date().toISOString())
    this.timeline.append(engagementId, {
      actor: asText(options.actor, 'commander'),
      action: 'audit_anchor',
      target: chain.head || '(empty)',
      detail: `anchor=${id} key=${keyId} checked=${chain.checked}`,
    })
    return {
      id,
      head: chain.head || '',
      key_id: keyId,
      checked: chain.checked,
      signature,
      public_key: publicKey,
      created_at: new Date().toISOString(),
    }
  }

  verify(engagementId) {
    const chain = this.timeline.verify(engagementId)
    const anchors = this.listAnchors(engagementId)
    const hashes = new Set(
      this.db.sql('SELECT hash FROM timeline WHERE engagement_id = ?').all(engagementId).map((row) => row.hash),
    )
    if (anchors.length === 0) {
      return { ok: false, anchored: false, reason: 'no_anchor', checked: 0, chain_ok: chain.ok }
    }
    for (const anchor of anchors) {
      let valid = false
      try {
        valid = verify(
          null,
          Buffer.from(anchor.head_hash || '', 'utf8'),
          anchor.public_key,
          Buffer.from(anchor.signature, 'base64'),
        )
      } catch {
        valid = false
      }
      if (!valid) {
        return { ok: false, anchored: true, reason: 'bad_signature', anchor: anchor.id, checked: anchors.length, chain_ok: chain.ok }
      }
      if ((anchor.head_hash || '') !== '' && !hashes.has(anchor.head_hash)) {
        return { ok: false, anchored: true, reason: 'head_missing', anchor: anchor.id, checked: anchors.length, chain_ok: chain.ok }
      }
    }
    if (!chain.ok) {
      return { ok: false, anchored: true, reason: 'chain_broken', checked: anchors.length, chain_ok: false, broken_at: chain.broken_at }
    }
    return { ok: true, anchored: true, reason: '', checked: anchors.length, chain_ok: true, latest: anchors[anchors.length - 1].id }
  }
}
