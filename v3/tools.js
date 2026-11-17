/**
 * 3.0 工具入口（骨架）。
 *
 * M4 才会注册工具。现在只把 23 个工具组串起来，并报告计划数量。
 * 工具名统一用 blue_ 前缀，但服务名与 2.0 分开，避免并行加载冲突。
 */
import { TOOL_MODULES } from './tools/index.js'
import { ALL_TOOL_NAMES, EXISTING_TOOL_NAMES, NEW_TOOL_NAMES } from './tools/catalog.js'

export const name = 'blue-tools-v3'

export const inject = ['blueTeamV3', 'tools']

export function apply(ctx) {
  let registered = 0
  const register = (definition) => {
    registered += 1
    ctx.tools.register(definition)
  }
  for (const module of TOOL_MODULES) module.register(register)
  ctx.logger?.info?.(
    'blue-tools-v3: 骨架就绪（%d 组；现有 %d + 新增 %d = 计划 %d；已注册 %d）',
    TOOL_MODULES.length,
    EXISTING_TOOL_NAMES.length,
    NEW_TOOL_NAMES.length,
    ALL_TOOL_NAMES.length,
    registered,
  )
}

export default { name, inject, apply }
