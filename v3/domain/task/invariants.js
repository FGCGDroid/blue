/**
 * 任务不变量（3.0 骨架）。
 *
 * 只做“这个任务对象是否自相矛盾”的检查，不写库。
 * 仓储层在 create/update/approve 后可以调用它做最后一道自检。
 */
import { BlueError } from '../shared/errors.js'
import { TASK_STATUS } from './states.js'

const RISKS = new Set(['low', 'medium', 'high'])

export function assertTaskInvariants(task) {
  if (task === null || typeof task !== 'object') {
    throw new BlueError('TASK_INVARIANT', '任务对象不能为空')
  }
  if (typeof task.title !== 'string' || task.title.trim() === '') {
    throw new BlueError('TASK_INVARIANT', '任务标题不能为空')
  }
  if (!RISKS.has(task.risk_level)) {
    throw new BlueError('TASK_INVARIANT', `非法风险等级：${task.risk_level}`)
  }
  if (task.risk_level === 'high' && !task.requires_approval) {
    throw new BlueError('TASK_INVARIANT', '高风险任务必须要求审批')
  }
  if (task.status === TASK_STATUS.PENDING_APPROVAL && !task.requires_approval) {
    throw new BlueError('TASK_INVARIANT', '待审批任务必须要求审批')
  }
  if (task.risk_level === 'high'
    && (task.status === TASK_STATUS.DISPATCHED || task.status === TASK_STATUS.RUNNING)
    && !task.approved_at) {
    throw new BlueError('TASK_INVARIANT', '高风险任务没有审批记录，不能处于派发/进行中')
  }
}
