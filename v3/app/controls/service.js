/** 3.0 防线控制验证用例（M4.3）。 */
import { BlueError } from '../../domain/shared/errors.js'

export function evaluateControls(store, engagementId) {
  if (!store.controls) throw new BlueError('CONTROLS_REPO', 'controls repo 未装配')
  const audit = store.evidenceRepo.verify(engagementId)
  const chain = store.timeline.verify(engagementId)
  const tasks = store.tasks.counts(engagementId)
  const telemetry = store.telemetry.listSources(engagementId)
  const decoys = store.decoys.list(engagementId)
  const anchors = store.evidenceRepo.listAnchors(engagementId)
  const checks = [
    {
      control_key: 'audit.chain',
      name: '审计哈希链',
      category: 'audit',
      status: chain.ok ? 'pass' : 'fail',
      evidence: `checked=${chain.checked} head=${chain.head || ''}`,
    },
    {
      control_key: 'audit.anchor',
      name: '外部审计锚点',
      category: 'audit',
      status: audit.ok ? 'pass' : (audit.reason === 'no_anchor' ? 'unknown' : 'fail'),
      evidence: `anchors=${anchors.length} reason=${audit.reason || 'ok'}`,
    },
    {
      control_key: 'approval.pending',
      name: '待审批高风险任务',
      category: 'approval',
      status: Number(tasks.pending_approval || 0) > 0 ? 'pass' : 'unknown',
      evidence: `pending_approval=${tasks.pending_approval || 0}`,
    },
    {
      control_key: 'telemetry.health',
      name: '遥测源健康',
      category: 'telemetry',
      status: telemetry.length === 0 ? 'unknown' : (telemetry.some((source) => source.last_error) ? 'fail' : 'pass'),
      evidence: `sources=${telemetry.length} errors=${telemetry.filter((source) => source.last_error).length}`,
    },
    {
      control_key: 'deception.active',
      name: '诱饵运行',
      category: 'deception',
      status: decoys.some((decoy) => decoy.status === 'active') ? 'pass' : 'unknown',
      evidence: `active=${decoys.filter((decoy) => decoy.status === 'active').length} planned=${decoys.filter((decoy) => decoy.status === 'planned').length}`,
    },
  ]
  const rows = checks.map((check) => store.controls.upsert(engagementId, check))
  const pass = rows.filter((row) => row.status === 'pass').length
  const fail = rows.filter((row) => row.status === 'fail').length
  const unknown = rows.filter((row) => row.status === 'unknown').length
  return {
    controls: rows,
    score: { total: rows.length, pass, fail, unknown, percent: rows.length === 0 ? 0 : Math.round((pass / rows.length) * 100) },
    note: '控制验证只读事实库与本地审计状态，不扫描真实主机。',
  }
}

export function listControls(store, engagementId) {
  const controls = store.controls.list(engagementId)
  const pass = controls.filter((row) => row.status === 'pass').length
  const fail = controls.filter((row) => row.status === 'fail').length
  const unknown = controls.filter((row) => row.status === 'unknown').length
  return {
    controls,
    score: { total: controls.length, pass, fail, unknown, percent: controls.length === 0 ? 0 : Math.round((pass / controls.length) * 100) },
  }
}
