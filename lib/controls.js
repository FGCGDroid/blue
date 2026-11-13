/**
 * 防线控制验证：不是“有没有规则”，而是“这条控制现在能不能过”。
 * 结果写 facts.controls，带证据和时间；状态只有 pass/fail/unknown。
 */
import { verifyAnchors } from './anchor.js'

function now() {
  return new Date().toISOString()
}

function result(key, name, category, status, evidence) {
  return { control_key: key, name, category, status, evidence }
}

export function evaluateControls(store, engagementId) {
  const results = []

  const chain = store.verifyTimeline(engagementId)
  results.push(result(
    'audit_chain', '审计链完整性', 'evidence',
    chain.ok ? 'pass' : 'fail',
    chain.ok ? `checked=${chain.checked} head=${(chain.head || '').slice(0, 16)}` : `broken_at=${chain.broken_at} reason=${chain.reason}`,
  ))

  const highQueued = store.sql(`SELECT COUNT(*) AS n FROM tasks
    WHERE engagement_id = ? AND risk_level = 'high' AND status IN ('queued','dispatched','running')`).get(engagementId).n
  results.push(result(
    'approval_gate', '高风险审批闸', 'response',
    Number(highQueued) === 0 ? 'pass' : 'fail',
    `high_without_pending_approval=${highQueued}`,
  ))

  const sources = store.sql('SELECT * FROM telemetry_sources WHERE engagement_id = ? AND status = ?').all(engagementId, 'active')
  if (sources.length === 0) {
    results.push(result('telemetry_health', '遥测源健康', 'detection', 'unknown', 'no active telemetry source'))
  } else {
    const stale = sources.filter((source) => {
      if (source.last_poll_at === null) return true
      return Date.now() - Date.parse(source.last_poll_at) > 5 * 60 * 1000
    })
    results.push(result(
      'telemetry_health', '遥测源健康', 'detection',
      stale.length === 0 ? 'pass' : 'fail',
      `active=${sources.length} stale=${stale.length}`,
    ))
  }

  const decoys = store.sql('SELECT COUNT(*) AS n FROM decoys WHERE engagement_id = ? AND status = ?').get(engagementId, 'active').n
  results.push(result(
    'deception_active', '诱饵在线', 'deception',
    Number(decoys) > 0 ? 'pass' : 'unknown',
    `active_decoys=${decoys}`,
  ))

  const anchored = verifyAnchors(store, engagementId)
  results.push(result(
    'audit_anchor', '审计链锚定', 'evidence',
    anchored.ok ? 'pass' : anchored.reason === 'no_anchor' ? 'unknown' : 'fail',
    anchored.ok ? `anchors=${anchored.checked}` : `reason=${anchored.reason}`,
  ))

  const checkedAt = now()
  const upsert = store.sql(`INSERT INTO controls
    (id, engagement_id, control_key, name, category, status, evidence, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(engagement_id, control_key) DO UPDATE SET
      name = excluded.name, category = excluded.category, status = excluded.status,
      evidence = excluded.evidence, checked_at = excluded.checked_at`)
  for (const item of results) {
    upsert.run(`CTL-${engagementId}-${item.control_key}`, engagementId, item.control_key, item.name, item.category, item.status, item.evidence, checkedAt)
  }
  return listControls(store, engagementId)
}

export function listControls(store, engagementId) {
  const rows = store.sql('SELECT * FROM controls WHERE engagement_id = ? ORDER BY category, control_key').all(engagementId)
  const total = rows.length
  const passed = rows.filter((row) => row.status === 'pass').length
  const failed = rows.filter((row) => row.status === 'fail').length
  const unknown = rows.filter((row) => row.status === 'unknown').length
  return { rows, total, passed, failed, unknown, score: total === 0 ? 0 : Math.round((passed / total) * 100) }
}
