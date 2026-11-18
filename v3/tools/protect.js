/** 工具组：保护我的服务器（入门向导）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { protectionStatus, startProtection } from '../app/onboarding/service.js'
import { closeEngagement } from '../app/session/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'protect'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_protect',
    description: '“保护我的服务器”向导：填 IP/域名/网址，自动建立防护目标、登记资产，并给出人话下一步。不是远程扫描器，不会假装服务器已安全。',
    parameters: {
      action: { type: 'string', required: true, description: 'start/status/stop' },
      target: { type: 'string', description: '服务器 IP、域名或网址；start 必填' },
      name: { type: 'string', description: '防护目标名称，默认“保护 <host>”' },
      kind: { type: 'string', description: 'web/host/db/cloud/container/other，默认 web' },
      engagement: { type: 'string', description: 'status/stop 可指定目标；默认当前绑定' },
    },
    execute: safe(async (args, exec) => {
      const action = String(args.action || '').trim().toLowerCase()

      if (action === 'start') {
        const result = startProtection(store, args)
        return { ok: true, action: 'start', ...result }
      }

      if (action === 'status') {
        const engagement = engagementOf(store, exec, args.engagement)
        return { ok: true, action: 'status', ...protectionStatus(store, engagement.id) }
      }

      if (action === 'stop') {
        const engagement = engagementOf(store, exec, args.engagement)
        const result = closeEngagement(store, engagement.id)
        return { ok: true, action: 'stop', ...result }
      }

      throw new BlueError('PROTECT_ACTION', 'action 只能是 start/status/stop')
    }),
  }))
}
