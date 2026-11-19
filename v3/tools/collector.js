/** 工具组：远程日志采集器（M5.2）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'

export const group = 'collector'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_collector',
    description: '生成远程服务器日志采集器命令：服务器只读 tail access.log，带 token 推到 DSH。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标；默认当前绑定' },
      url: { type: 'string', description: 'DSH 对采集器可达的地址，例如 http://10.0.0.5:52394' },
      log: { type: 'string', description: '服务器上的 access.log 路径，默认 /var/log/nginx/access.log' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const url = String(args.url || 'http://<DSH-IP>:<端口>').replace(/\/+$/, '')
      const log = String(args.log || '/var/log/nginx/access.log')
      const token = store.collectorToken()
      const command = `BLUE_COLLECTOR_TOKEN='${token}' node blue-collector.mjs --url '${url}' --engagement '${engagement.id}' --log '${log}'`
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        endpoint: `${url}/blue/collect`,
        token,
        command,
        note: '采集器放在被防守服务器上；DSH 必须能被服务器访问。token 不要发到公开群。',
      }
    }),
  }))
}
