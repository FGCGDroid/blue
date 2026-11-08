/**
 * 蓝队判定层（唯一来源）
 *
 * 状态枚举、合法迁移、未闭环/终态判定都只在这里定义。
 * store / plan / tools / UI 不要各写一套 if。
 */

export const TASK_STATUS = Object.freeze({
  QUEUED: 'queued',
  PENDING_APPROVAL: 'pending_approval',
  DISPATCHED: 'dispatched',
  RUNNING: 'running',
  DONE: 'done',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
})

export const TASK_STATUSES = Object.freeze(Object.values(TASK_STATUS))
export const TERMINAL_TASK_STATUSES = Object.freeze([TASK_STATUS.DONE, TASK_STATUS.BLOCKED, TASK_STATUS.CANCELLED])
export const OPEN_TASK_STATUSES = Object.freeze([
  TASK_STATUS.QUEUED,
  TASK_STATUS.PENDING_APPROVAL,
  TASK_STATUS.DISPATCHED,
  TASK_STATUS.RUNNING,
])
export const ACTIVE_TASK_STATUSES = Object.freeze([TASK_STATUS.DISPATCHED, TASK_STATUS.RUNNING])

export const TASK_TRANSITIONS = Object.freeze({
  [TASK_STATUS.QUEUED]: Object.freeze([TASK_STATUS.DISPATCHED, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.PENDING_APPROVAL]: Object.freeze([TASK_STATUS.QUEUED, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.DISPATCHED]: Object.freeze([TASK_STATUS.RUNNING, TASK_STATUS.DONE, TASK_STATUS.BLOCKED, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.RUNNING]: Object.freeze([TASK_STATUS.DONE, TASK_STATUS.BLOCKED, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.DONE]: Object.freeze([]),
  [TASK_STATUS.BLOCKED]: Object.freeze([]),
  [TASK_STATUS.CANCELLED]: Object.freeze([]),
})

export const ALERT_OPEN_STATUSES = Object.freeze(['open', 'investigating'])
export const ALERT_CLOSED_STATUSES = Object.freeze(['closed', 'false_positive'])
export const FINDING_OPEN_STATUSES = Object.freeze(['open'])
export const FINDING_CLOSED_STATUSES = Object.freeze(['fixed', 'accepted', 'false_positive'])

export const RISK_LEVELS = Object.freeze(['low', 'medium', 'high'])
export const TASK_RISK = Object.freeze({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high' })

/** 只用于常量枚举生成 SQL IN 列表，不接收外部输入。 */
export function sqlIn(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ')
}

export function canTransitionTask(from, to) {
  if (from === to) return true
  return (TASK_TRANSITIONS[from] ?? []).includes(to)
}

export function isTerminalTask(status) {
  return TERMINAL_TASK_STATUSES.includes(status)
}

export function isOpenTask(status) {
  return OPEN_TASK_STATUSES.includes(status)
}

export function isActiveTask(status) {
  return ACTIVE_TASK_STATUSES.includes(status)
}

export function isPendingApproval(status) {
  return status === TASK_STATUS.PENDING_APPROVAL
}

export function isOpenAlert(status) {
  return ALERT_OPEN_STATUSES.includes(status)
}

export function isOpenFinding(status) {
  return FINDING_OPEN_STATUSES.includes(status)
}

export function isFalsePositive(status) {
  return status === 'false_positive'
}

/** 任务是否是“未闭环”，供 autopilot 去重和报表使用。 */
export function isUnclosedTask(status) {
  return !isTerminalTask(status)
}

/** 统一态势：只从判定层读取，避免各角色各判各的。 */
export function postureOf(stats = {}) {
  if ((stats.alerts_critical || 0) > 0 || (stats.findings_critical || 0) > 0) return 'critical'
  if ((stats.alerts_open || 0) > 0 || (stats.findings_open || 0) > 0) return 'warning'
  if ((stats.tasks_pending_approval || 0) > 0) return 'warning'
  return 'stable'
}
