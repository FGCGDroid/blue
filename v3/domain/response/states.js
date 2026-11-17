/** 响应动作状态机（3.0 骨架，从 2.0 lib/response.js 原样搬）。 */
export const RESPONSE_ACTIONS = Object.freeze([
  'isolate_host',
  'block_ip',
  'disable_account',
  'revoke_session',
  'quarantine_file',
])

export const RESPONSE_STATUSES = Object.freeze(['planned', 'applied', 'rolled_back', 'cancelled'])

export const RESPONSE_TRANSITIONS = Object.freeze({
  planned: Object.freeze(['applied', 'cancelled']),
  applied: Object.freeze(['rolled_back']),
  rolled_back: Object.freeze([]),
  cancelled: Object.freeze([]),
})

export function canTransitionResponse(from, to) {
  if (from === to) return true
  return (RESPONSE_TRANSITIONS[from] ?? []).includes(to)
}
