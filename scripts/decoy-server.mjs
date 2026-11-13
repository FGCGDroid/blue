#!/usr/bin/env node
/**
 * dsh-blue-team-mode 的可选蜜罐/诱饵 HTTP 服务。
 *
 * 默认只监听 127.0.0.1；公开监听必须显式加 --allow-public。
 * 只返回静态假页面和有界合成数据，不执行 shell、不抓指纹、不做无限响应。
 * 事件只写本地 JSONL，不主动外传。
 */
import { createServer } from 'node:http'
import { appendFileSync, mkdirSync, accessSync, constants as fsConstants } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { BehaviorWindow } from '../lib/hunter.js'

const VERSION = '1.0.0'
const MAX_BODY = 64 * 1024
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 60

function parseArgs(argv) {
  const options = {
    host: '127.0.0.1',
    port: 8080,
    log: '',
    allowPublic: false,
    name: 'decoy-http',
    theme: 'generic',
    help: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--allow-public') options.allowPublic = true
    else if (arg === '--host') options.host = String(argv[++i] || options.host)
    else if (arg === '--port') options.port = Number(argv[++i] || options.port)
    else if (arg === '--log') options.log = String(argv[++i] || options.log)
    else if (arg === '--name') options.name = String(argv[++i] || options.name)
    else if (arg === '--theme') options.theme = String(argv[++i] || options.theme)
    else if (arg === '--version' || arg === '-v') {
      console.log(VERSION)
      process.exit(0)
    } else {
      throw new Error('未知参数：' + arg)
    }
  }
  return options
}

function isLoopback(host) {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost'
}

function ensureLogPath(requested) {
  if (requested) {
    mkdirSync(dirname(requested), { recursive: true })
    return requested
  }
  const preferred = process.env.BLUE_LOG_DIR
    ? join(process.env.BLUE_LOG_DIR, 'decoy-events.jsonl')
    : join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'blue', 'decoy-events.jsonl')
  const fallback = join(process.cwd(), '.blue-decoy', 'decoy-events.jsonl')
  for (const candidate of [preferred, fallback]) {
    try {
      mkdirSync(dirname(candidate), { recursive: true })
      appendFileSync(candidate, '')
      accessSync(dirname(candidate), fsConstants.W_OK)
      return candidate
    } catch { /* 试下一个 */ }
  }
  throw new Error('没有可写的诱饵日志目录；用 --log 或 BLUE_LOG_DIR 指定')
}

function text(res, status, body, type = 'text/plain; charset=utf-8') {
  const data = Buffer.from(body, 'utf8')
  res.writeHead(status, {
    'content-type': type,
    'content-length': data.length,
    'server': 'nginx',
    'x-content-type-options': 'nosniff',
  })
  res.end(data)
}

function fakeAdmin(theme = 'generic') {
  const titles = {
    tomcat: 'Tomcat Manager',
    thinkphp: 'ThinkPHP',
    wordpress: 'WordPress',
    generic: 'Internal Admin',
  }
  const title = titles[theme] || titles.generic
  return `<!doctype html><html><head><title>${title}</title></head><body>`
    + `<h1>${title}</h1><form method="post" action="/admin/login">`
    + '<input name="username" placeholder="username"><input name="password" type="password" placeholder="password">'
    + '<button>Sign in</button></form><p>Build 2026.11</p></body></html>'
}

function fakeGitConfig() {
  return '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n'
    + '[remote "origin"]\n\turl = git@internal.example.invalid:ops/backup.git\n'
    + '[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n'
}

function fakePhpMyAdmin() {
  return '<!doctype html><html><head><title>phpMyAdmin</title></head><body>'
    + '<h1>phpMyAdmin</h1><form method="post"><input name="pma_username"><input name="pma_password" type="password">'
    + '<button>Log in</button></form></body></html>'
}

function syntheticSql() {
  const header = '-- synthetic decoy data; not a real backup\n'
  let body = header
  for (let i = 0; body.length < 48 * 1024; i += 1) {
    body += `INSERT INTO audit_log_${i % 7} VALUES (${i}, '${randomUUID()}', 'synthetic');\n`
  }
  return body
}

function notFound() {
  return '<html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><hr>nginx</body></html>'
}

/** 诱饵日志只保留攻击载荷；不把口令、token、Cookie 等凭据原样写盘。 */
function redactBody(value) {
  return String(value || '').slice(0, 2000)
    .replace(/((?:password|passwd|pwd|token|secret|authorization|cookie|session)[^=:&\s"']*\s*["']?\s*[:=]\s*["']?)([^&\s"']+)/gi, '$1[REDACTED]')
}

const hunter = new BehaviorWindow()
const server = createServer((req, res) => {
  const started = Date.now()
  const remote = req.socket.remoteAddress || ''
  const now = Date.now()
  const url = new URL(req.url || '/', 'http://decoy.invalid')
  const behavior = hunter.observe(remote, url.pathname, String(req.headers['user-agent'] || ''))
  if (rate.size > 5000) {
    for (const [key, value] of rate) {
      if (now - value.start > RATE_WINDOW_MS) rate.delete(key)
    }
  }
  const bucket = rate.get(remote)
  if (bucket === undefined || now - bucket.start > RATE_WINDOW_MS) {
    rate.set(remote, { start: now, count: 1 })
  } else {
    bucket.count += 1
    if (bucket.count > RATE_LIMIT) {
      text(res, 429, 'Too Many Requests')
      record(req, remote, 429, '', started, url, behavior)
      return
    }
  }

  let body = ''
  let tooLarge = false
  req.on('data', (chunk) => {
    if (tooLarge) return
    body += chunk.toString('utf8')
    if (Buffer.byteLength(body) > MAX_BODY) {
      tooLarge = true
      body = body.slice(0, MAX_BODY)
    }
  })
  req.on('end', () => {
    if (tooLarge) {
      text(res, 413, 'Payload Too Large')
      record(req, remote, 413, body, started, url, behavior)
      return
    }
    const path = url.pathname
    if (req.method === 'GET' && (path === '/admin' || path === '/admin/' || path === '/wp-login.php')) {
      text(res, 200, fakeAdmin(options.theme), 'text/html; charset=utf-8')
    } else if (req.method === 'GET' && path === '/.git/config') {
      text(res, 200, fakeGitConfig())
    } else if (req.method === 'GET' && (path === '/phpmyadmin' || path === '/phpmyadmin/')) {
      text(res, 200, fakePhpMyAdmin(), 'text/html; charset=utf-8')
    } else if (req.method === 'GET' && path === '/backup.sql') {
      text(res, 200, syntheticSql(), 'application/sql; charset=utf-8')
    } else if (req.method === 'GET' && path === '/shell.php') {
      // 静态假页面：绝不执行、不解析、不回连。
      text(res, 200, '<?php echo "synthetic decoy"; ?>', 'text/plain; charset=utf-8')
    } else if (req.method === 'GET' && path === '/server-status') {
      text(res, 200, 'Server Status: synthetic decoy')
    } else {
      text(res, 404, notFound(), 'text/html; charset=utf-8')
    }
    record(req, remote, res.statusCode, body, started, url, behavior)
  })
})

const rate = new Map()

function record(req, remote, status, body, started, url = new URL(req.url || '/', 'http://decoy.invalid'), behavior = { tags: [], risk: 'none', count: 0, distinctPaths: 0, reason: '' }) {
  const event = {
    at: new Date().toISOString(),
    decoy: options.name,
    theme: options.theme,
    remote,
    method: req.method,
    path: url.pathname,
    query: redactBody(url.search),
    user_agent: redactBody(String(req.headers['user-agent'] || '').slice(0, 300)),
    referer: redactBody(String(req.headers.referer || '').slice(0, 300)),
    body: redactBody(body),
    status,
    elapsed_ms: Date.now() - started,
    tags: behavior.tags,
    risk: behavior.risk,
    behavior_reason: behavior.reason,
    window_count: behavior.count,
    distinct_paths: behavior.distinctPaths,
  }
  try {
    mkdirSync(dirname(options.log), { recursive: true })
    appendFileSync(options.log, JSON.stringify(event) + '\n')
  } catch (error) {
    console.error('日志写入失败：' + error.message)
  }
}

let options
try {
  options = parseArgs(process.argv.slice(2))
  if (!options.help) options.log = ensureLogPath(options.log)
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

if (options.help) {
  console.log(`dsh-blue-decoy ${VERSION}
用法：node scripts/decoy-server.mjs [选项]
  --host <addr>       监听地址，默认 127.0.0.1
  --port <port>       监听端口，默认 8080
  --log <path>        JSONL 日志路径，默认 $DSH_HOME/blue/decoy-events.jsonl
  --name <name>       诱饵名称
  --theme <theme>     generic/tomcat/thinkphp/wordpress
  --allow-public      允许非 loopback 监听（公开暴露前先评估）
  --help              显示帮助`)
  process.exit(0)
}

if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
  console.error('端口无效')
  process.exit(2)
}
if (!isLoopback(options.host) && !options.allowPublic) {
  console.error('拒绝公开监听：请先确认授权和防火墙，再加 --allow-public')
  process.exit(2)
}

server.listen(options.port, options.host, () => {
  const address = server.address()
  const host = options.host.includes(':') ? `[${options.host}]` : options.host
  console.log(`listening http://${host}:${address.port}`)
  console.log(`log ${options.log}`)
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
