/** 网关决策对象（3.0，M3）。 */
import { randomUUID } from 'node:crypto'
import { nowIso } from '../shared/time.js'

function requestId() {
  return `GW-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
}

export function createDecision(input = {}) {
  return {
    request_id: typeof input.request_id === 'string' && input.request_id !== ''
      ? input.request_id
      : requestId(),
    at: typeof input.at === 'string' && input.at !== '' ? input.at : nowIso(),
    remote: typeof input.remote === 'string' ? input.remote : '',
    method: typeof input.method === 'string' ? input.method : '',
    raw_path: typeof input.raw_path === 'string' ? input.raw_path : '',
    canonical_path: input.canonical_path ?? null,
    query: typeof input.query === 'string' ? input.query : '',
    decision: input.decision === 'block' ? 'block' : 'allow',
    rule_id: typeof input.rule_id === 'string' ? input.rule_id : '',
    reason: typeof input.reason === 'string' ? input.reason : '',
    policy_version: Number(input.policy_version) || 1,
    policy_hash: typeof input.policy_hash === 'string' ? input.policy_hash : '',
    upstream_status: Number(input.upstream_status) || 0,
    duration_ms: Number(input.duration_ms) || 0,
  }
}
