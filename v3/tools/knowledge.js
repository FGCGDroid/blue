/** 工具组：攻击打法知识库（M5.1）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { defendEntry, learnAlert, seedTechniqueLibrary } from '../app/knowledge/service.js'
import { signatureOf } from '../domain/knowledge/signature.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'knowledge'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_knowledge',
    description: '攻击打法知识库：记录攻击签名、匹配历史、生成可回滚的防御动作。告警入库时会自动学习；seed 把内置打法（M01–M32）推进库里；阻断动作不会自动改防火墙。',
    parameters: {
      action: { type: 'string', required: true, description: 'list/learn/deadend/match/seed/defend' },
      engagement: { type: 'string', description: '（可选）防守目标；默认当前绑定' },
      id: { type: 'string', description: '知识条目 id；defend 必填' },
      alert_id: { type: 'string', description: 'learn 时从已有告警学习' },
      path: { type: 'string', description: 'match/learn 的请求路径' },
      method: { type: 'string', description: 'match/learn 的 HTTP 方法' },
      status: { type: 'number', description: 'match/learn 的响应码' },
      title: { type: 'string', description: 'learn 的标题' },
      defense: { type: 'string', description: 'learn 的防御建议' },
    },
    execute: safe(async (args, exec) => {
      const action = String(args.action || '').trim().toLowerCase()
      const engagement = engagementOf(store, exec, args.engagement)

      if (action === 'list') {
        const entries = store.knowledge.list(engagement.id, { limit: args.limit })
        return { ok: true, count: entries.length, entries }
      }

      if (action === 'match') {
        const entry = store.knowledge.match(engagement.id, args)
        return { ok: true, matched: entry !== null, entry, signature: signatureOf(args) }
      }

      if (action === 'learn') {
        if (typeof args.alert_id === 'string' && args.alert_id.trim() !== '') {
          const alert = store.facts.getAlert(args.alert_id.trim())
          if (alert === null) throw new BlueError('ALERT_NOT_FOUND', '告警不存在：' + args.alert_id)
          return { ok: true, ...learnAlert(store, engagement.id, alert) }
        }
        const learned = store.knowledge.observe(engagement.id, args, {
          title: args.title,
          defense: args.defense ? { action: 'detect', summary: String(args.defense) } : undefined,
        })
        return { ok: true, ...learned }
      }

      if (action === 'deadend') {
        const learned = store.knowledge.observe(engagement.id, args, {
          kind: 'deadend',
          title: args.title || `死路：${signatureOf(args)}`,
          defense: { action: 'deadend', summary: String(args.defense || '已验证无效，不要重复同一打法') },
        })
        return { ok: true, ...learned, note: '已记为死路；后续 match 命中会提醒不要重复。' }
      }

      if (action === 'seed') {
        return { ok: true, ...seedTechniqueLibrary(store, engagement.id) }
      }

      if (action === 'defend') {
        const id = String(args.id || '').trim()
        if (id === '') throw new BlueError('KNOWLEDGE_ID', 'defend 需要 id')
        const entry = store.knowledge.get(id)
        if (entry === null) throw new BlueError('KNOWLEDGE_NOT_FOUND', '知识条目不存在：' + id)
        const defended = defendEntry(store, engagement.id, id)
        if (defended === null) throw new BlueError('KNOWLEDGE_NOT_FOUND', '知识条目不存在：' + id)
        let applied = null
        if (entry.defense?.action === 'block_path' && env.blueGateway?.status?.().running && typeof env.savePolicy === 'function' && env.gatewayConfig?.policyPath) {
          const match = /^http:[^:]+:(.*):\d+$/.exec(entry.signature)
          const prefix = match ? match[1] : ''
          if (prefix.startsWith('/') && !env.loadPolicy(env.gatewayConfig.policyPath).policy.deny.some((rule) => rule.prefix === prefix)) {
            const loaded = env.loadPolicy(env.gatewayConfig.policyPath)
            const next = { ...loaded.policy, deny: [...loaded.policy.deny, { id: `kb-${id.slice(3, 12).toLowerCase()}`, prefix }] }
            const saved = env.savePolicy(env.gatewayConfig.policyPath, next)
            const reloaded = env.blueGateway?.reload?.()
            applied = { prefix, policy_path: saved.path, hash: saved.hash, reload: reloaded ?? null }
          }
        }
        return {
          ok: true,
          ...defended,
          applied,
          note: defended.task === null
            ? defended.note
            : (applied ? '已写网关 deny 并热加载；可回滚。' : '已生成防御任务；不会自动改主机或防火墙。'),
        }
      }

      throw new BlueError('KNOWLEDGE_ACTION', 'action 只能是 list/learn/deadend/match/seed/defend')
    }),
  }))
}
