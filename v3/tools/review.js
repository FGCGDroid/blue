/** 工具组：只读复核（吸收 Muteki Reviewer 思路）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'

export const group = 'review'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_review',
    description: '只读复核：找无证据结论、无 result 的任务、未闭环告警。不改库、不派单、不计额度。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标；默认当前绑定' },
      limit: { type: 'number', description: '最多检查多少条，默认 200' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const limit = Math.min(Math.max(Number(args.limit) || 200, 1), 1000)
      const issues = []
      const findings = store.facts.listFindings(engagement.id, { limit })
      for (const finding of findings) {
        if (finding.status === 'open' && !String(finding.evidence || '').trim()) {
          issues.push({ kind: 'finding_no_evidence', id: finding.id, title: finding.title, note: '结论没有证据，只能算观察' })
        }
        if (finding.status === 'fixed' && !String(finding.evidence || '').trim()) {
          issues.push({ kind: 'fixed_no_evidence', id: finding.id, title: finding.title, note: '标记已修复但没有验证证据' })
        }
      }
      const tasks = store.tasks.list(engagement.id, { limit })
      for (const task of tasks) {
        if (task.status === 'done' && !String(task.result || '').trim()) {
          issues.push({ kind: 'task_no_result', id: task.id, title: task.title, note: '已完成但没有 result' })
        }
        if (task.status === 'blocked' && !String(task.note || '').trim()) {
          issues.push({ kind: 'task_blocked_no_reason', id: task.id, title: task.title, note: '阻塞但没有原因' })
        }
      }
      const alerts = store.facts.listAlerts(engagement.id, { status: 'open', limit })
      if (alerts.length > 0) {
        issues.push({ kind: 'open_alerts', count: alerts.length, note: '还有未闭环告警' })
      }
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        verdict: issues.length === 0 ? 'pass' : 'attention',
        counts: { findings: findings.length, tasks: tasks.length, open_alerts: alerts.length },
        issues,
        note: '只读复核，不修改任何事实。',
      }
    }),
  }))
}
