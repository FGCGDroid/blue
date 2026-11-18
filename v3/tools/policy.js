/** 工具组：策略（M4.5）。 */
import { defineTool, safe } from './define.js'
import { normalizeRequestPath } from '../domain/gateway/normalize.js'
import { evaluatePolicy } from '../domain/gateway/policy.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'policy'

function load(env, path) {
  if (typeof env.loadPolicy !== 'function') throw new BlueError('POLICY_LOADER', '策略加载器未注入')
  return env.loadPolicy(path)
}

export function register(registerTool, env = {}) {
  registerTool(defineTool({
    name: 'blue_policy_validate',
    description: '校验策略文件：JSON、字段、路径前缀、hash。只读，不改策略。',
    parameters: {
      path: { type: 'string', required: true, description: '策略 JSON 路径' },
    },
    execute: safe(async (args) => {
      const loaded = load(env, args.path)
      return {
        ok: true,
        path: loaded.path,
        hash: loaded.hash,
        source: loaded.source,
        policy: loaded.policy,
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_policy_test',
    description: '用策略文件跑一组请求路径，返回 normalize/policy 决策；不启动网关。',
    parameters: {
      path: { type: 'string', required: true, description: '策略 JSON 路径' },
      requests: { type: 'array', items: { type: 'string' }, required: true, description: '请求路径数组' },
    },
    execute: safe(async (args) => {
      const loaded = load(env, args.path)
      const requests = Array.isArray(args.requests) ? args.requests.slice(0, 200) : []
      const results = requests.map((raw) => {
        try {
          const normalized = normalizeRequestPath(raw, loaded.policy)
          const verdict = evaluatePolicy(normalized.canonical, loaded.policy)
          return { raw, ok: true, normalized, verdict }
        } catch (error) {
          return { raw, ok: false, code: error.code || 'NORMALIZE', error: error.message }
        }
      })
      return { ok: true, path: loaded.path, hash: loaded.hash, results }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_policy_diff',
    description: '比较两份策略文件的 hash 与 protected/deny/allow/default 差异；不启动网关。',
    parameters: {
      a: { type: 'string', required: true, description: '旧策略路径' },
      b: { type: 'string', required: true, description: '新策略路径' },
    },
    execute: safe(async (args) => {
      const left = load(env, args.a)
      const right = load(env, args.b)
      const keys = ['protected', 'deny', 'allow', 'default']
      const diff = {}
      for (const key of keys) {
        const before = JSON.stringify(left.policy[key] ?? null)
        const after = JSON.stringify(right.policy[key] ?? null)
        if (before !== after) diff[key] = { before: left.policy[key] ?? null, after: right.policy[key] ?? null }
      }
      return {
        ok: true,
        a: { path: left.path, hash: left.hash },
        b: { path: right.path, hash: right.hash },
        changed: Object.keys(diff).length > 0,
        diff,
      }
    }),
  }))
}
