/** 案件状态机（3.0 骨架，从 2.0 lib/store.js 原样搬）。 */
export const INCIDENT_STATUSES = Object.freeze(['open', 'investigating', 'contained', 'closed'])

export const INCIDENT_TRANSITIONS = Object.freeze({
  open: Object.freeze(['investigating', 'contained', 'closed']),
  investigating: Object.freeze(['open', 'contained', 'closed']),
  contained: Object.freeze(['investigating', 'closed']),
  closed: Object.freeze(['open']),
})

export function canTransitionIncident(from, to) {
  if (from === to) return true
  return (INCIDENT_TRANSITIONS[from] ?? []).includes(to)
}
