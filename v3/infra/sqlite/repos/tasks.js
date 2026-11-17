/**
 * 任务仓储（M2）。
 *
 * 只负责持久化与状态机校验；风险分级来自 domain/task/risk.js。
 * 审批是唯一允许 pending_approval -> queued 的路径。
 */
import { randomUUID } from 'node:crypto'
import { TASK_STATUS, canTransitionTask, isTerminalTask } from '../../../domain/task/states.js'
import { inferRisk } from '../../../domain/task/risk.js'
import { BlueError } from '../../../domain/shared/errors.js'
import { nowIso } from '../../../domain/shared/time.js'

const PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3'])
const PATCH_FIELDS = new Set([
  'title', 'brief', 'priority', 'status', 'assignee', 'acceptance', 'result', 'note',
  'scope', 'constraints', 'expected_output', 'asset_id', 'alert_id', 'incident_id',
  'dispatched_at', 'completed_at',
])

function newId() {
  return `TSK-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asPriority(value) {
  const priority = asText(value, 'P2')
  return PRIORITIES.has(priority) ? priority : 'P2'
}

function jsonArray(value) {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

function jsonObject(value) {
  return JSON.stringify(value && typeof value === 'object' && !Array.isArray(value) ? value : {})
}

export class TaskRepo {
  constructor(db, timeline) {
    this.db = db
    this.timeline = timeline
  }

  create(engagementId, input = {}) {
    const inferred = inferRisk(input)
    const explicit = asText(input.risk_level, '').trim().toLowerCase()
    const risk = explicit === 'high' || inferred === 'high' ? 'high' : (explicit || inferred)
    if (!['low', 'medium', 'high'].includes(risk)) {
      throw new BlueError('RISK_LEVEL', `非法风险等级：${risk}`)
    }
    const requires = risk === 'high' ? 1 : (input.requires_approval === true ? 1 : 0)
    const status = risk === 'high'
      ? TASK_STATUS.PENDING_APPROVAL
      : asText(input.status, TASK_STATUS.QUEUED)
    if (![TASK_STATUS.QUEUED, TASK_STATUS.PENDING_APPROVAL].includes(status)) {
      throw new BlueError('TASK_STATUS', `新任务不能直接进入 ${status}`)
    }

    const id = newId()
    const at = nowIso()
    const row = {
      id,
      engagement_id: engagementId,
      role: asText(input.role, 'monitor'),
      title: asText(input.title).trim(),
      brief: asText(input.brief),
      priority: asPriority(input.priority),
      status,
      risk_level: risk,
      requires_approval: requires,
      approved_by: null,
      approved_at: null,
      approval_note: null,
      scope: asText(input.scope),
      constraints: jsonArray(input.constraints),
      expected_output: jsonObject(input.expected_output),
      assignee: asText(input.assignee),
      asset_id: input.asset_id ?? null,
      alert_id: input.alert_id ?? null,
      incident_id: input.incident_id ?? null,
      acceptance: asText(input.acceptance),
      result: '',
      note: asText(input.note),
      created_at: at,
      updated_at: at,
      dispatched_at: null,
      completed_at: null,
    }
    if (row.title === '') throw new BlueError('TASK_TITLE', '任务标题不能为空')

    this.db.transaction(() => {
      this.db.sql(`INSERT INTO tasks
        (id, engagement_id, role, title, brief, priority, status, risk_level, requires_approval,
         approved_by, approved_at, approval_note, scope, constraints, expected_output,
         assignee, asset_id, alert_id, incident_id, acceptance, result, note,
         created_at, updated_at, dispatched_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          row.id, row.engagement_id, row.role, row.title, row.brief, row.priority, row.status,
          row.risk_level, row.requires_approval, row.approved_by, row.approved_at, row.approval_note,
          row.scope, row.constraints, row.expected_output, row.assignee, row.asset_id, row.alert_id,
          row.incident_id, row.acceptance, row.result, row.note, row.created_at, row.updated_at,
          row.dispatched_at, row.completed_at,
        )
      this.timeline.append(engagementId, {
        actor: asText(input.actor, 'commander'),
        action: 'task_create',
        target: row.title,
        detail: `role=${row.role} priority=${row.priority} risk=${row.risk_level} status=${row.status}`,
      })
    })
    return this.get(id)
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM tasks WHERE id = ?').get(id)
    return row === undefined ? null : row
  }

  list(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.status === 'string' && filters.status !== '') {
      clauses.push('status = ?')
      params.push(filters.status)
    }
    if (typeof filters.role === 'string' && filters.role !== '') {
      clauses.push('role = ?')
      params.push(filters.role)
    }
    if (typeof filters.risk_level === 'string' && filters.risk_level !== '') {
      clauses.push('risk_level = ?')
      params.push(filters.risk_level)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 1000)
    return this.db.sql(`SELECT * FROM tasks WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit)
  }

  update(id, patch = {}, actor = 'commander') {
    const current = this.get(id)
    if (current === null) throw new BlueError('TASK_NOT_FOUND', `任务不存在：${id}`)

    const nextStatus = asText(patch.status, current.status)
    if (nextStatus !== current.status) {
      if (nextStatus === TASK_STATUS.DISPATCHED
        && current.risk_level === 'high'
        && (current.approved_at === null || current.approved_at === '')) {
        throw new BlueError('APPROVAL_REQUIRED', '高风险任务没有审批记录，不能派发')
      }
      if (current.status === TASK_STATUS.PENDING_APPROVAL && nextStatus !== TASK_STATUS.CANCELLED) {
        throw new BlueError('APPROVAL_REQUIRED', '待审批任务只能审批为 queued，或取消')
      }
      if (!canTransitionTask(current.status, nextStatus)) {
        throw new BlueError('TASK_TRANSITION', `非法任务迁移：${current.status} -> ${nextStatus}`)
      }
    }

    const sets = []
    const params = []
    for (const [key, value] of Object.entries(patch)) {
      if (!PATCH_FIELDS.has(key)) continue
      let normalized = value ?? null
      if (key === 'constraints') normalized = jsonArray(value)
      if (key === 'expected_output') normalized = jsonObject(value)
      sets.push(`${key} = ?`)
      params.push(normalized)
    }
    if (nextStatus !== current.status) {
      sets.push('status = ?')
      params.push(nextStatus)
      if (nextStatus === TASK_STATUS.DISPATCHED) {
        sets.push('dispatched_at = ?')
        params.push(nowIso())
      }
      if (isTerminalTask(nextStatus)) {
        sets.push('completed_at = ?')
        params.push(nowIso())
      }
    }
    if (sets.length === 0) return current
    sets.push('updated_at = ?')
    params.push(nowIso(), id)

    this.db.transaction(() => {
      this.db.sql(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params)
      this.timeline.append(current.engagement_id, {
        actor,
        action: 'task_update',
        target: current.title,
        detail: `status=${nextStatus} risk=${current.risk_level}${patch.note ? ' note=' + asText(patch.note) : ''}`,
      })
    })
    return this.get(id)
  }

  approve(id, options = {}) {
    const current = this.get(id)
    if (current === null) throw new BlueError('TASK_NOT_FOUND', `任务不存在：${id}`)
    if (current.status !== TASK_STATUS.PENDING_APPROVAL) {
      throw new BlueError('TASK_NOT_PENDING', `任务不在待审批状态：${id}`)
    }
    const actor = asText(options.actor, 'commander')
    const note = asText(options.note)
    const at = nowIso()

    this.db.transaction(() => {
      this.db.sql(`UPDATE tasks
        SET status = ?, approved_by = ?, approved_at = ?, approval_note = ?, updated_at = ?
        WHERE id = ? AND status = ?`)
        .run(TASK_STATUS.QUEUED, actor, at, note, at, id, TASK_STATUS.PENDING_APPROVAL)
      this.timeline.append(current.engagement_id, {
        actor,
        action: 'approval',
        target: current.title,
        detail: `task_id=${current.id} risk=${current.risk_level} decision=approved note=${note}`,
      })
    })
    return this.get(id)
  }

  counts(engagementId) {
    const rows = this.db.sql(`SELECT status, COUNT(*) AS n FROM tasks WHERE engagement_id = ? GROUP BY status`)
      .all(engagementId)
    const out = {}
    for (const row of rows) out[row.status] = row.n
    return out
  }
}
