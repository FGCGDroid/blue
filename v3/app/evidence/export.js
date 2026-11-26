/** 证据包导出（M4.4）：返回可移交的 JSON 对象，不落盘。 */
import { createHash } from 'node:crypto'
import { canonicalJson } from '../../domain/shared/json.js'

export function buildEvidenceBundle(store, engagementId, options = {}) {
  const engagement = store.engagements.get(engagementId)
  if (engagement === null) throw new Error('防守目标不存在：' + engagementId)
  const timeline = store.timeline.list(engagementId, 2000)
  const audit = store.evidenceRepo.verify(engagementId)
  const anchors = store.evidenceRepo.listAnchors(engagementId)
  const body = {
    schema: 'blue-evidence/3.0',
    generated_at: new Date().toISOString(),
    exporter: options.actor || 'commander',
    engagement,
    stats: store.engagements.stats(engagementId),
    assets: store.facts.queryAssets(engagementId, { limit: 2000 }),
    alerts: store.facts.listAlerts(engagementId, { limit: 2000 }),
    findings: store.facts.listFindings(engagementId, { limit: 2000 }),
    iocs: store.facts.listIocs(engagementId, { limit: 2000 }),
    tasks: store.tasks.list(engagementId, { limit: 2000 }),
    incidents: store.incidents.list(engagementId, { limit: 1000 }),
    decisions: store.decisions.list(engagementId, { limit: 2000 }),
    decoys: store.decoys.list(engagementId, { limit: 2000 }),
    timeline,
    audit,
    anchors,
  }
  const digest = createHash('sha256').update(canonicalJson(body)).digest('hex')
  return { bundle: body, digest, file: null, write: false, note: 'M4.4 返回 bundle JSON；写文件在 3.0 UI/CLI 接。' }
}

export function exportEvidence(store, engagementId, options = {}) {
  return buildEvidenceBundle(store, engagementId, options)
}
