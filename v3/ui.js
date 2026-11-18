/**
 * 3.0 Host API 入口（M5）。
 *
 * 注册 /blue/api 与 /blue/v3/api，供 2.0 控制台和 3.x 前端共用；
 * 浏览器不直接碰 SQLite，所有读写走 blueTeamV3。
 */
import { registerHostApi } from './ui/host-api.js'

export const name = 'blue-ui-v3'

export const inject = ['blueTeamV3', 'webServer']

export function apply(ctx) {
  const store = ctx.blueTeamV3 ?? ctx.get?.('blueTeamV3')
  if (!store) throw new Error('blue-ui-v3: 缺少 blueTeamV3 服务')
  registerHostApi(ctx, store)
  ctx.logger?.info?.('blue-ui-v3: Host API 就绪（/blue/api、/blue/v3/api）')
}

export default { name, inject, apply }
