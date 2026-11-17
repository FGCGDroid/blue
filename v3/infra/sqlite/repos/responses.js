/**
 * 响应动作仓储（M2）。
 *
 * 只做台账与状态机：计划 -> 待审批任务 -> 人工执行回填 / 取消 / 回滚。
 * 不执行命令；执行器在 M3.5。
 */
import { BlueError } from '../../../domain/shared/errors.js'
import {
  RESPONSE_ACTIONS, RESPONSE_STATUSES, canTransitionResponse,
} from '../../../domain/response/states.js'
import { asText, newId } from './shared.js'

export class ResponsesRepo {
  constructor(db, timeline, tasks, incidents) {
    this.db = db
    this.timeline = timeline
    this.tasks = tasks
    this.incidents = incidents
  }

  plan(engagementId, input = {}) {
    const action = asText(input.action).trim()
    if (!RESPONSE_ACTIONS.includes(action)) throw new BlueError('RESPONSE_ACTION', `不支持的响应动作：${action}`)
    const target = asText(input.target).trim()
    if (target === '') throw new BlueError('RESPONSE_TARGET', '响应目标不能为空')
    const rollback = asText(input.rollback).trim()
    if (rollback === '') throw new BlueError('RESPONSE_ROLLBACK', '必须写清回滚方案')

    if (input.incident_id) {
      const incident = this.incidents.get(String(input.incident_id))
      if (incident === null) throw new BlueError('INCIDENT_NOT_FOUND', `案件不存在：${input.incident_id}`)
      if (incident.engagement_id !== engagementId) {
        throw new BlueError('INCIDENT_SCOPE', '案件不属于当前防守目标')
      }
    }

    const task = this.tasks.create(engagementId, {
      role: 'ir',
      title: `响应：${action} ${target}`,
      brief: asText(input.note, '受控响应，执行前必须人工审批；插件不执行命令。'),
      priority: 'P1',
      risk_level: 'high',
      requires_approval: true,
      scope: target,
      acceptance: '审批通过后由人工执行，并回填执行证据与回滚结果',
      actor: asText(input.actor, 'commander'),
    })

    const id = newId('RSP')
    const at = new Date().toISOString()
    this.db.sql(`INSERT INTO response_actions
      (id, engagement_id, incident_id, task_id, action, target, rollback, status, evidence, actor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', '', ?, ?, ?)`)
      .run(id, engagementId, input.incident_id ?? null, task.id, action, target, rollback, asText(input.actor, 'commander'), at, at)
    this.timeline.append(engagementId, {
      actor: asText(input.actor, 'commander'),
      action: 'response_plan',
      target,
      detail: `response=${id} action=${action} task=${task.id} status=pending_approval`,
    })
    return { action: this.get(id), task }
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM response_actions WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  list(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.status === 'string' && filters.status !== '') {
      clauses.push('status = ?')
      params.push(filters.status)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500)
    return this.db.sql(`SELECT * FROM response_actions WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit)
  }

  update(id, input = {}) {
    const current = this.get(id)
    if (current === null) throw new BlueError('RESPONSE_NOT_FOUND', `响应动作不存在：${id}`)
    const status = asText(input.status).trim()
    if (!RESPONSE_STATUSES.includes(status)) throw new BlueError('RESPONSE_STATUS', `响应状态非法：${status}`)
    if (status === current.status) throw new BlueError('RESPONSE_STATUS', '响应状态没有变化')
    if (!canTransitionResponse(current.status, status)) {
      throw new BlueError('RESPONSE_TRANSITION', `响应状态不能从 ${current.status} 改为 ${status}`)
    }
    if (status === 'applied') {
      const task = this.tasks.get(current.task_id)
      if (task === null || task.approved_by === null || task.approved_by === '') {
        throw new BlueError('RESPONSE_APPROVAL', '响应动作未审批，不能标记为已执行')
      }
    }

    const evidence = asText(input.evidence).trim()
    if (status === 'applied' && evidence === '') {
      throw new BlueError('RESPONSE_EVIDENCE', '标记已执行必须写执行证据')
    }

    const at = new Date().toISOString()
    this.db.sql('UPDATE response_actions SET status = ?, evidence = ?, updated_at = ? WHERE id = ?')
      .run(status, evidence, at, id)
    this.timeline.append(current.engagement_id, {
      actor: asText(input.actor, 'commander'),
      action: 'response_' + status,
      target: current.target,
      detail: `response=${id} task=${current.task_id}${evidence ? ' evidence=' + evidence.slice(0, 300) : ''}`,
    })
    return this.get(id)
  }

  verify(id) {
    const action = this.get(id)
    if (action === null) throw new BlueError('RESPONSE_NOT_FOUND', `响应动作不存在：${id}`)
    const task = this.tasks.get(action.task_id)
    return {
      action,
      task,
      approved: Boolean(task && task.approved_by),
      evidence_present: Boolean(action.evidence),
      applied: action.status === 'applied',
      ok: Boolean(task && task.approved_by) && action.status === 'applied' && Boolean(action.evidence),
    }
  }
}
