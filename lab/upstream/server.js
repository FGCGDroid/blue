#!/usr/bin/env node
/**
 * 本地靶场上游（零依赖）。
 *
 * 只用于自己的机器/隔离环境；全部合成数据。
 * 受保护路径故意返回 200，用来证明网关真的阻断了，而不是上游自己 403。
 */
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export async function startUpstream(options = {}) {
  const host = options.host || '127.0.0.1'
  const port = options.port === undefined ? 18080 : Number(options.port)
  const hits = {
    public: 0,
    publicX: 0,
    admin: 0,
    login: 0,
    canary: 0,
    jwtNone: 0,
    echo: 0,
    lastUrl: '',
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://upstream.test')
    hits.lastUrl = req.url
    res.setHeader('x-upstream-path', req.url)
    res.setHeader('content-type', 'application/json; charset=utf-8')

    if (url.pathname === '/health') {
      res.end(JSON.stringify({ ok: true, hits }))
      return
    }

    if (url.pathname === '/public') {
      hits.public += 1
      res.end(JSON.stringify({ ok: true, path: '/public' }))
      return
    }

    if (url.pathname === '/public/x') {
      hits.publicX += 1
      res.end(JSON.stringify({ ok: true, path: '/public/x', query: url.search }))
      return
    }

    if (url.pathname === '/public/echo') {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => {
        hits.echo += 1
        res.end(JSON.stringify({ ok: true, body: Buffer.concat(chunks).toString('utf8') }))
      })
      return
    }

    if (url.pathname === '/admin') {
      hits.admin += 1
      res.end(JSON.stringify({ ok: true, path: '/admin' }))
      return
    }

    if (url.pathname === '/admin/login') {
      hits.login += 1
      res.end(JSON.stringify({ ok: true, path: '/admin/login' }))
      return
    }

    if (url.pathname === '/admin/canary') {
      hits.canary += 1
      res.end(JSON.stringify({ ok: true, path: '/admin/canary' }))
      return
    }

    if (url.pathname === '/jwt-none') {
      hits.jwtNone += 1
      res.end(JSON.stringify({ ok: true, path: '/jwt-none' }))
      return
    }

    res.statusCode = 404
    res.end(JSON.stringify({ ok: false, error: 'not found' }))
  })

  await new Promise((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.off('error', reject)
      resolvePromise()
    })
  })
  const address = server.address()
  const actualPort = address && typeof address === 'object' ? address.port : port

  return {
    server,
    host,
    port: actualPort,
    url: `http://${host}:${actualPort}`,
    hits,
    async close() {
      server.closeAllConnections?.()
      await new Promise((resolvePromise) => server.close(resolvePromise))
    },
  }
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false

if (isMain) {
  const args = process.argv.slice(2)
  const portIndex = args.indexOf('--port')
  const port = portIndex >= 0 && args[portIndex + 1] ? Number(args[portIndex + 1]) : 18080
  startUpstream({ port })
    .then((upstream) => {
      console.log(JSON.stringify({ ok: true, url: upstream.url }))
      const shutdown = async () => {
        await upstream.close()
        process.exitCode = 0
      }
      process.once('SIGINT', shutdown)
      process.once('SIGTERM', shutdown)
    })
    .catch((error) => {
      console.error(error && error.stack ? error.stack : error)
      process.exitCode = 1
    })
}
