/** 工具组：审计/锚定（M4.4）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { anchorAndPush } from '../app/evidence/anchor.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'audit'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_audit_verify',
    description: '校验本目标时间线的哈希链：能发现审计记录被改、被删、被插队。只证明链内一致性，不是外部公证。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...store.timeline.verify(engagement.id) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_audit_anchor',
    description: '用本机 Ed25519 密钥签名当前审计链头，写入本地锚点。私钥仍在本机，不是外部公证。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      actor: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, anchor: store.evidenceRepo.addAnchor(engagement.id, { actor: args.actor || 'commander' }) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_audit_anchor_verify',
    description: '验证本目标所有本地锚点：签名、key_id、链头存在性、时间线完整性。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...store.evidenceRepo.verify(engagement.id) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_defense_status',
    description: '一眼看当前防守态势：目标/资产/告警/发现/IOC/任务统计、控制分数、审计状态、下一步建议。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const stats = store.engagements.stats(engagement.id)
      const audit = store.evidenceRepo.verify(engagement.id)
      const controls = store.controls.list(engagement.id)
      const suggestions = []
      if (stats.assets === 0) suggestions.push('先 blue_asset_add 登记核心资产')
      if (stats.alerts_open > 0) suggestions.push('blue_alert_list 逐条研判，critical 转任务')
      if (stats.tasks === 0) suggestions.push('用 blue_autopilot plan 生成候选任务')
      if (stats.iocs === 0) suggestions.push('从告警/日志提取 IOC 并 blue_ioc_add')
      if (!audit.ok) suggestions.push('blue_audit_anchor 后 blue_audit_anchor_verify')
      return {
        ok: true,
        engagement,
        stats,
        audit,
        controls: { total: controls.length, pass: controls.filter((c) => c.status === 'pass').length, fail: controls.filter((c) => c.status === 'fail').length },
        tools: { registered: env.registeredNames?.length ?? 0 },
        suggestions,
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_anchor_push',
    description: '先写本地锚点，再把锚点推送到显式配置的 file/https sink。sink 失败不回滚本地锚点。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      sinks: { type: 'array', description: 'sink 数组；file:{kind,path} 或 https:{kind,url,allow_hosts}' },
      actor: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      if (!Array.isArray(args.sinks) || args.sinks.length === 0) {
        throw new BlueError('ANCHOR_SINKS', 'sinks 必须是非空数组')
      }
      if (typeof env.pushToSinks !== 'function') throw new BlueError('ANCHOR_PUSH', 'sink 推送函数未注入')
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...await anchorAndPush(store, engagement.id, args.sinks, {
          actor: args.actor || 'commander',
          push: env.pushToSinks,
        }),
      }
    }),
  }))
}
