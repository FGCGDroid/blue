/** 证据包验证（M4.4）：重算 digest，并检查本目标时间线/锚点。 */
import { createHash } from 'node:crypto'
import { canonicalJson } from '../../domain/shared/json.js'

export function verifyEvidenceBundle(store, bundle, options = {}) {
  if (bundle === null || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('bundle 必须是对象')
  }
  const actual = createHash('sha256').update(canonicalJson(bundle)).digest('hex')
  const expected = String(options.digest || '').trim()
  const digestOk = expected === '' ? null : actual === expected
  const engagementId = bundle.engagement?.id
  let audit = null
  if (typeof engagementId === 'string' && engagementId !== '') {
    const current = store.engagements.get(engagementId)
    if (current !== null) audit = store.evidenceRepo.verify(engagementId)
  }
  return {
    ok: digestOk !== false && (audit === null || audit.ok === true),
    digest: actual,
    digest_ok: digestOk,
    audit,
    schema: bundle.schema || '',
    engagement: bundle.engagement || null,
    note: '只证明包内容与 digest 一致、本目标当前锚点可验；不证明采集过程未被操控。',
  }
}

export function verifyEvidence(store, bundle, options = {}) {
  return verifyEvidenceBundle(store, bundle, options)
}
