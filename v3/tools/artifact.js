/** 工具组：证据 artifact（M5.3）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'artifact'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_artifact',
    description: '保存原始证据片段（响应/日志/命令输出）并返回可校验 artifact_id；finding 必须引用它。',
    parameters: {
      action: { type: 'string', description: 'capture/get/verify/list，默认 capture' },
      engagement: { type: 'string', description: '（可选）防守目标；默认当前绑定' },
      content: { type: 'string', description: 'capture 的原始内容，最多 64 KiB' },
      source: { type: 'string', description: '来源，例如 GET http://... 或 /var/log/nginx/access.log' },
      kind: { type: 'string', description: 'text/http/log/command/file，默认 text' },
      id: { type: 'string', description: 'get/verify 的 artifact id' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const action = String(args.action || 'capture').trim().toLowerCase()
      if (action === 'capture') {
        const artifact = store.artifacts.capture(engagement.id, args)
        return { ok: true, artifact, note: '把这个 id 填进 finding.artifact_id。' }
      }
      if (action === 'get') {
        const artifact = store.artifacts.get(String(args.id || ''))
        if (artifact === null) throw new BlueError('ARTIFACT_NOT_FOUND', 'artifact 不存在')
        return { ok: true, artifact }
      }
      if (action === 'verify') {
        return { ok: true, ...store.artifacts.verify(String(args.id || '')) }
      }
      if (action === 'list') {
        return { ok: true, artifacts: store.artifacts.list(engagement.id, args.limit) }
      }
      throw new BlueError('ARTIFACT_ACTION', 'action 只能是 capture/get/verify/list')
    }),
  }))
}
