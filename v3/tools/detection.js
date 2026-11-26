/** 工具组：检测规则（M4.3）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { addRule, listRules, scanSource } from '../app/detection/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'detection'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_detection_rule_add',
    description: '新增/更新一条 Sigma-lite 检测规则：JSON selection + all/any，字段支持点路径和 * 通配符，不执行表达式。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      rule_key: { type: 'string', required: true, description: '规则唯一键，字母数字._-' },
      title: { type: 'string', required: true },
      severity: { type: 'string', description: 'critical/high/medium/low/info' },
      selection: { type: 'string', required: true, description: 'JSON 对象，例如 {"path":["/admin*"],"status":[401,403]}' },
      condition: { type: 'string', description: 'all 或 any，默认 all' },
      tags: { type: 'array', items: { type: 'string' } },
      enabled: { type: 'boolean', description: '默认 true' },
    },
    execute: safe(async (args, exec) => {
      let selection
      try {
        selection = typeof args.selection === 'string' ? JSON.parse(args.selection) : args.selection
      } catch {
        throw new BlueError('RULE_SELECTION', 'selection 必须是合法 JSON')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...addRule(store, engagement.id, { ...args, selection }),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_detection_rule_list',
    description: '列出 Sigma-lite 检测规则及启用状态。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listRules(store, engagement.id),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_detection_scan',
    description: '用当前启用的检测规则扫描一个已登记的遥测源，返回命中，不写库；用于调规则和看误报。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      source: { type: 'string', required: true, description: '已登记的遥测源名称' },
      max_events: { type: 'number', description: '最多扫描事件数，默认 5000' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const source = store.telemetry.listSources(engagement.id).find((item) => item.name === args.source)
      if (!source) throw new BlueError('TELEMETRY_NOT_FOUND', '遥测源不存在：' + args.source)
      if (typeof env.readJsonl !== 'function') throw new BlueError('JSONL_READER', 'JSONL reader 未注入')
      const loaded = env.readJsonl(source.path, { maxEvents: args.max_events })
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...scanSource(store, engagement.id, source.name, loaded.events, { maxHits: 5000 }),
        events_read: loaded.events.length,
      }
    }),
  }))
}
