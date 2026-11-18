/** 工具组：响应计划/台账（M4.4）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'response'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_response_plan',
    description: '登记一个受控响应动作（隔离/封禁/禁用账号等）：强制 high 风险待审批任务，不执行命令。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      action: { type: 'string', required: true, description: 'isolate_host/block_ip/disable_account/...' },
      target: { type: 'string', required: true },
      rollback: { type: 'string', required: true, description: '必须写清回滚方案' },
      incident_id: { type: 'string' },
      note: { type: 'string' },
      actor: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const result = store.responses.plan(engagement.id, args)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...result }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_response_update',
    description: '更新响应台账状态与证据；applied 必须有审批且写执行证据。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true },
      status: { type: 'string', required: true, description: 'planned/pending_approval/applied/failed/rolled_back/cancelled' },
      evidence: { type: 'string' },
      actor: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const current = store.responses.get(args.id)
      if (current === null || current.engagement_id !== engagement.id) throw new BlueError('RESPONSE_NOT_FOUND', '响应动作不存在：' + args.id)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, action: store.responses.update(args.id, args) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_response_list',
    description: '列出响应台账，可按状态过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      status: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, actions: store.responses.list(engagement.id, args) }
    }),
  }))
}
