/** 工具组：时间线（M4.2）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { addTimeline, ensureTimelineMode, listTimeline } from '../app/timeline/service.js'

export const group = 'timeline'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_timeline',
    description: '记录或查看事件时间线。取证/处置的每一步都要留时间、主体、动作、对象、证据；报告与复盘都从这里取。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      mode: { type: 'string', description: 'add（默认）/ list' },
      actor: { type: 'string', description: 'monitor/hunt/ir/forensics/hardening/commander/system' },
      event: { type: 'string', description: '事件类型，例如 containment/eradication/recovery/evidence' },
      target: { type: 'string' },
      detail: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      ensureTimelineMode(args.mode)
      const engagement = engagementOf(store, exec, args.engagement)
      const mode = args.mode === 'list' ? 'list' : 'add'
      if (mode === 'list') {
        return {
          ok: true,
          engagement: { id: engagement.id, name: engagement.name },
          ...listTimeline(store, engagement.id, args.limit),
        }
      }
      const event = String(args.event || '').trim()
      if (event === '') throw new Error('event 不能为空')
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...addTimeline(store, engagement.id, args),
      }
    }),
  }))
}
