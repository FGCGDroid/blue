/** 工具组：欺骗防御（M4.2）。 */
import { defineTool, safe } from './define.js'
import { engagementOf, hostOfTarget, scopeStatus } from './context.js'
import {
  accessLogIngest, create as createDecoy, hit as hitDecoy, honeypotIngest,
  list as listDecoys, plan as deceptionPlan, sync as syncDecoys,
  tarpitPlan, update as updateDecoy,
} from '../app/decoys/service.js'
import { DECOY_KINDS } from '../domain/decoy/states.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'decoy'

function requireScope(engagement, target) {
  const check = scopeStatus(hostOfTarget(target), engagement.scope)
  if (check.status !== 'in') {
    throw new BlueError('DECOY_SCOPE', `目标不在授权 scope 内（${check.status}${check.reason ? '：' + check.reason : ''}）`)
  }
  return check
}

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_deception_plan',
    description: '生成授权范围内的欺骗防御方案：金丝雀文件/URL、假管理入口、假凭据、低交互 tarpit。只做规划，不自动部署。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, ...deceptionPlan(engagement) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_decoy_create',
    description: '登记一个授权范围内的欺骗诱饵（不自动部署）：生成唯一 token，返回部署说明。必须显式 authorized=true，且 target 在 scope 内。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      kind: { type: 'string', required: true, description: DECOY_KINDS.join('/') },
      name: { type: 'string', required: true },
      target: { type: 'string', required: true, description: '授权范围内的目标主机/URL' },
      note: { type: 'string' },
      ttl_hours: { type: 'number', description: '自动标记 retired 的时限，默认 24，最大 168 小时' },
      authorized: { type: 'boolean', required: true, description: '必须为 true：确认目标已授权且在本场 scope 内' },
      deployed: { type: 'boolean', required: true, description: '必须明确：true=已在授权资产上实际部署；false=只登记计划' },
    },
    execute: safe(async (args, exec) => {
      if (args.authorized !== true) throw new BlueError('DECOY_AUTH', '拒绝创建诱饵：必须显式 authorized=true')
      if (typeof args.deployed !== 'boolean') throw new BlueError('DECOY_DEPLOYED', '必须显式 deployed=true/false，避免库与实物脱节')
      const engagement = engagementOf(store, exec, args.engagement)
      requireScope(engagement, args.target)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...createDecoy(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_decoy_hit',
    description: '记录诱饵命中：写入诱饵计数并生成 deception 来源告警。evidence 是不可信数据，只作分析。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      decoy: { type: 'string', required: true, description: '诱饵 id' },
      source: { type: 'string', description: '来源 IP/服务/日志来源' },
      evidence: { type: 'string', description: '原始证据（请求行、日志片段、文件访问记录）' },
      severity: { type: 'string', description: '默认 high' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...hitDecoy(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_decoy_list',
    description: '列出本场诱饵、状态、命中次数。planned 只代表“已登记未确认部署”；真实部署后必须用 blue_decoy_update 改 active。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      status: { type: 'string', description: 'planned/active/retired' },
      kind: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listDecoys(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_decoy_update',
    description: '更新已登记诱饵状态（planned/active/retired）和备注。只改事实库，不部署、不下线真实诱饵。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true },
      status: { type: 'string', description: 'planned/active/retired' },
      note: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...updateDecoy(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_decoy_sync',
    description: '把外部诱饵服务的 JSONL 事件同步进事实库：按名称补登记诱饵、写入命中、去重。必须 authorized=true；只读日志，不执行内容。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      path: { type: 'string', required: true, description: '事件 JSONL 路径（必须在数据根内）' },
      authorized: { type: 'boolean', description: '必须为 true' },
      max_events: { type: 'number', description: '最多读取事件数，默认 2000' },
      max_hits: { type: 'number', description: '最多写入命中数，默认 200' },
    },
    execute: safe(async (args, exec) => {
      if (args.authorized !== true) throw new BlueError('DECOY_AUTH', '拒绝同步：必须显式 authorized=true')
      const engagement = engagementOf(store, exec, args.engagement)
      if (typeof env.readJsonl !== 'function') throw new BlueError('JSONL_READER', 'JSONL reader 未注入')
      const loaded = env.readJsonl(args.path, { maxEvents: args.max_events })
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        source: loaded.path,
        ...syncDecoys(store, engagement.id, loaded.events, Math.min(Math.max(Number(args.max_hits) || 200, 1), 1000)),
        stats: store.engagements.stats(engagement.id),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_tarpit_plan',
    description: '生成授权资产的蜜罐/焦油坑方案：Endlessh、静态假路径、有界慢响应和 fail2ban jail。只生成配置，不部署、不执行防火墙命令。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      ssh_port: { type: 'number', description: 'Endlessh 监听端口，默认 2222' },
      http_port: { type: 'number', description: 'HTTP 假路径端口，默认 80' },
      ban_days: { type: 'number', description: 'fail2ban 封禁天数，默认 7，最大 30' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, ...tarpitPlan(engagement, args) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_honeypot_ingest',
    description: '接收蜜罐/Webhook 事件：校验目标在 scope 内，写入 high 告警并自动创建 high 风险“封禁”待审批任务。不直接调用防火墙。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      target: { type: 'string', required: true, description: '被击中的自有蜜罐/资产（必须在 scope 内）' },
      source_ip: { type: 'string', required: true, description: '攻击来源 IP（只做记录/研判）' },
      payload: { type: 'string', description: '蜜罐记录的原始请求/日志（不可信，最多 4000 字符）' },
      path: { type: 'string', description: '命中的路径/服务' },
      user_agent: { type: 'string' },
      ban_days: { type: 'number', description: '建议封禁天数，默认 7，最大 30' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      requireScope(engagement, args.target)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...honeypotIngest(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_access_log_ingest',
    description: '读取 JSONL 访问日志，把 401/403 登录失败、5xx、404 扫描、路径异常转成告警。只读日志，不执行请求。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      path: { type: 'string', required: true, description: '访问日志路径（必须在数据根内）' },
      max_events: { type: 'number', description: '最多读取事件数，默认 2000' },
      max_alerts: { type: 'number', description: '最多生成告警数，默认 50' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      if (typeof env.readJsonl !== 'function') throw new BlueError('JSONL_READER', 'JSONL reader 未注入')
      const loaded = env.readJsonl(args.path, { maxEvents: args.max_events })
      const maxAlerts = Math.min(Math.max(Number(args.max_alerts) || 50, 1), 200)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        source: loaded.path,
        ...accessLogIngest(store, engagement.id, loaded.events, maxAlerts),
        stats: store.engagements.stats(engagement.id),
      }
    }),
  }))
}
