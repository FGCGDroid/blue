/** 工具组：CVE 防御包（M4.3）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { campaign, pack, scan } from '../app/cve/service.js'

export const group = 'cve'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_cve_pack',
    description: '查看 2026 CVE 防御包：补丁优先级、缓解动作和启发式日志特征。未联网核验，具体以厂商公告为准。',
    parameters: {
      id: { type: 'string', description: '精确 CVE 编号' },
      query: { type: 'string', description: '按编号/标题/产品搜索' },
      product: { type: 'string', description: '产品过滤，例如 PHP/Node.js' },
      include_actions: { type: 'boolean', description: '是否返回缓解动作，默认 true' },
    },
    execute: safe(async (args) => ({ ok: true, ...pack(args) })),
  }))

  registerTool(defineTool({
    name: 'blue_cve_scan',
    description: '用 CVE 防御包的启发式特征扫描文本，返回命中的 CVE、规则和片段。只作线索，不等同于已利用结论。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      text: { type: 'string', required: true, description: '要扫描的文本' },
      max_hits: { type: 'number', description: '最多命中数，默认 100' },
      include_low: { type: 'boolean', description: '是否把低置信特征计入 matched；默认 false' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        untrusted: true,
        ...scan(String(args.text || ''), { maxHits: args.max_hits, includeLow: args.include_low === true }),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_cve_campaign',
    description: '把 CVE 防御包匹配到资产并生成 hardening 核查任务。只按资产名/服务/tag 匹配，未验证版本；create=true 也只建任务。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      cve: { type: 'string', description: '（可选）只针对一个 CVE' },
      asset: { type: 'string', description: '（可选）只针对一个资产 id/名称' },
      create: { type: 'boolean', description: '是否真的创建任务；默认 false' },
      limit: { type: 'number', description: '最多生成任务数，默认 20' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...campaign(store, engagement.id, args),
      }
    }),
  }))
}
