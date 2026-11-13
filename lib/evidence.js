/**
 * 可移交的证据包：事实库快照 + 审计链状态 + Ed25519 签名。
 *
 * 这是“便于交接和校验的 JSON”，不是法庭取证规范，也不替代原始磁盘/内存镜像。
 */
import { createHash, createPublicKey, sign, verify } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { ensureAuditKey, verifyAnchors } from './anchor.js'

const SECRET_KEY = /(?:password|passwd|pwd|token|secret|authorization|cookie|session|api[-_]?key)/i
const SECRET_TEXT = /((?:password|passwd|pwd|token|secret|authorization|cookie|session)\s*["']?\s*[:=]\s*["']?)([^&\s"']+)/gi

function packageVersion() {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version || 'unknown'
  } catch {
    return 'unknown'
  }
}

function now() {
  return new Date().toISOString()
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]))
  }
  return value
}

function canonical(value) {
  return JSON.stringify(sortValue(value))
}

function redact(value, key = '') {
  if (SECRET_KEY.test(key) && typeof value === 'string') return '[REDACTED]'
  if (Array.isArray(value)) return value.map((item) => redact(item))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, redact(item, name)]))
  }
  if (typeof value === 'string') return value.replace(SECRET_TEXT, '$1[REDACTED]')
  return value
}

function safeList(store, method, engagementId, limit) {
  try {
    return store[method](engagementId, { limit })
  } catch {
    return []
  }
}

export function buildEvidenceBundle(store, engagementId, options = {}) {
  const engagement = store.getEngagement(engagementId)
  if (engagement === null) throw new Error('防守目标不存在：' + engagementId)
  const timeline = store.listTimeline(engagementId, 1000)
  const bundle = {
    schema: 'dsh-blue-evidence/v1',
    generated_at: now(),
    package: { name: 'dsh-blue-team-mode', version: packageVersion() },
    engagement: {
      id: engagement.id,
      name: engagement.name,
      scope: engagement.scope,
      note: engagement.note,
      status: engagement.status,
      created_at: engagement.created_at,
    },
    integrity: {
      timeline: store.verifyTimeline(engagementId),
      anchors: verifyAnchors(store, engagementId),
    },
    data: {
      assets: safeList(store, 'queryAssets', engagementId, 1000),
      alerts: safeList(store, 'listAlerts', engagementId, 1000),
      findings: safeList(store, 'listFindings', engagementId, 1000),
      incidents: safeList(store, 'listIncidents', engagementId, 500),
      decisions: safeList(store, 'listDecisions', engagementId, 500),
      tasks: safeList(store, 'listTasks', engagementId, 500),
      iocs: safeList(store, 'listIocs', engagementId, 500),
      decoys: safeList(store, 'listDecoys', engagementId, 500),
      decoy_hits: safeList(store, 'listDecoyHits', engagementId, 500),
      controls: store.sql('SELECT * FROM controls WHERE engagement_id = ? ORDER BY category, control_key').all(engagementId),
      telemetry: store.sql('SELECT id, name, kind, path, status, events_total, alerts_total, last_poll_at, last_error FROM telemetry_sources WHERE engagement_id = ? ORDER BY name').all(engagementId),
      detection_rules: store.sql('SELECT rule_key, title, severity, condition, tags, enabled FROM detection_rules WHERE engagement_id = ? ORDER BY rule_key').all(engagementId),
      audit_anchors: store.sql('SELECT id, head_hash, key_id, public_key, signature, created_at FROM audit_anchors WHERE engagement_id = ? ORDER BY created_at').all(engagementId),
      timeline,
    },
    counts: {
      assets: safeList(store, 'queryAssets', engagementId, 1000).length,
      alerts: safeList(store, 'listAlerts', engagementId, 1000).length,
      findings: safeList(store, 'listFindings', engagementId, 1000).length,
      incidents: safeList(store, 'listIncidents', engagementId, 500).length,
      timeline: timeline.length,
    },
    limitations: [
      '证据包是事实库快照，不包含原始磁盘、内存或完整网络流量。',
      '敏感键和常见凭据字段已脱敏；脱敏会降低部分原始证据价值。',
      '签名只能证明包内容与签名时一致，不能证明采集过程未被操控。',
    ],
  }
  const clean = redact(bundle)
  clean.actor = String(options.actor || 'commander')
  const digest = createHash('sha256').update(canonical(clean)).digest('hex')
  const { privateKey } = ensureAuditKey(store.root)
  const publicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
  const keyId = createHash('sha256').update(publicKey).digest('hex').slice(0, 16)
  clean.digest = digest
  clean.signature = {
    algorithm: 'ed25519',
    key_id: keyId,
    public_key: publicKey,
    value: sign(null, Buffer.from(digest, 'utf8'), privateKey).toString('base64'),
  }
  return clean
}

export function verifyEvidenceBundle(bundle, options = {}) {
  if (bundle === null || typeof bundle !== 'object') throw new Error('证据包不是 JSON 对象')
  if (bundle.schema !== 'dsh-blue-evidence/v1') throw new Error('不支持的证据包 schema：' + bundle.schema)
  if (typeof bundle.digest !== 'string' || bundle.signature === undefined) throw new Error('证据包缺少 digest/signature')
  const copy = JSON.parse(JSON.stringify(bundle))
  const digest = copy.digest
  const signature = copy.signature
  delete copy.digest
  delete copy.signature
  const expected = createHash('sha256').update(canonical(copy)).digest('hex')
  if (expected !== digest) return { ok: false, reason: 'digest_mismatch', expected, actual: digest }
  let valid = false
  try {
    valid = verify(null, Buffer.from(digest, 'utf8'), signature.public_key, Buffer.from(signature.value, 'base64'))
  } catch {
    valid = false
  }
  if (!valid) return { ok: false, reason: 'bad_signature', digest }
  const trusted = typeof options.publicKey === 'string' ? options.publicKey.trim() : ''
  if (trusted !== '' && trusted !== String(signature.public_key).trim()) {
    return { ok: false, reason: 'untrusted_key', digest, key_id: signature.key_id }
  }
  return {
    ok: true,
    authentic: trusted !== '',
    digest,
    key_id: signature.key_id,
    schema: bundle.schema,
    generated_at: bundle.generated_at,
    counts: bundle.counts || {},
  }
}

export function exportEvidence(store, engagementId, options = {}) {
  const root = resolve(store.root, 'evidence')
  mkdirSync(root, { recursive: true })
  const requested = String(options.path || '').trim()
  const target = requested === ''
    ? resolve(root, `${engagementId}-${Date.now()}.json`)
    : resolve(root, requested)
  const rel = relative(root, target)
  if (rel.startsWith('..') || rel === '') throw new Error('证据包只能写到数据目录的 evidence/ 下：' + requested)
  const bundle = buildEvidenceBundle(store, engagementId, options)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, JSON.stringify(bundle, null, 2) + '\n', 'utf8')
  store.addTimeline(engagementId, { actor: String(options.actor || 'commander'), action: 'evidence_export', target: relative(root, target), detail: `digest=${bundle.digest}` })
  return { file: target, bytes: Buffer.byteLength(JSON.stringify(bundle)), digest: bundle.digest, signature: bundle.signature.key_id }
}

export function verifyEvidenceFile(path, options = {}) {
  const bundle = JSON.parse(readFileSync(path, 'utf8'))
  return verifyEvidenceBundle(bundle, options)
}
