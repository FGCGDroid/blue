/** 工具组：决策（M4.2）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { addDecision, ensureDecisionInput, listDecisions } from '../app/decisions/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'decision'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_decision_add',
    description: '记录一条可审计决策：决策、理由、置信度、证据，以及关联的案件/任务/告警。只记录，不执行。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      incident_id: { type: 'string' },
      task_id: { type: 'string' },
      alert_id: { type: 'string' },
      decision: { type: 'string', required: true },
      rationale: { type: 'string' },
      confidence: { type: 'string', description: 'low/medium/high' },
      evidence: { type: 'string' },
      actor: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      ensureDecisionInput(args)
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...addDecision(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_decision_list',
    description: '列出本目标的决策记录，可按案件/任务/告警/置信度过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      incident_id: { type: 'string' },
      task_id: { type: 'string' },
      alert_id: { type: 'string' },
      confidence: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listDecisions(store, engagement.id, args),
      }
    }),
  }))
}
