/** 任务领域模型常量（3.0 骨架）。 */
export const TASK_ID_PREFIX = 'TSK'

export const TASK_PRIORITIES = Object.freeze(['P0', 'P1', 'P2', 'P3'])

export const TASK_ROLES = Object.freeze([
  'monitor',
  'intel',
  'hunt',
  'ir',
  'forensics',
  'hardening',
])

export function isTaskRole(value) {
  return TASK_ROLES.includes(value)
}

export function isTaskPriority(value) {
  return TASK_PRIORITIES.includes(value)
}
