/** 工具组：IOC（M4.1）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { addIoc, checkIocs, listIocs } from '../app/iocs/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'ioc'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_ioc_add',
    description: '登记 IOC：ip/domain/url/hash/ua/filename/other。附来源与置信度；后续 blue_ioc_check 用它扫描文本。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      type: { type: 'string', description: 'ip/domain/url/md5/sha1/sha256/ua/filename/other' },
      value: { type: 'string', required: true },
      confidence: { type: 'string' },
      source: { type: 'string' },
      note: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.value !== 'string' || args.value.trim() === '') {
        throw new BlueError('IOC_INPUT', 'value 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...addIoc(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_ioc_list',
    description: '列出本目标的 IOC，可按类型/关键词过滤。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      type: { type: 'string' },
      q: { type: 'string' },
      limit: { type: 'number' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...listIocs(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_ioc_check',
    description: '用已登记 IOC 检查一段文本，返回命中行与统计。M4.1 只做文本子串匹配，内置攻击特征等 detection 组迁移后接入。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      text: { type: 'string', required: true, description: '要检查的文本' },
      max_hits: { type: 'number', description: '默认 100，最大 300' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const result = checkIocs(store, engagement.id, args)
      const limit = Math.min(Math.max(Number(args.max_hits) || 100, 1), 300)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...result,
        hits: result.hits.slice(0, limit),
      }
    }),
  }))
}
