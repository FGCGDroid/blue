/** 工具组：遥测源（M4.3）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { scanEvents } from '../app/detection/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'telemetry'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_telemetry_source_add',
    description: '登记一个文件型遥测源（JSONL）。只读取文件、不执行内容；路径限制在 DSH/blue、ctf-lab、当前工作区或 BLUE_TELEMETRY_ROOT。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      name: { type: 'string', required: true, description: '源名称，字母数字._-，用于去重' },
      path: { type: 'string', required: true, description: 'JSONL 文件路径' },
      kind: { type: 'string', description: 'jsonl（M4.3 只支持 jsonl）' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const source = store.telemetry.addSource(engagement.id, {
        name: args.name,
        path: args.path,
        kind: 'jsonl',
      })
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        source,
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_telemetry_poll',
    description: '从上次 cursor 继续读取遥测源，按启用规则匹配并落告警。可指定 name，不指定则轮询全部 active 源。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      name: { type: 'string', description: '（可选）只轮询某个源' },
      max_alerts: { type: 'number', description: '单次最多写入告警数，默认 200' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      if (typeof env.readJsonl !== 'function') throw new BlueError('JSONL_READER', 'JSONL reader 未注入')
      const sources = store.telemetry.listSources(engagement.id)
        .filter((source) => source.status === 'active')
        .filter((source) => !args.name || source.name === args.name)
      if (args.name && sources.length === 0) throw new BlueError('TELEMETRY_NOT_FOUND', '遥测源不存在：' + args.name)
      const rules = store.detection.list(engagement.id).filter((rule) => rule.enabled)
      const maxAlerts = Math.min(Math.max(Number(args.max_alerts) || 200, 1), 2000)
      const results = []
      for (const source of sources) {
        try {
          const loaded = env.readJsonl(source.path, { maxEvents: 20000 })
          const start = Math.min(source.cursor, loaded.events.length)
          const events = loaded.events.slice(start)
          const result = scanEvents(rules, events, { maxHits: maxAlerts })
          const alerts = []
          for (const hit of result.hits) {
            const event = hit.event
            const alert = store.facts.addAlert(engagement.id, {
              title: `检测命中：${hit.title}`,
              severity: hit.severity,
              source: 'telemetry:' + source.name,
              confidence: 'high',
              external_id: `${source.name}:${start}:${hit.rule}:${JSON.stringify(event).slice(0, 200)}`,
              event_time: String(event.at || event.time || event.ts || ''),
              raw: JSON.stringify(event).slice(0, 8000),
              actor: 'monitor',
            })
            alerts.push(alert)
          }
          store.telemetry.saveCursor(source.id, {
            cursor: start + events.length,
            events: Number(source.events_total) + events.length,
            alerts: Number(source.alerts_total) + alerts.length,
            last_event_at: events.length > 0 ? new Date().toISOString() : source.last_event_at,
          })
          results.push({
            ok: true,
            name: source.name,
            read: events.length,
            hits: result.hits.length,
            alerts: alerts.length,
            truncated: result.truncated,
          })
        } catch (error) {
          store.telemetry.markError(source.id, error.message)
          results.push({ ok: false, name: source.name, error: error.message })
        }
      }
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        results,
        sources: store.telemetry.listSources(engagement.id),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_telemetry_health',
    description: '查看遥测源健康：cursor、累计事件/告警、最近轮询、最近事件和错误。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const sources = store.telemetry.listSources(engagement.id)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        count: sources.length,
        sources,
      }
    }),
  }))
}
