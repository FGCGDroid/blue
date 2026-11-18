/** 工具组：证据包（M4.4/M5）。 */
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
    description: '导出可移交的证据包 JSON：事实库快照、时间线、审计链/锚点状态。可写数据根 evidence/ 下并返回路径。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      actor: { type: 'string', description: '导出人，默认 commander' },
      write: { type: 'boolean', description: '是否写 evidence/ 下，默认 false' },
      path: { type: 'string', description: '（可选）evidence/ 下的文件名' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const result = buildEvidenceBundle(store, engagement.id, { actor: args.actor })
      if (args.write === true) {
        if (typeof env.writeEvidence !== 'function') throw new BlueError('EVIDENCE_WRITER', '证据写入器未注入')
        const written = env.writeEvidence(result.bundle, args.path)
        return {
          ok: true,
          engagement: { id: engagement.id, name: engagement.name },
          digest: result.digest,
          file: written.file,
          bytes: written.bytes,
          write: true,
        }
      }
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...result,
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_evidence_verify',
    description: '验证证据包：可传 bundle，也可传上次导出的 path；重算 digest，并检查当前目标的时间线/锚点。',
    parameters: {
      bundle: { type: 'object', description: '证据包对象（与 path 二选一）' },
      path: { type: 'string', description: 'evidence/ 下上次导出的文件路径（与 bundle 二选一）' },
      digest: { type: 'string', description: '（可选）期望 digest' },
    },
    execute: safe(async (args) => {
      let bundle = args.bundle
      let file = null
      if (args.path !== undefined && args.path !== '') {
        if (typeof env.readEvidence !== 'function') throw new BlueError('EVIDENCE_READER', '证据读取器未注入')
        const loaded = env.readEvidence(args.path)
        bundle = loaded.bundle
        file = loaded.file
      }
      if (bundle === null || typeof bundle !== 'object' || Array.isArray(bundle)) {
        throw new BlueError('EVIDENCE_BUNDLE', 'bundle 或 path 必须提供一个')
      }
      return { ok: true, file, ...verifyEvidenceBundle(store, bundle, { digest: args.digest }) }
    }),
  }))
}
