/**
 * 3.0 Host API 入口（M5）。
 *
 * 注册 /blue/api 与 /blue/v3/api，供 2.0 控制台和 3.x 前端共用；
 * 浏览器不直接碰 SQLite，所有读写走 blueTeamV3。
 */
import { registerHostApi } from './ui/host-api.js'
import { registerProtectPage } from './ui/protect-page.js'

export const name = 'blue-ui-v3'

export const inject = ['blueTeamV3', 'webServer']

export function apply(ctx) {
  const store = ctx.blueTeamV3 ?? ctx.get?.('blueTeamV3')
  if (!store) throw new Error('blue-ui-v3: 缺少 blueTeamV3 服务')
  registerHostApi(ctx, store)
  try {
    registerProtectPage(ctx)
  } catch (error) {
    // 热安装时旧进程可能已注册同一路由；重启后会重新注册，不阻断 Host API。
    if (!String(error?.message || error).includes('duplicate exact route')) throw error
    ctx.logger?.warn?.('blue-ui-v3: /blue/protect 已存在，保留旧路由；重启后生效')
  }
  ctx.logger?.info?.('blue-ui-v3: Host API 就绪（/blue/api、/blue/v3/api、/blue/protect）')
}

export default { name, inject, apply }
