/**
 * 任务状态机（3.0 骨架，从 2.0 lib/judge.js 原样搬）。
 *
 * 这里是唯一来源：store / app / tools / UI 都不要各写一套 if。
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

export const TERMINAL_TASK_STATUSES = Object.freeze([
  TASK_STATUS.DONE,
  TASK_STATUS.BLOCKED,
  TASK_STATUS.CANCELLED,
])

export const OPEN_TASK_STATUSES = Object.freeze([
  TASK_STATUS.QUEUED,
  TASK_STATUS.PENDING_APPROVAL,
  TASK_STATUS.DISPATCHED,
  TASK_STATUS.RUNNING,
])

export const ACTIVE_TASK_STATUSES = Object.freeze([
  TASK_STATUS.DISPATCHED,
  TASK_STATUS.RUNNING,
])

export const TASK_TRANSITIONS = Object.freeze({
  [TASK_STATUS.QUEUED]: Object.freeze([TASK_STATUS.DISPATCHED, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.PENDING_APPROVAL]: Object.freeze([TASK_STATUS.QUEUED, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.DISPATCHED]: Object.freeze([
    TASK_STATUS.RUNNING,
    TASK_STATUS.DONE,
    TASK_STATUS.BLOCKED,
    TASK_STATUS.CANCELLED,
  ]),
  [TASK_STATUS.RUNNING]: Object.freeze([
    TASK_STATUS.DONE,
    TASK_STATUS.BLOCKED,
    TASK_STATUS.CANCELLED,
  ]),
  [TASK_STATUS.DONE]: Object.freeze([]),
  [TASK_STATUS.BLOCKED]: Object.freeze([TASK_STATUS.DONE, TASK_STATUS.CANCELLED]),
  [TASK_STATUS.CANCELLED]: Object.freeze([]),
})

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

export function isUnclosedTask(status) {
  return !isTerminalTask(status)
}
