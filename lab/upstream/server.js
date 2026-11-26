#!/usr/bin/env node
/**
 * 本地练手靶场上游（零依赖，仅回环）。
 * 所有“漏洞”都是合成响应：不执行命令、不读真实文件、不写磁盘。
 */
import http from 'node:http'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolveBody) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size <= maxBytes) chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
  })
}

function fakeFlag() {
  return 'flag{lab_synthetic_not_real}'
}

export async function startUpstream(options = {}) {
  const host = options.host || '127.0.0.1'
  const port = options.port === undefined ? 18080 : Number(options.port)
  const logPath = options.logPath || ''
  if (logPath !== '') mkdirSync(dirname(resolve(logPath)), { recursive: true })

  const hits = {
    public: 0,
    publicX: 0,
    admin: 0,
    login: 0,
    loginFail: 0,
    loginSqli: 0,
    download: 0,
    traversal: 0,
    ping: 0,
    pingInjection: 0,
    upload: 0,
    canary: 0,
    jwtNone: 0,
    echo: 0,
    lastUrl: '',
  }

  const writeLog = (req, res, started) => {
    if (logPath === '') return
    try {
      appendFileSync(logPath, JSON.stringify({
        at: new Date().toISOString(),
        method: req.method,
        path: req.url,
        status: res.statusCode,
        remote: req.socket?.remoteAddress || '',
        user_agent: String(req.headers['user-agent'] || ''),
        duration_ms: Date.now() - started,
      }) + '\n')
    } catch { /* 日志失败不影响靶场 */ }
  }

  const send = (res, status, body, contentType = 'application/json; charset=utf-8') => {
    res.statusCode = status
    res.setHeader('content-type', contentType)
    res.setHeader('x-content-type-options', 'nosniff')
    res.end(body)
  }
  const json = (res, status, value) => send(res, status, JSON.stringify(value))

  const server = http.createServer(async (req, res) => {
    const started = Date.now()
    res.on('finish', () => writeLog(req, res, started))
    const url = new URL(req.url, 'http://upstream.test')
    hits.lastUrl = req.url
    res.setHeader('x-upstream-path', req.url)

    if (url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'blue-local-range', hits })
    }

    if (url.pathname === '/public') {
      hits.public += 1
      return json(res, 200, { ok: true, path: '/public' })
    }

    if (url.pathname === '/public/x') {
      hits.publicX += 1
      return json(res, 200, { ok: true, path: '/public/x', query: url.search })
    }

    if (url.pathname === '/public/echo') {
      const body = await readBody(req)
      hits.echo += 1
      return json(res, 200, { ok: true, body })
    }

    if (url.pathname === '/admin') {
      hits.admin += 1
      return json(res, 200, { ok: true, path: '/admin', note: '合成后台，故意无鉴权供路径策略测试' })
    }

    if (url.pathname === '/admin/login') {
      hits.login += 1
      return json(res, 200, { ok: true, path: '/admin/login' })
    }

    if (url.pathname === '/admin/canary') {
      hits.canary += 1
      return json(res, 200, { ok: true, path: '/admin/canary' })
    }

    if (url.pathname === '/jwt-none') {
      hits.jwtNone += 1
      return json(res, 200, { ok: true, path: '/jwt-none', note: '合成 alg=none 入口' })
    }

    if (url.pathname === '/login') {
      if (req.method === 'GET') {
        return send(res, 200, '<!doctype html><title>Lab Login</title><form method="post" action="/login"><input name="username"><input name="password" type="password"><button>Login</button></form>', 'text/html; charset=utf-8')
      }
      const body = await readBody(req)
      const form = new URLSearchParams(body)
      const username = form.get('username') || ''
      const password = form.get('password') || ''
      if (/'\s*(or|OR)\s*'?\d|--/.test(username)) {
        hits.loginSqli += 1
        return json(res, 200, { ok: true, user: 'admin', role: 'admin', note: '合成 SQLi 成功，仅作检测样本' })
      }
      if (username === 'admin' && password === 'admin123') {
        hits.login += 1
        return json(res, 200, { ok: true, user: 'admin', role: 'admin' })
      }
      hits.loginFail += 1
      return json(res, 401, { ok: false, error: 'invalid credentials' })
    }

    if (url.pathname === '/download') {
      hits.download += 1
      const file = url.searchParams.get('file') || 'readme.txt'
      if (file.includes('..') || file.includes('\\')) {
        hits.traversal += 1
        return send(res, 200, `synthetic traversal: ${fakeFlag()}\n`, 'text/plain; charset=utf-8')
      }
      return send(res, 200, `BlueLab synthetic file area: ${file}\n`, 'text/plain; charset=utf-8')
    }

    if (url.pathname === '/ping') {
      hits.ping += 1
      const target = url.searchParams.get('host') || '127.0.0.1'
      if (/[&;|`$]/.test(target)) {
        hits.pingInjection += 1
        return json(res, 200, { ok: true, host: target, output: 'uid=0(root) gid=0(root) synthetic', note: '合成命令注入，未执行' })
      }
      return json(res, 200, { ok: true, host: target, output: `PING ${target} synthetic ok` })
    }

    if (url.pathname === '/upload') {
      hits.upload += 1
      const body = await readBody(req)
      const name = /filename="([^"]+)"/.exec(body)?.[1] || url.searchParams.get('name') || 'shell.php'
      return json(res, 200, { ok: true, uploaded: name, path: `/uploads/${name}`, note: '合成上传，不落盘' })
    }

    return json(res, 404, { ok: false, error: 'not found' })
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
    logPath,
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
  const logIndex = args.indexOf('--log')
  const logPath = logIndex >= 0 && args[logIndex + 1] ? args[logIndex + 1] : ''
  startUpstream({ port, logPath })
    .then((upstream) => {
      console.log(JSON.stringify({ ok: true, url: upstream.url, log: upstream.logPath || null }))
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
