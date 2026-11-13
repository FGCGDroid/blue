#!/usr/bin/env node
/**
 * dsh-blue-team-mode 的可选蜜罐/诱饵 HTTP 服务。
 *
 * 默认只监听 127.0.0.1；公开监听必须显式加 --allow-public。
 * 只返回静态假页面和有界合成数据，不执行 shell、不抓指纹、不做无限响应。
 * 事件只写本地 JSONL，不主动外传。
 */
import { createServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { appendFileSync, mkdirSync, accessSync, readFileSync, constants as fsConstants } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
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
    lures: 'admin,git,phpmyadmin,backup,shell,status',
    token: '',
    tlsCert: '',
    tlsKey: '',
    robotsDisallow: '/admin/',
    protect: '/backup/flag.txt',
    fakeFlag: '',
    tarpitMin: 0,
    tarpitMax: 0,
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
    else if (arg === '--lures') options.lures = String(argv[++i] || options.lures)
    else if (arg === '--token') options.token = String(argv[++i] || options.token)
    else if (arg === '--robots-disallow') options.robotsDisallow = String(argv[++i] || options.robotsDisallow)
    else if (arg === '--protect') options.protect = String(argv[++i] || options.protect)
    else if (arg === '--fake-flag') options.fakeFlag = String(argv[++i] || options.fakeFlag)
    else if (arg === '--tarpit-min') options.tarpitMin = Number(argv[++i] || 0)
    else if (arg === '--tarpit-max') options.tarpitMax = Number(argv[++i] || 0)
    else if (arg === '--tls-cert') options.tlsCert = String(argv[++i] || '')
    else if (arg === '--tls-key') options.tlsKey = String(argv[++i] || '')
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

/** 解码两次并折叠 . / .. / 反斜杠，避免把编码变体漏给诱饵表。 */
function normalizePath(raw) {
  let value = String(raw || '/').split('?')[0]
  for (let i = 0; i < 2; i += 1) {
    try { value = decodeURIComponent(value) } catch { return null }
  }
  value = value.replace(/\\/g, '/')
  const parts = []
  for (const part of value.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') { parts.pop(); continue }
    parts.push(part)
  }
  return '/' + parts.join('/')
}

function listOf(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

const THEMES = {
  generic: {
    server: 'nginx/1.24.0 (Ubuntu)',
    powered: '',
    title: 'Operations Console',
    notFound: '<html><head><title>404 Not Found</title></head><body><center><h1>404 Not Found</h1></center><hr><center>nginx/1.24.0 (Ubuntu)</center></body></html>',
  },
  tomcat: {
    server: 'Apache-Coyote/1.1',
    powered: '',
    title: 'Tomcat Manager',
    notFound: '<html><head><title>Apache Tomcat/9.0.85 - Error report</title></head><body><h1>HTTP Status 404 - Not Found</h1><hr><p><b>Type</b> Status Report</p><p><b>Description</b> The requested resource is not available.</p><hr><h3>Apache Tomcat/9.0.85</h3></body></html>',
  },
  thinkphp: {
    server: 'nginx/1.24.0 (Ubuntu)',
    powered: 'PHP/8.1.27',
    title: 'ThinkPHP',
    notFound: '<html><head><title>404</title></head><body><h1>404 Not Found</h1><p>The requested URL was not found on this server.</p></body></html>',
  },
  wordpress: {
    server: 'nginx/1.24.0 (Ubuntu)',
    powered: 'PHP/8.1.27',
    title: 'WordPress',
    notFound: '<html><head><title>Page not found &#8211; Site</title></head><body><h1>Nothing Found</h1><p>It looks like nothing was found at this location.</p></body></html>',
  },
}

function profileOf(theme = options.theme) {
  return THEMES[theme] || THEMES.generic
}

function lureEnabled(name) {
  return String(options.lures || '').split(',').map((item) => item.trim()).includes(name)
}

function canary() {
  return options.token
}

function buildId() {
  return randomUUID().slice(0, 8)
}

function cookieOf(theme = options.theme) {
  const id = randomUUID().replace(/-/g, '').slice(0, 26)
  if (theme === 'tomcat') return `JSESSIONID=${id}; Path=/; HttpOnly`
  if (theme === 'wordpress') return `wordpress_test_cookie=WP Cookie check; Path=/`
  if (theme === 'thinkphp') return `PHPSESSID=${id}; Path=/; HttpOnly`
  return `session=${id}; Path=/; HttpOnly`
}

function text(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  const data = Buffer.from(body, 'utf8')
  const profile = profileOf()
  const headers = {
    'content-type': type,
    'content-length': data.length,
    'server': profile.server,
    'x-content-type-options': 'nosniff',
    'etag': '"' + createHash('sha1').update(data).digest('hex').slice(0, 16) + '"',
    'last-modified': new Date(Date.UTC(2026, 9, 1, 8, 0, 0)).toUTCString(),
    'cache-control': status === 200 ? 'no-cache' : 'no-store',
  }
  if (profile.powered !== '') headers['x-powered-by'] = profile.powered
  if (extra.cookie) headers['set-cookie'] = extra.cookie
  if (extra.allow) headers.allow = extra.allow
  if (extra.location) headers.location = extra.location
  res.writeHead(status, headers)
  res.end(data)
}

function fakeAdmin(theme = 'generic') {
  const profile = profileOf(theme)
  const title = profile.title
  if (theme === 'wordpress') {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title} &lsaquo; Site &#8212; WordPress</title>`
      + '<link rel="stylesheet" href="/wp-admin/css/login.min.css"></head><body class="login">'
      + '<div id="login"><h1><a href="/">Site</a></h1><form name="loginform" action="/wp-login.php" method="post">'
      + '<p><label>Username or Email Address</label><input name="log" id="user_login" type="text"></p>'
      + '<p><label>Password</label><input name="pwd" id="user_pass" type="password"></p>'
      + '<p class="submit"><input name="wp-submit" id="wp-submit" type="submit" value="Log In"></p></form></div></body></html>'
  }
  if (theme === 'thinkphp') {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>`
      + '<link rel="stylesheet" href="/static/css/app.css"></head><body><div class="login">'
      + '<h1>ThinkPHP</h1><form method="post" action="/admin/login">'
      + '<input name="username" placeholder="用户名"><input name="password" type="password" placeholder="密码">'
      + '<button type="submit">登录</button></form><p class="version">V8.0</p></div></body></html>'
  }
  if (theme === 'tomcat') {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>`
      + '<link rel="stylesheet" href="/manager/css/manager.css"></head><body>'
      + `<h1>${title}</h1><form method="post" action="/manager/html">`
      + '<input name="j_username" placeholder="Username"><input name="j_password" type="password" placeholder="Password">'
      + '<button>Login</button></form><p>Apache Tomcat/9.0.85</p></body></html>'
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>`
    + '<link rel="stylesheet" href="/assets/app.css"></head><body>'
    + `<h1>${title}</h1><form method="post" action="/admin/login">`
    + '<input name="username" placeholder="Username"><input name="password" type="password" placeholder="Password">'
    + '<button>Sign in</button></form><p>Operations Console</p></body></html>'
}

function fakeDashboard(theme = 'generic') {
  const title = profileOf(theme).title
  const rows = ['api', 'worker', 'scheduler', 'cache'].sort(() => Math.random() - 0.5).slice(0, 3)
    .map((name) => `<tr><td>${name}</td><td>healthy</td></tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} - Dashboard</title></head><body>`
    + `<h1>${title}</h1><p>Signed in as operator</p><table><tr><th>Service</th><th>Status</th></tr>${rows}</table>`
    + '<p><a href="/">Home</a></p></body></html>'
}

function isAuthed(req) {
  const cookie = String(req.headers.cookie || '')
  return /(?:JSESSIONID|PHPSESSID|wordpress_logged_in|session)=/i.test(cookie)
}

function fakeHome(theme = 'generic') {
  const title = profileOf(theme).title
  const build = buildId()
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>`
    + `<h1>${title}</h1><p>Service is running. Build ${build}</p><p><a href="/admin">Sign in</a></p></body></html>`
}

function fakeGitConfig() {
  return '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n'
    + `[remote "origin"]\n\turl = git@git.internal:platform/ops-tooling-${canary()}.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`
    + '[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n'
}

function fakePhpMyAdmin() {
  return '<!doctype html><html><head><title>phpMyAdmin</title></head><body>'
    + '<h1>phpMyAdmin</h1><form method="post"><input name="pma_username"><input name="pma_password" type="password">'
    + '<button>Log in</button></form><p>phpMyAdmin 5.2.1</p></body></html>'
}

function fakeBackupIndex() {
  return '<!doctype html><html><head><title>Index of /backup</title></head><body><h1>Index of /backup</h1><hr><pre>'
    + '<a href="config.json">config.json</a>  2026-11-01 08:12  1.2K\n'
    + '<a href="backup.sql">backup.sql</a>  2026-11-01 08:14  48K\n'
    + '</pre><hr></body></html>'
}

function syntheticSql() {
  let body = '-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)\n--\n-- Host: localhost    Database: ops\n-- ------------------------------------------------------\n'
  body += 'CREATE TABLE `audit_log` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `actor` varchar(64) DEFAULT NULL,\n  `action` varchar(64) DEFAULT NULL,\n  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n'
  for (let i = 0; body.length < 48 * 1024; i += 1) {
    body += `INSERT INTO \`audit_log\` VALUES (${i + 1},'svc-${canary()}-${randomUUID().slice(0, 8)}','deploy',NOW());\n`
  }
  return body
}

function notFound() {
  return profileOf().notFound
}

function transparentPng() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=', 'base64')
}

const STATIC_CSS = {
  '/assets/app.css': 'body{font:14px system-ui;background:#f7f8fa;color:#20242c}form{max-width:320px;margin:80px auto}input{display:block;width:100%;margin:8px 0;padding:8px}',
  '/static/css/app.css': 'body{font:14px Arial;background:#fff;color:#333}.login{max-width:340px;margin:80px auto}.version{color:#999}',
  '/manager/css/manager.css': 'body{font:13px Arial;background:#fff}form{margin:40px}h1{font-size:20px}',
  '/wp-admin/css/login.min.css': 'body{background:#f0f0f1;font:13px sans-serif}#login{width:320px;margin:8% auto;padding:26px;background:#fff;border:1px solid #c3c4c7}',
}

/** 诱饵日志只保留攻击载荷；不把口令、token、Cookie 等凭据原样写盘。 */
function redactBody(value) {
  return String(value || '').slice(0, 2000)
    .replace(/((?:password|passwd|pwd|token|secret|authorization|cookie|session)[^=:&\s"']*\s*["']?\s*[:=]\s*["']?)([^&\s"']+)/gi, '$1[REDACTED]')
}

const hunter = new BehaviorWindow()
const handler = (req, res) => {
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
  req.on('end', async () => {
    if (tooLarge) {
      text(res, 413, 'Payload Too Large')
      record(req, remote, 413, body, started, url, behavior)
      return
    }
    const path = normalizePath(url.pathname)
    if (path === null) {
      text(res, 400, 'Bad Request')
      record(req, remote, 400, body, started, url, behavior)
      return
    }
    if (options.tarpitMax > 0) {
      const min = Math.min(options.tarpitMin, options.tarpitMax)
      const max = Math.max(options.tarpitMin, options.tarpitMax)
      await sleep(min + Math.floor(Math.random() * (max - min + 1)))
    }
    if (listOf(options.protect).includes(path)) {
      text(res, 403, 'Forbidden')
      record(req, remote, 403, body, started, url, behavior)
      return
    }
    if (req.method === 'OPTIONS') {
      text(res, 204, '', 'text/plain', { allow: 'GET, HEAD, POST, OPTIONS' })
    } else if (req.method === 'GET' && path === '/favicon.ico') {
      const data = transparentPng()
      res.writeHead(200, {
        'content-type': 'image/png',
        'content-length': data.length,
        'server': profileOf().server,
        'cache-control': 'public, max-age=86400',
      })
      res.end(data)
    } else if (req.method === 'GET' && path === '/robots.txt') {
      text(res, 200, `User-agent: *\nDisallow: ${options.robotsDisallow}\n`)
    } else if (req.method === 'GET' && Object.prototype.hasOwnProperty.call(STATIC_CSS, path)) {
      text(res, 200, STATIC_CSS[path], 'text/css; charset=utf-8', { cookie: cookieOf() })
    } else if (req.method === 'GET' && (path === '/' || path === '/index.php' || path === '/index.html')) {
      text(res, 200, fakeHome(), 'text/html; charset=utf-8', { cookie: cookieOf() })
    } else if (req.method === 'GET' && (path === '/flag' || path === '/flag.txt')) {
      text(res, 200, options.fakeFlag, 'text/plain; charset=utf-8')
    } else if (req.method === 'POST' && lureEnabled('admin') && (path === '/admin/login' || path === '/admin' || path === '/manager/html' || path === '/wp-login.php')) {
      text(res, 302, '', 'text/plain', { cookie: cookieOf(), location: '/admin' })
    } else if (req.method === 'GET' && lureEnabled('admin') && (path === '/admin' || path === '/admin/' || path === '/admin/login' || path === '/wp-login.php' || path === '/manager/html')) {
      text(res, 200, isAuthed(req) ? fakeDashboard(options.theme) : fakeAdmin(options.theme), 'text/html; charset=utf-8', { cookie: cookieOf() })
    } else if (req.method === 'GET' && lureEnabled('git') && path === '/.git/config') {
      text(res, 200, fakeGitConfig())
    } else if (req.method === 'GET' && lureEnabled('phpmyadmin') && (path === '/phpmyadmin' || path === '/phpmyadmin/')) {
      text(res, 200, fakePhpMyAdmin(), 'text/html; charset=utf-8')
    } else if (req.method === 'GET' && lureEnabled('backup') && (path === '/backup' || path === '/backup/')) {
      text(res, 200, fakeBackupIndex(), 'text/html; charset=utf-8')
    } else if (req.method === 'GET' && lureEnabled('backup') && path === '/backup.sql') {
      text(res, 200, syntheticSql(), 'application/sql; charset=utf-8')
    } else if (req.method === 'GET' && lureEnabled('shell') && path === '/shell.php') {
      // 静态假页面：绝不执行、不解析、不回连。
      text(res, 200, '<?php\n// maintenance endpoint\necho "ok";\n', 'text/plain; charset=utf-8')
    } else if (req.method === 'GET' && lureEnabled('status') && path === '/server-status') {
      text(res, 200, `Server Status\n\nServer Version: ${profileOf().server}\nUptime: 12 days\n`)
    } else {
      text(res, req.method === 'GET' || req.method === 'HEAD' ? 404 : 405, notFound(), 'text/html; charset=utf-8', req.method === 'GET' ? {} : { allow: 'GET, HEAD, POST, OPTIONS' })
    }
    record(req, remote, res.statusCode, body, started, url, behavior)
  })
}

const rate = new Map()

function record(req, remote, status, body, started, url = new URL(req.url || '/', 'http://decoy.invalid'), behavior = { tags: [], risk: 'none', count: 0, distinctPaths: 0, reason: '' }) {
  const event = {
    at: new Date().toISOString(),
    decoy: options.name,
    canary: options.token,
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
  if (!options.help) {
    options.log = ensureLogPath(options.log)
    if (options.token === '') options.token = randomUUID().replace(/-/g, '').slice(0, 16)
    if (options.fakeFlag === '') options.fakeFlag = `flag{decoy_${randomUUID().replace(/-/g, '').slice(0, 12)}_not_real}`
  }
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
  --lures <list>      admin,git,phpmyadmin,backup,shell,status 的逗号子集
  --token <token>     诱饵金丝雀标识，默认随机生成
  --robots-disallow <path> robots.txt 里返回的死线索，默认 /admin/
  --protect <paths>   永远 403 的真资产路径，逗号分隔，默认 /backup/flag.txt
  --fake-flag <value> /flag 返回的假 flag，默认随机格式合法值
  --tarpit-min <ms>   诱饵最小延迟，默认 0
  --tarpit-max <ms>   诱饵最大延迟，默认 0
  --tls-cert <path>   PEM 证书链；与 --tls-key 一起启用 HTTPS
  --tls-key <path>    PEM 私钥
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
if ((options.tlsCert === '') !== (options.tlsKey === '')) {
  console.error('--tls-cert 和 --tls-key 必须同时提供')
  process.exit(2)
}
if (!Number.isFinite(options.tarpitMin) || !Number.isFinite(options.tarpitMax) || options.tarpitMin < 0 || options.tarpitMax < 0) {
  console.error('--tarpit-min/--tarpit-max 必须是非负数')
  process.exit(2)
}
if (listOf(options.protect).includes('/flag') || listOf(options.protect).includes('/flag.txt')) {
  console.error('--protect 不能包含假 flag 路径 /flag 或 /flag.txt')
  process.exit(2)
}

let server
try {
  server = options.tlsCert !== ''
    ? createHttpsServer({ cert: readFileSync(options.tlsCert), key: readFileSync(options.tlsKey) }, handler)
    : createServer(handler)
} catch (error) {
  console.error('创建服务失败：' + error.message)
  process.exit(2)
}

server.listen(options.port, options.host, () => {
  const address = server.address()
  const host = options.host.includes(':') ? `[${options.host}]` : options.host
  console.log(`listening ${options.tlsCert ? 'https' : 'http'}://${host}:${address.port}`)
  console.log(`log ${options.log}`)
  console.log(`lures ${options.lures}`)
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
