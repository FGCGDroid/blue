/** 工具组：发现（M4.1）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { addFinding, listFindings, updateFinding } from '../app/findings/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'finding'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_finding_add',
    description: '登记一个防守侧发现（漏洞/暴露面/失陷痕迹/配置缺陷），带证据与修复建议。发现必须落库，报告只认库里的记录。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      title: { type: 'string', required: true },
      severity: { type: 'string', description: 'critical/high/medium/low/info' },
      category: { type: 'string', description: 'webshell/rce/upload/weak_password/exposure/misconfig/malware/other' },
      confidence: { type: 'string', description: '置信度：low/medium/high' },
      source: { type: 'string', description: '证据来源/检测器' },
      task_id: { type: 'string', description: '（可选）产生该发现的任务 id' },
      asset_id: { type: 'string' },
      cve: { type: 'string' },
      evidence: { type: 'string', description: '原始请求/日志/命令/文件路径/哈希' },
      recommendation: { type: 'string' },
      status: { type: 'string', description: 'open/fixed/accepted/false_positive' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.title !== 'string' || args.title.trim() === '') {
        throw new BlueError('FINDING_INPUT', 'title 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...addFinding(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_finding_update',
    description: '更新一个发现的处置状态/级别/证据/建议：open/fixed/accepted/false_positive。修复后必须把复测证据写进 evidence。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      id: { type: 'string', required: true },
      status: { type: 'string', description: 'open/fixed/accepted/false_positive' },
      severity: { type: 'string' },
      confidence: { type: 'string' },
      source: { type: 'string' },
      task_id: { type: 'string' },
      cve: { type: 'string' },
      evidence: { type: 'string' },
      recommendation: { type: 'string' },
      note: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.id !== 'string' || args.id.trim() === '') {
        throw new BlueError('FINDING_ID', 'id 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...updateFinding(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_finding_list',
    description: '列出本目标的发现，可按状态/严重级别/类型过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      status: { type: 'string' },
      severity: { type: 'string' },
      category: { type: 'string' },
      confidence: { type: 'string' },
      source: { type: 'string' },
      task_id: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listFindings(store, engagement.id, args),
      }
    }),
  }))
}
