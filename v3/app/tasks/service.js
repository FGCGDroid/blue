/** 3.0 任务用例（M4.1）。 */
import { BlueError } from '../../domain/shared/errors.js'
import { inferRisk } from '../../domain/task/risk.js'

const ROLES = new Set(['monitor', 'intel', 'hunt', 'ir', 'forensics', 'hardening'])

function roleOf(value, fallback = 'hunt') {
  const role = typeof value === 'string' && value.trim() !== '' ? value.trim().toLowerCase() : fallback
  if (!ROLES.has(role)) throw new BlueError('TASK_ROLE', `非法角色：${role}`)
  return role
}

export function createTask(store, engagementId, input = {}) {
  const role = roleOf(input.role)
  const risk = inferRisk({ ...input, role })
  const task = store.tasks.create(engagementId, {
    ...input,
    role,
    risk_level: risk,
    requires_approval: risk === 'high' ? true : input.requires_approval === true,
  })
  return { task, stats: store.engagements.stats(engagementId) }
}

export function updateTask(store, engagementId, input = {}) {
  const id = String(input.id ?? '').trim()
  if (id === '') throw new BlueError('TASK_ID', '任务 id 不能为空')
  const current = store.tasks.get(id)
  if (current === null) throw new BlueError('TASK_NOT_FOUND', '任务不存在：' + id)
  if (current.engagement_id !== engagementId) throw new BlueError('TASK_SCOPE', '任务不属于当前防守目标')
  if (input.role !== undefined && roleOf(input.role) !== current.role) {
    throw new BlueError('TASK_ROLE_IMMUTABLE', 'M4.1 不支持改角色；请新建任务，避免风险等级被绕过')
  }
  const task = store.tasks.update(id, input, input.actor || 'commander')
  return { task, stats: store.engagements.stats(engagementId) }
}

export function approveTask(store, engagementId, input = {}) {
  const id = String(input.task_id ?? '').trim()
  if (id === '') throw new BlueError('TASK_ID', '任务 id 不能为空')
  const current = store.tasks.get(id)
  if (current === null) throw new BlueError('TASK_NOT_FOUND', '任务不存在：' + id)
  if (current.engagement_id !== engagementId) throw new BlueError('TASK_SCOPE', '任务不属于当前防守目标')
  const actor = String(input.actor ?? '').trim()
  if (actor === '') throw new BlueError('TASK_APPROVER', '审批人不能为空')
  const task = store.tasks.approve(id, { actor, note: input.note || 'human approved' })
  return { task, stats: store.engagements.stats(engagementId) }
}

export function listTasks(store, engagementId, filters = {}) {
  const tasks = store.tasks.list(engagementId, filters)
  return { count: tasks.length, tasks, stats: store.engagements.stats(engagementId) }
}
