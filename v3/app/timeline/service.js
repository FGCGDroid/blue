/** 3.0 时间线用例。 */
import { BlueError } from '../../domain/shared/errors.js'

export function addTimeline(store, engagementId, input = {}) {
  const id = store.timeline.append(engagementId, {
    actor: String(input.actor || 'system'),
    action: String(input.event || input.action || 'note'),
    target: String(input.target || ''),
    detail: String(input.detail || ''),
  })
  return { id }
}

export function listTimeline(store, engagementId, limit = 200) {
  const timeline = store.timeline.list(engagementId, limit)
  return { count: timeline.length, timeline }
}

export function ensureTimelineMode(mode) {
  if (mode !== undefined && mode !== 'add' && mode !== 'list') {
    throw new BlueError('TIMELINE_MODE', 'mode 只能是 add 或 list')
  }
}
