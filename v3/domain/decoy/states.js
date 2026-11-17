/** 诱饵状态机（3.0 骨架，从 2.0 lib/store.js 原样搬）。 */
export const DECOY_STATUSES = Object.freeze(['planned', 'active', 'retired'])

export const DECOY_TRANSITIONS = Object.freeze({
  planned: Object.freeze(['active', 'retired']),
  active: Object.freeze(['retired']),
  retired: Object.freeze([]),
})

export function canTransitionDecoy(from, to) {
  if (from === to) return true
  return (DECOY_TRANSITIONS[from] ?? []).includes(to)
}
