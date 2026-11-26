/** 工具组：网关状态（M4.5）。 */
import { defineTool, safe } from './define.js'
import { BlueError } from '../domain/shared/errors.js'
import { BUILTIN_DENY } from '../domain/gateway/policy.js'
import { techniqueCoverage } from '../domain/gateway/techniques.js'

export const group = 'gateway'

export function register(registerTool, env = {}) {
  registerTool(defineTool({
    name: 'blue_gateway_status',
    description: '查看 3.0 网关配置、策略 hash、默认拦截清单和常见打法覆盖；不启动/停止网关，不探测上游。',
    parameters: {
      policy_path: { type: 'string', description: '（可选）覆盖策略路径' },
    },
    execute: safe(async (args) => {
      const config = env.gatewayConfig || null
      if (config === null) throw new BlueError('GATEWAY_CONFIG', '网关配置未注入')
      if (typeof env.loadPolicy !== 'function') throw new BlueError('POLICY_LOADER', '策略加载器未注入')
      const loaded = env.loadPolicy(args.policy_path || config.policyPath)
      const coverage = techniqueCoverage()
      return {
        ok: true,
        mode: config.mode,
        host: config.host,
        port: config.port,
        upstream: config.upstream,
        policy: { path: loaded.path, hash: loaded.hash, source: loaded.source },
        builtin_deny: BUILTIN_DENY.map((rule) => rule.prefix),
        techniques: {
          total: coverage.total,
          blocked: coverage.blocked,
          reduced: coverage.reduced,
          detected: coverage.detected,
          owner: coverage.owner,
          not_applicable: coverage.not_applicable,
          blocked_ids: coverage.techniques.filter((item) => item.handling === 'block').map((item) => item.id),
          owner_items: coverage.techniques.filter((item) => item.handling === 'owner').map((item) => ({ id: item.id, name: item.name })),
        },
        note: '只读配置；运行中的网关 /metrics /healthz 需独立进程探测。',
      }
    }),
  }))
}
