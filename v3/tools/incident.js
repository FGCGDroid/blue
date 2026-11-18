/** 工具组：案件（M4.1）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { attachIncident, listIncidents, openIncident, updateIncident } from '../app/incidents/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'incident'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_incident_open',
    description: '开一个案件（incident），用于把多条告警/发现/任务归到同一事件下。案件是事实库记录，不会自动执行处置。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      title: { type: 'string', required: true },
      severity: { type: 'string', description: 'critical/high/medium/low/info' },
      owner: { type: 'string' },
      summary: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.title !== 'string' || args.title.trim() === '') {
        throw new BlueError('INCIDENT_INPUT', 'title 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...openIncident(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_incident_list',
    description: '列出案件，可按状态/级别/负责人过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      status: { type: 'string' },
      severity: { type: 'string' },
      owner: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listIncidents(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_incident_update',
    description: '更新案件状态/级别/负责人/摘要；状态：open/investigating/contained/closed。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true },
      status: { type: 'string' },
      severity: { type: 'string' },
      owner: { type: 'string' },
      summary: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.id !== 'string' || args.id.trim() === '') {
        throw new BlueError('INCIDENT_ID', 'id 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...updateIncident(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_incident_attach',
    description: '把告警/发现/任务挂到案件下；三者至少给一个，且必须属于同一防守目标。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true, description: '案件 id' },
      alert_id: { type: 'string' },
      finding_id: { type: 'string' },
      task_id: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.id !== 'string' || args.id.trim() === '') {
        throw new BlueError('INCIDENT_ID', 'id 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...attachIncident(store, engagement.id, args),
      }
    }),
  }))
}
