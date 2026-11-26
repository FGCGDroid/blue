/** 3.0 告警列示用例。 */
export function listAlerts(store, engagementId, filters = {}) {
  const alerts = store.facts.listAlerts(engagementId, filters)
  return {
    count: alerts.length,
    alerts,
    stats: store.engagements.stats(engagementId),
  }
}
