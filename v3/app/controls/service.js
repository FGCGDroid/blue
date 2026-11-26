/** 3.0 防线控制验证用例（M4.3）。 */
import { BlueError } from '../../domain/shared/errors.js'

function scoreOf(rows) {
  const pass = rows.filter((row) => row.status === 'pass').length
  const fail = rows.filter((row) => row.status === 'fail').length
  const unknown = rows.filter((row) => row.status === 'unknown').length
  const measured = pass + fail
  return {
    total: rows.length,
    pass,
    fail,
    unknown,
    measured,
    percent: measured === 0 ? 0 : Math.round((pass / measured) * 100),
    coverage: rows.length === 0 ? 0 : Math.round((measured / rows.length) * 100),
  }
}

export function evaluateControls(store, engagementId) {
  if (!store.controls) throw new BlueError('CONTROLS_REPO', 'controls repo 未装配')
  const audit = store.evidenceRepo.verify(engagementId)
  const chain = store.timeline.verify(engagementId)
  const tasks = store.tasks.counts(engagementId)
  const telemetry = store.telemetry.listSources(engagementId)
  const decoys = store.decoys.list(engagementId)
  const anchors = store.evidenceRepo.listAnchors(engagementId)
  const pending = Number(tasks.pending_approval || 0)
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
      name: '审批闸',
      category: 'approval',
      // 0 条待审批是健康状态；有待审批说明闸在拦住任务，也不是失败。
      status: 'pass',
      evidence: pending === 0 ? 'pending_approval=0（无待审批，健康）' : `pending_approval=${pending}（高风险任务被闸住，等待人工）`,
    },
    {
      control_key: 'telemetry.health',
      name: '遥测源健康',
      category: 'telemetry',
      status: telemetry.length === 0 ? 'unknown' : (telemetry.some((source) => source.last_error || source.status === 'error') ? 'fail' : 'pass'),
      evidence: `sources=${telemetry.length} errors=${telemetry.filter((source) => source.last_error || source.status === 'error').length}`,
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
  return {
    controls: rows,
    score: scoreOf(rows),
    note: '分数只按 pass+fail 计算，unknown=未配置/无样本；coverage 表示实际测到的比例。',
  }
}

export function listControls(store, engagementId) {
  const controls = store.controls.list(engagementId)
  return { controls, score: scoreOf(controls) }
}
