/** 工具组：ctf_lab 靶场接入（M5.1）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'range'

function requireLab(env) {
  const lab = env.ctfLab
  if (lab === null || typeof lab !== 'object' || typeof lab.handle !== 'function') {
    throw new BlueError('CTF_LAB_UNAVAILABLE', '当前 DSH 未加载 ctf-lab，或版本不支持适配器')
  }
  return lab
}

function portOf(url) {
  try {
    const parsed = new URL(url)
    return Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
  } catch {
    return null
  }
}

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_range',
    description: '接入 ctf_lab：列出题目、启动/停止题目；启动时自动把题目 URL 登记为资产，并把 ctf-lab access.jsonl 接为遥测源。只操作 ctf_lab 自己的 op，不执行任意命令。',
    parameters: {
      action: { type: 'string', required: true, description: 'list/start/stop/status' },
      id: { type: 'string', description: '题目 id，start/stop/status 必填' },
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认当前绑定' },
      register: { type: 'boolean', description: 'start 时自动登记资产/遥测源，默认 true' },
    },
    execute: safe(async (args, exec) => {
      const lab = requireLab(env)
      const action = String(args.action || '').trim().toLowerCase()
      const id = String(args.id || '').trim()

      if (action === 'list') {
        const result = await lab.handle({ op: 'snapshot' })
        return { ok: true, ...result }
      }

      if (action === 'status') {
        if (id === '') throw new BlueError('RANGE_ID', 'status 需要 id')
        const result = await lab.handle({ op: 'snapshot' })
        const item = (result.challenges || []).find((challenge) => challenge.id === id) ?? null
        return { ok: true, challenge: item, progress: result.progress }
      }

      if (action === 'start') {
        if (id === '') throw new BlueError('RANGE_ID', 'start 需要 id')
        const engagement = engagementOf(store, exec, args.engagement)
        const result = await lab.handle({ op: 'start', id })
        if (result.ok === false) throw new BlueError('RANGE_START', result.error || '启动失败')
        let asset = null
        let source = null
        if (args.register !== false && typeof result.url === 'string' && result.url !== '') {
          const port = portOf(result.url)
          asset = store.facts.addAsset(engagement.id, {
            name: `ctf_lab:${id}`,
            address: result.url,
            kind: 'web',
            port,
            criticality: 'medium',
            tags: ['ctf_lab', 'auto'],
            evidence: `blue_range start ${id}；ctf_lab URL=${result.url}`,
            actor: 'monitor',
          })
          try {
            source = store.telemetry.addSource(engagement.id, {
              name: 'ctf-lab-access',
              kind: 'jsonl',
              path: lab.accessLog,
            })
          } catch (error) {
            source = { error: error?.message ?? String(error) }
          }
        }
        return {
          ok: true,
          action: 'start',
          id,
          url: result.url,
          asset,
          telemetry: source,
          note: '题目已启动；若需防守，请用 blue_telemetry_poll / blue_detection_scan。停止用 action=stop。',
        }
      }

      if (action === 'stop') {
        if (id === '') throw new BlueError('RANGE_ID', 'stop 需要 id')
        const result = await lab.handle({ op: 'stop', id })
        return { ok: true, action: 'stop', id, stopped: result.stopped === true, result }
      }

      throw new BlueError('RANGE_ACTION', 'action 只能是 list/start/stop/status')
    }),
  }))
}
