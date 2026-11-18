/** 3.0 案件用例。 */
import { BlueError } from '../../domain/shared/errors.js'

export function openIncident(store, engagementId, input = {}) {
  const incident = store.incidents.open(engagementId, input)
  return { incident }
}

export function listIncidents(store, engagementId, filters = {}) {
  const incidents = store.incidents.list(engagementId, filters)
  return { count: incidents.length, incidents }
}

function ensureIncident(store, engagementId, id) {
  const current = store.incidents.get(String(id ?? '').trim())
  if (current === null) throw new BlueError('INCIDENT_NOT_FOUND', '案件不存在：' + id)
  if (current.engagement_id !== engagementId) throw new BlueError('INCIDENT_SCOPE', '案件不属于当前防守目标')
  return current
}

export function updateIncident(store, engagementId, input = {}) {
  ensureIncident(store, engagementId, input.id)
  const incident = store.incidents.update(String(input.id).trim(), input)
  return { incident }
}

export function attachIncident(store, engagementId, input = {}) {
  ensureIncident(store, engagementId, input.id)
  return store.incidents.attach(String(input.id).trim(), input)
}
