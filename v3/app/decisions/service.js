/** 3.0 决策用例。 */
import { BlueError } from '../../domain/shared/errors.js'

export function addDecision(store, engagementId, input = {}) {
  const decision = store.decisions.add(engagementId, input)
  return { decision, stats: store.engagements.stats(engagementId) }
}

export function listDecisions(store, engagementId, filters = {}) {
  const decisions = store.decisions.list(engagementId, filters)
  return { count: decisions.length, decisions }
}

export function ensureDecisionInput(input) {
  if (typeof input?.decision !== 'string' || input.decision.trim() === '') {
    throw new BlueError('DECISION_INPUT', 'decision 不能为空')
  }
}
