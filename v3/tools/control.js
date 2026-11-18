/** 工具组：控制验证（M4.3）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { evaluateControls, listControls } from '../app/controls/service.js'

export const group = 'control'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_control_scan',
    description: '执行防线控制验证：审计链、审批闸、遥测源健康、诱饵在线、审计锚定，结果写 controls。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...evaluateControls(store, engagement.id) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_control_list',
    description: '列出最近一次防线控制验证结果和分数。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...listControls(store, engagement.id) }
    }),
  }))
}
