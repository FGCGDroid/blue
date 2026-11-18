/** 工具组：证据包（M4.4）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { buildEvidenceBundle } from '../app/evidence/export.js'
import { verifyEvidenceBundle } from '../app/evidence/verify.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'evidence'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_evidence_export',
    description: '导出可移交的证据包 JSON：事实库快照、时间线、审计链/锚点状态。M4.4 返回 bundle，不写文件。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      actor: { type: 'string', description: '导出人，默认 commander' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...buildEvidenceBundle(store, engagement.id, { actor: args.actor }),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_evidence_verify',
    description: '验证证据包：重算 digest，并检查当前目标的时间线/锚点。只证明包内容一致，不证明采集过程未被操控。',
    parameters: {
      bundle: { type: 'object', required: true, description: '证据包对象' },
      digest: { type: 'string', description: '（可选）期望 digest' },
    },
    execute: safe(async (args) => {
      if (args.bundle === null || typeof args.bundle !== 'object' || Array.isArray(args.bundle)) {
        throw new BlueError('EVIDENCE_BUNDLE', 'bundle 必须是对象')
      }
      return { ok: true, ...verifyEvidenceBundle(store, args.bundle, { digest: args.digest }) }
    }),
  }))
}
