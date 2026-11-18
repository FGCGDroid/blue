/** 工具组：响应执行（M4.4，兼容旧目录名）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { executeResponse } from '../app/response/execute.js'
import { verifyResponse } from '../app/response/verify.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'response-exec'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_response_execute',
    description: '受控执行/回滚响应：dry-run 只出计划；apply/rollback 必须 confirm=true、审批通过且写证据。默认 manual 适配器。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      response_id: { type: 'string', required: true },
      mode: { type: 'string', description: 'dry-run/apply/rollback/verify' },
      confirm: { type: 'boolean' },
      evidence: { type: 'string' },
      actor: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const action = store.responses.get(args.response_id)
      if (action === null || action.engagement_id !== engagement.id) throw new BlueError('RESPONSE_NOT_FOUND', '响应动作不存在：' + args.response_id)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...await executeResponse(store, args) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_response_verify',
    description: '验证响应动作：审批人、执行证据、applied 状态是否齐全。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      response_id: { type: 'string', required: true },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const action = store.responses.get(args.response_id)
      if (action === null || action.engagement_id !== engagement.id) throw new BlueError('RESPONSE_NOT_FOUND', '响应动作不存在：' + args.response_id)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...verifyResponse(store, args.response_id) }
    }),
  }))
}
