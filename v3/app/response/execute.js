/**
 * 受控响应执行用例（M3.5）。
 *
 * mode:
 *   dry-run  只出计划，不写库
 *   apply    审批后执行/人工回填，状态 planned -> applied
 *   rollback applied -> rolled_back
 *   verify   只读验证
 *
 * 默认 manual 适配器：只打印人工命令，不自动执行破坏性动作。
 */
import { BlueError } from '../../domain/shared/errors.js'
import { createManualAdapter } from '../../domain/response/adapters.js'

function actionId(input) {
  return String(input.response_id || input.id || '').trim()
}

export async function executeResponse(store, input = {}, context = {}) {
  const id = actionId(input)
  if (id === '') throw new BlueError('RESPONSE_INPUT', 'response_id 不能为空')
  const action = store.responses.get(id)
  if (action === null) throw new BlueError('RESPONSE_NOT_FOUND', `响应动作不存在：${id}`)

  const mode = String(input.mode || 'dry-run').trim()
  const adapter = context.adapter || createManualAdapter()

  if (mode === 'verify') {
    return { ok: true, mode, ...store.responses.verify(id) }
  }

  if (!['dry-run', 'apply', 'rollback'].includes(mode)) {
    throw new BlueError('RESPONSE_MODE', `不支持的执行模式：${mode}`)
  }

  if (mode === 'dry-run') {
    const plan = adapter.plan ? adapter.plan(action) : null
    return { ok: true, mode, action, plan, note: 'dry-run 不写库，不执行' }
  }

  if (input.confirm !== true) {
    throw new BlueError('RESPONSE_CONFIRM', '执行/回滚必须显式 confirm=true')
  }

  if (mode === 'apply') {
    const task = store.tasks.get(action.task_id)
    if (task === null || task.approved_by === null || task.approved_by === '') {
      throw new BlueError('RESPONSE_APPROVAL', '响应动作未审批，不能执行')
    }
    const result = await adapter.execute(action)
    if (!result || result.ok !== true) {
      return { ok: false, mode, action, result, error: 'adapter rejected' }
    }
    const evidence = String(input.evidence || result.evidence || '').trim()
    if (evidence === '') {
      throw new BlueError('RESPONSE_EVIDENCE', '执行必须写执行证据（人工执行也要回填）')
    }
    const updated = store.responses.update(id, {
      status: 'applied',
      evidence,
      actor: input.actor || 'commander',
    })
    return { ok: true, mode, action: updated, task, result }
  }

  const result = await adapter.rollback(action)
  if (!result || result.ok !== true) {
    return { ok: false, mode, action, result, error: 'adapter rejected' }
  }
  const evidence = String(input.evidence || result.evidence || '').trim()
  if (evidence === '') {
    throw new BlueError('RESPONSE_EVIDENCE', '回滚必须写回滚证据')
  }
  const updated = store.responses.update(id, {
    status: 'rolled_back',
    evidence,
    actor: input.actor || 'commander',
  })
  return { ok: true, mode, action: updated, result }
}
