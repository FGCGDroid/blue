/**
 * 控制台样式热更新（M5）。
 *
 * 样式放在独立的 console.css，由服务端按文件 mtime/size 发版本号；
 * 客户端拿到新版本只换 <link> 的 query，不整页刷新。
 */
import { readFileSync, statSync } from 'node:fs'

const CSS_PATH = new URL('./console.css', import.meta.url)

export function consoleCssHash() {
  try {
    const stat = statSync(CSS_PATH)
    return `${Math.trunc(stat.mtimeMs)}-${stat.size}`
  } catch {
    return '0'
  }
}

export function registerConsoleCss(ctx) {
  return ctx.webServer.register({
    kind: 'exact',
    path: '/blue/console.css',
    handler(req, res) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' })
        res.end('GET/HEAD only')
        return
      }
      let body
      try {
        body = readFileSync(CSS_PATH)
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('not found')
        return
      }
      res.writeHead(200, {
        'content-type': 'text/css; charset=utf-8',
        'content-length': body.length,
        'cache-control': 'no-cache',
        'x-content-type-options': 'nosniff',
        etag: '"' + consoleCssHash() + '"',
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      res.end(body)
    },
  })
}
