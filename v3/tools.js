/**
 * 3.0 工具入口（骨架）。
 *
 * M4 才会注册工具。现在只验证 Cordis 挂载与依赖方向。
 * 工具名统一用 blue_ 前缀，但服务名与 2.0 分开，避免并行加载冲突。
 */
export const name = 'blue-tools-v3'

export const inject = ['blueTeamV3', 'tools']

export function apply(ctx) {
  ctx.logger?.info?.('blue-tools-v3: 骨架就绪（0 个工具）')
}

export default { name, inject, apply }
