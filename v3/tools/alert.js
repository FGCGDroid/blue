/** 工具组：告警（M4.0）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { ingestAlert } from '../app/alerts/ingest.js'
import { listAlerts } from '../app/alerts/list.js'
import { triageAlert } from '../app/alerts/triage.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'alert'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_alert_ingest',
    description: '接入告警（WAF/IDS/EDR/日志平台/裁判系统）。支持单条字段或一段 JSON（对象/数组）；按 source+external_id+标题指纹去重。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      title: { type: 'string', description: '告警标题' },
      severity: { type: 'string', description: 'critical/high/medium/low/info' },
      source: { type: 'string', description: '来源系统' },
      confidence: { type: 'string', description: '置信度：low/medium/high' },
      task_id: { type: 'string', description: '（可选）关联任务 id' },
      external_id: { type: 'string', description: '来源侧唯一 id' },
      raw: { type: 'string', description: '原始日志/JSON' },
      note: { type: 'string', description: '初判备注' },
      event_time: { type: 'string', description: '事件发生时间（与入库时间分开保存）' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...ingestAlert(store, engagement.id, args),
        next: '对高危告警调用 blue_alert_triage 给出结论；M4.0 暂不创建任务。',
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_alert_list',
    description: '列出本目标的告警，按严重级别与时间排序；可按状态/级别/来源过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      status: { type: 'string', description: 'open/investigating/contained/closed/false_positive' },
      severity: { type: 'string' },
      source: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listAlerts(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_alert_triage',
    description: '研判一条告警：更新状态/级别/负责人/结论。真阳性应 clear 到 contained，假阳性标 false_positive 并写依据。M4.0 不创建任务。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true, description: '告警 id（ALT-...）' },
      status: { type: 'string', description: 'open/investigating/contained/closed/false_positive' },
      severity: { type: 'string' },
      assignee: { type: 'string' },
      note: { type: 'string', description: '研判结论与依据' },
      confidence: { type: 'string', description: '研判置信度：low/medium/high' },
      create_task: { type: 'boolean', description: 'M4.0 先传 false；task 组迁移后再支持 true' },
      role: { type: 'string', description: '预留：任务角色' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.id !== 'string' || args.id.trim() === '') {
        throw new BlueError('ALERT_ID', 'id 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...triageAlert(store, engagement.id, args),
      }
    }),
  }))
}
