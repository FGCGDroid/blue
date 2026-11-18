/** 工具组：攻击面/风险图（M4.3）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { attackCoverage, buildRiskGraph } from '../app/risk/service.js'

export const group = 'risk'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_attack_coverage',
    description: '查看内置日志规则对 MITRE ATT&CK 的覆盖映射：哪些技术有规则、哪些战术缺口、哪些规则未映射。不是全量覆盖率。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const rules = store.detection.list(engagement.id)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...attackCoverage(rules) }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_risk_graph',
    description: '生成攻击面图谱：资产—发现—告警关联和风险分，用于排序先查哪个资产。CVE/版本未验证，不是已确认漏洞。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, ...buildRiskGraph(store, engagement.id) }
    }),
  }))
}
