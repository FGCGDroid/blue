/**
 * 受控响应台账：只生成高风险的“响应动作 + 待审批任务”，不执行任何命令。
 * 人工执行后回填 applied/rolled_back，形成审批、执行、回滚三段证据。
 */
const ACTIONS = new Set(['isolate_host', 'block_ip', 'disable_account', 'revoke_session', 'quarantine_file'])
const STATUSES = new Set(['planned', 'applied', 'rolled_back', 'cancelled'])

function now() {
  return new Date().toISOString()
}

export function planResponse(store, engagementId, input = {}) {
  const action = String(input.action || '').trim()
  if (!ACTIONS.has(action)) throw new Error('不支持的响应动作：' + action)
  const target = String(input.target || '').trim()
  if (target === '') throw new Error('响应目标不能为空')
  const rollback = String(input.rollback || '').trim()
  if (rollback === '') throw new Error('必须写清回滚方案')
  const incident = input.incident_id ? store.getIncident(String(input.incident_id)) : null
  if (input.incident_id && incident === null) throw new Error('案件不存在：' + input.incident_id)
  if (incident !== null && incident.engagement_id !== engagementId) throw new Error('案件不属于当前防守目标')
  const task = store.createTask(engagementId, {
    role: 'ir',
    title: `响应：${action} ${target}`,
    brief: String(input.note || '受控响应，执行前必须人工审批；插件不执行命令。'),
    priority: 'P1',
    risk_level: 'high',
    requires_approval: true,
    scope: target,
    acceptance: '审批通过后由人工执行，并回填执行证据与回滚结果',
    actor: String(input.actor || 'commander'),
  })
  const id = `RSP-${Date.now().toString(36).toUpperCase()}`
  const at = now()
  store.sql(`INSERT INTO response_actions
    (id, engagement_id, incident_id, task_id, action, target, rollback, status, evidence, actor, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', '', ?, ?, ?)`)
    .run(id, engagementId, input.incident_id ?? null, task.id, action, target, rollback, String(input.actor || 'commander'), at, at)
  store.addTimeline(engagementId, {
    actor: String(input.actor || 'commander'),
    action: 'response_plan',
    target,
    detail: `response=${id} action=${action} task=${task.id} status=pending_approval`,
  })
  return { action: store.sql('SELECT * FROM response_actions WHERE id = ?').get(id), task }
}

export function updateResponse(store, engagementId, id, input = {}) {
  const current = store.sql('SELECT * FROM response_actions WHERE id = ? AND engagement_id = ?').get(id, engagementId)
  if (current === undefined) throw new Error('响应动作不存在：' + id)
  const status = String(input.status || '').trim()
  if (!STATUSES.has(status)) throw new Error('响应状态非法：' + status)
  if (status === current.status) throw new Error('响应状态没有变化')
  if (current.status === 'rolled_back' || current.status === 'cancelled') throw new Error('响应动作已终态')
  if (status === 'applied') {
    const task = store.getTask(current.task_id)
    if (task === null || task.approved_by === null || task.approved_by === '') {
      throw new Error('响应动作未审批，不能标记为已执行')
    }
  }
  if (status === 'rolled_back' && current.status !== 'applied') throw new Error('只有已执行动作才能回滚')
  if (status === 'applied' && current.status !== 'planned') throw new Error('只有计划中的动作才能标记已执行')
  if (status === 'cancelled' && current.status !== 'planned') throw new Error('只有计划中的动作才能取消')
  const evidence = String(input.evidence || '').trim()
  if (status === 'applied' && evidence === '') throw new Error('标记已执行必须写执行证据')
  const at = now()
  store.sql('UPDATE response_actions SET status = ?, evidence = ?, updated_at = ? WHERE id = ?')
    .run(status, evidence, at, id)
  store.addTimeline(engagementId, {
    actor: String(input.actor || 'commander'),
    action: 'response_' + status,
    target: current.target,
    detail: `response=${id} task=${current.task_id}${evidence ? ' evidence=' + evidence.slice(0, 300) : ''}`,
  })
  return store.sql('SELECT * FROM response_actions WHERE id = ?').get(id)
}

export function listResponses(store, engagementId, filters = {}) {
  const clauses = ['engagement_id = ?']
  const params = [engagementId]
  if (typeof filters.status === 'string' && filters.status !== '') {
    clauses.push('status = ?')
    params.push(filters.status)
  }
  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500)
  return store.sql(`SELECT * FROM response_actions WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
    .all(...params, limit)
}
