/** 3.0 发现用例。 */
import { BlueError } from '../../domain/shared/errors.js'

export function addFinding(store, engagementId, input = {}) {
  const finding = store.facts.addFinding(engagementId, input)
  return { finding, stats: store.engagements.stats(engagementId) }
}

export function updateFinding(store, engagementId, input = {}) {
  const id = String(input.id ?? '').trim()
  if (id === '') throw new BlueError('FINDING_ID', '发现 id 不能为空')
  const current = store.facts.getFinding(id)
  if (current === null) throw new BlueError('FINDING_NOT_FOUND', '发现不存在：' + id)
  if (current.engagement_id !== engagementId) {
    throw new BlueError('FINDING_SCOPE', '发现不属于当前防守目标')
  }
  const finding = store.facts.updateFinding(id, input)
  return { finding, stats: store.engagements.stats(engagementId) }
}

export function listFindings(store, engagementId, filters = {}) {
  const findings = store.facts.listFindings(engagementId, filters)
  return { count: findings.length, findings, stats: store.engagements.stats(engagementId) }
}
