/**
 * 证据/审计锚定仓储（M2）。
 *
 * 使用本机 Ed25519 密钥签名 timeline 链头；私钥仍在主机上。
 * 这是“让整条链重算也过不了旧锚点”，不是外部公证。
 */
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import {
  closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { BlueError } from '../../../domain/shared/errors.js'
import { asText } from './shared.js'

function keyPath(root) {
  return join(root, '.audit-key.pem')
}

/** 只读已有 key；不存在返回 null，不自动生成（验证时不能悄悄换 key）。 */
function readAuditKey(root) {
  const path = keyPath(root)
  if (!existsSync(path)) return null
  const stat = lstatSync(path)
  if (!stat.isFile()) throw new BlueError('ANCHOR_KEY', '审计私钥不是普通文件，拒绝使用')
  if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
    throw new BlueError('ANCHOR_KEY', '审计私钥权限过宽，拒绝使用')
  }
  return { path, privateKey: readFileSync(path, 'utf8') }
}

function ensureAuditKey(root) {
  const existing = readAuditKey(root)
  if (existing !== null) return existing

  mkdirSync(root, { recursive: true })
  const { privateKey } = generateKeyPairSync('ed25519')
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const path = keyPath(root)

  let fd
  let created = false
  try {
    fd = openSync(path, 'wx', 0o600)
    created = true
    writeFileSync(fd, pem, 'utf8')
  } catch (error) {
    if (fd !== undefined) {
      try { closeSync(fd) } catch { /* ignore */ }
      fd = undefined
    }
    if (created) {
      try { unlinkSync(path) } catch { /* ignore */ }
    }
    if (error.code === 'EEXIST') {
      const raced = readAuditKey(root)
      if (raced !== null) return raced
    }
    throw new BlueError('ANCHOR_KEY', `审计私钥创建失败：${error.message}`)
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
  return { path, privateKey: pem }
}

function keyIdOf(publicKey) {
  return createHash('sha256').update(publicKey).digest('hex').slice(0, 16)
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
    const keyId = keyIdOf(publicKey)
    const signature = sign(null, Buffer.from(chain.head || '', 'utf8'), privateKey).toString('base64')
    const id = 'ANC-' + createHash('sha256')
      .update(`${engagementId}|${chain.head || ''}|${signature}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase()
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO audit_anchors (id, engagement_id, head_hash, signature, public_key, key_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, engagementId, chain.head || '', signature, publicKey, keyId, at)
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
      created_at: at,
    }
  }

  verify(engagementId) {
    const chain = this.timeline.verify(engagementId)
    const anchors = this.listAnchors(engagementId)
    if (anchors.length === 0) {
      return { ok: false, anchored: false, reason: 'no_anchor', checked: 0, chain_ok: chain.ok }
    }

    const key = readAuditKey(this.root)
    if (key === null) {
      return {
        ok: false, anchored: true, reason: 'no_key', checked: anchors.length, chain_ok: chain.ok,
      }
    }
    const localPublicKey = createPublicKey(key.privateKey).export({ type: 'spki', format: 'pem' })
    const localKeyId = keyIdOf(localPublicKey)
    const hashes = new Set(
      this.db.sql('SELECT hash FROM timeline WHERE engagement_id = ?').all(engagementId).map((row) => row.hash),
    )

    for (const anchor of anchors) {
      if (anchor.key_id !== localKeyId || anchor.public_key !== localPublicKey) {
        return {
          ok: false, anchored: true, reason: 'bad_key', anchor: anchor.id,
          checked: anchors.length, chain_ok: chain.ok,
        }
      }
      let valid = false
      try {
        valid = verify(
          null,
          Buffer.from(anchor.head_hash || '', 'utf8'),
          localPublicKey,
          Buffer.from(anchor.signature, 'base64'),
        )
      } catch {
        valid = false
      }
      if (!valid) {
        return {
          ok: false, anchored: true, reason: 'bad_signature', anchor: anchor.id,
          checked: anchors.length, chain_ok: chain.ok,
        }
      }
      if ((anchor.head_hash || '') !== '' && !hashes.has(anchor.head_hash)) {
        return {
          ok: false, anchored: true, reason: 'head_missing', anchor: anchor.id,
          checked: anchors.length, chain_ok: chain.ok,
        }
      }
    }

    if (!chain.ok) {
      return {
        ok: false, anchored: true, reason: 'chain_broken', checked: anchors.length,
        chain_ok: false, broken_at: chain.broken_at,
      }
    }
    return {
      ok: true, anchored: true, reason: '', checked: anchors.length, chain_ok: true,
      latest: anchors[anchors.length - 1].id,
    }
  }
}
