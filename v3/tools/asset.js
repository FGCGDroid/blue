/** 工具组：资产（M4.0）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { addAsset, queryAssets } from '../app/assets/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'asset'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_asset_add',
    description: '登记（或更新）一个需要防守的资产：域名/IP/URL/主机/数据库/云资源。同一目标下同 kind+address+port 会更新而不是重复插入。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      name: { type: 'string', required: true, description: '资产名称/域名/用途' },
      address: { type: 'string', description: 'IP、域名或 URL' },
      kind: { type: 'string', description: 'host/web/api/db/vpn/cloud/container/other' },
      port: { type: 'number', description: '端口（没有就不填）' },
      service: { type: 'string', description: '服务/中间件/版本' },
      criticality: { type: 'string', description: 'critical/high/medium/low' },
      owner: { type: 'string', description: '负责人/业务方' },
      tags: { type: 'array', items: { type: 'string' }, description: '标签' },
      evidence: { type: 'string', description: '归属/暴露面证据' },
      status: { type: 'string', description: 'in_scope/out_of_scope/unknown/retired' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.name !== 'string' || args.name.trim() === '') {
        throw new BlueError('ASSET_INPUT', 'name 不能为空')
      }
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...addAsset(store, engagement.id, args),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_asset_query',
    description: '查询本目标的资产清单，可按关键词/类型/关键级别/状态过滤；默认按 critical→low 排序。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      q: { type: 'string', description: '关键词（名称/地址/服务/负责人）' },
      kind: { type: 'string' },
      criticality: { type: 'string' },
      status: { type: 'string' },
      limit: { type: 'number', description: '默认 200，最大 1000' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...queryAssets(store, engagement.id, args),
      }
    }),
  }))
}
