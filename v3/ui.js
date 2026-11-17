/**
 * 3.0 Host API 入口（骨架）。
 *
 * M4 接 2.0 控制台兼容层，M5 接 3.1 新 UI。
 * 现在不注册路由，避免和 2.0 的 /blue/api 抢路径。
 */
export const name = 'blue-ui-v3'

export const inject = ['blueTeamV3', 'webServer']

export function apply(ctx) {
  ctx.logger?.info?.('blue-ui-v3: 骨架就绪（0 条路由）')
}

export default { name, inject, apply }
