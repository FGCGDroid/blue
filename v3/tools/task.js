/** 工具组：任务与自主派发（M4.1）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { approveTask, createTask, listTasks, updateTask } from '../app/tasks/service.js'
import { runAutopilot } from '../app/tasks/autopilot.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'task'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_task_create',
    description: '手动创建一个处置任务（角色 + 优先级 + 自包含简报 + 验收标准）。high 风险任务会进入 pending_approval，必须再调用 blue_task_approve。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      role: { type: 'string', description: 'monitor/intel/hunt/ir/forensics/hardening' },
      title: { type: 'string', required: true },
      brief: { type: 'string', description: '目标、已知事实、已做过什么、期望产出' },
      priority: { type: 'string', description: 'P0/P1/P2/P3' },
      acceptance: { type: 'string' },
      asset_id: { type: 'string' },
      alert_id: { type: 'string' },
      scope: { type: 'string', description: '任务范围（资产/IP 段/URL）' },
      constraints: { type: 'array', items: { type: 'string' }, description: '只读/可隔离/不可删除等硬约束' },
      expected_output: { type: 'object', description: '期望写回的表/字段/证据要求' },
      risk_level: { type: 'string', description: 'low/medium/high；high 只能进入待审批' },
      requires_approval: { type: 'boolean', description: '是否必须人工放行；high 会强制为 true' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.title !== 'string' || args.title.trim() === '') {
        throw new BlueError('TASK_TITLE', 'title 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...createTask(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_task_update',
    description: '更新任务状态与结论：queued/dispatched/running/done/blocked/cancelled。完成后必须写 result。M4.1 不支持改角色。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true },
      status: { type: 'string' },
      result: { type: 'string' },
      note: { type: 'string' },
      assignee: { type: 'string' },
      priority: { type: 'string' },
      role: { type: 'string', description: 'M4.1 不允许改角色' },
      scope: { type: 'string' },
      constraints: { type: 'array', items: { type: 'string' } },
      expected_output: { type: 'object' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.id !== 'string' || args.id.trim() === '') {
        throw new BlueError('TASK_ID', 'id 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...updateTask(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_task_approve',
    description: '【人工放行】批准一条高风险 pending_approval 任务，将其改为 queued 并写入 approved_by/approved_at 与 timeline approval。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      task_id: { type: 'string', required: true },
      actor: { type: 'string', required: true, description: '审批人（控制台用户名或 human operator），不能为空' },
      note: { type: 'string', description: '审批备注/放行条件' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.actor !== 'string' || args.actor.trim() === '') {
        throw new BlueError('TASK_APPROVER', 'actor 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...approveTask(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_task_list',
    description: '列出任务队列，可按状态/角色/风险等级过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      status: { type: 'string' },
      role: { type: 'string' },
      risk_level: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listTasks(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_autopilot',
    description: '【任务编排】status/plan/next/cycle/complete/set_slots。M4.1 只登记任务与 dispatched，不自动拉起 subagent；高风险任务不会被自动派发。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      action: { type: 'string', required: true, description: 'status/plan/next/cycle/complete/set_slots' },
      task_id: { type: 'string', description: 'complete 时必填' },
      result: { type: 'string', description: 'complete 的结果摘要' },
      status: { type: 'string', description: 'complete 的状态：done/blocked' },
      slots: { type: 'number', description: 'set_slots 的并发数（1–8）' },
      limit: { type: 'number', description: 'plan/cycle 最多生成/领取多少条' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...await runAutopilot(store, engagement.id, args),
      }
    }),
  }))
}
