/** 工具组：会话与目标（M4.0）。 */
import { defineTool, safe } from './define.js'
import {
  bindEngagement, bindingViewOf, engagementOf, hostOfTarget, listBindings,
  markSelfChecked, scopeStatus, sessionKeysOf, userSaidSelfCheck,
} from './context.js'
import { assertSelfCheckPhrase, openEngagement, preflightReport } from '../app/session/service.js'
import { ALL_TOOL_NAMES, TOOL_GROUPS } from './catalog.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'session'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_engagement_open',
    description: '建立（或复用）本场防守目标，并把当前会话绑定到它。只影响本会话绑定，不会改动其它会话。',
    parameters: {
      name: { type: 'string', required: true, description: '防守单位/靶标名称' },
      scope: { type: 'array', items: { type: 'string' }, description: '需要防守的域名/IP/CIDR 列表' },
      note: { type: 'string', description: '补充说明' },
    },
    execute: safe(async (args, exec) => {
      if (typeof args.name !== 'string' || args.name.trim() === '') {
        throw new BlueError('ENGAGEMENT_INPUT', 'name 不能为空')
      }
      const result = openEngagement(store, args)
      const keys = bindEngagement(exec, result.engagement.id)
      return {
        ok: true,
        ...result,
        session: bindingViewOf(exec, store),
        bound_keys: keys,
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_session_info',
    description: '查看当前会话绑定的是哪个防守目标、父会话链与是否子智能体；多会话并行时先跑它确认没有串到别的目标。',
    parameters: {},
    execute: safe(async (_args, exec) => {
      const mode = env.ctx?.get?.('blueTeamModeV3') ?? null
      return {
        ok: true,
        session: bindingViewOf(exec, store),
        dsh: mode === null ? null : {
          version: mode.version,
          package_version: mode.package_version,
          skeleton: mode.skeleton,
        },
        engagements: store.engagements.list().map((item) => ({
          id: item.id,
          name: item.name,
          status: item.status,
          stats: store.engagements.stats(item.id),
        })),
        bindings: listBindings(),
        keys: sessionKeysOf(exec),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_scope_check',
    description: '检查一个 IP/域名/URL 是否在已声明的防守范围内。范围为空返回 unscoped（不阻断，但提示补范围）；不在范围内返回 out。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      target: { type: 'string', required: true, description: 'IP / 域名 / URL' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const target = String(args.target ?? '').trim()
      if (target === '') throw new BlueError('SCOPE_TARGET', 'target 不能为空')
      const host = hostOfTarget(target)
      const check = scopeStatus(host, engagement.scope)
      return {
        ok: check.status === 'in' || check.status === 'unscoped',
        engagement: { id: engagement.id, name: engagement.name, scope: engagement.scope },
        target,
        host,
        ...check,
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_preflight',
    description: '【自检组成】检查 3.0 数据层、schema、工具注册数量等本机环境；不假装真实安全工具可用。',
    parameters: {},
    execute: safe(async () => ({
      ok: true,
      ...preflightReport(store, {
        planned: ALL_TOOL_NAMES.length,
        registered: env.registeredNames?.length ?? 0,
      }),
    })),
  }))

  registerTool(defineTool({
    name: 'blue_defense_selfcheck',
    description: '【开局门禁】用户必须先明确说「防御自检」，才可调用本工具完成本会话初始化；成功后其它 blue_* 工具才放行。',
    parameters: {
      phrase: { type: 'string', required: true, description: '必须原样填写用户说的：防御自检' },
    },
    execute: safe(async (args, exec) => {
      assertSelfCheckPhrase(args.phrase)
      if (!userSaidSelfCheck(exec)) {
        throw new BlueError('SELF_CHECK_USER', '用户尚未在会话中明确说「防御自检」；不能由模型自行放行')
      }
      markSelfChecked(exec)
      return {
        ok: true,
        phrase: '防御自检',
        checked_at: new Date().toISOString(),
        preflight: preflightReport(store, {
          planned: ALL_TOOL_NAMES.length,
          registered: env.registeredNames?.length ?? 0,
        }),
        next: '自检已放行。现在可以 blue_engagement_open / blue_asset_add / blue_alert_ingest。',
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_tool_catalog',
    description: '列出 3.0 计划工具组与已注册工具数量，用于确认 M4 迁移进度。',
    parameters: {},
    execute: safe(async () => ({
      ok: true,
      planned: ALL_TOOL_NAMES.length,
      registered: env.registeredNames?.length ?? 0,
      groups: Object.fromEntries(Object.entries(TOOL_GROUPS).map(([name, tools]) => [name, tools.length])),
      registered_names: env.registeredNames ?? [],
    })),
  }))
}
