#!/usr/bin/env node
/**
 * 可选内联 HTTP 网关。
 *
 * 只负责“同一入口检查 + 访问日志 + 转发”，不会改端口、改防火墙。
 * 要让它成为必经路径，上游必须只监听回环/内网，公开入口只开网关。
 */
import { createGateway } from '../lib/gateway.js'

function parseArgs(argv) {
  const options = {
    listenHost: '127.0.0.1',
    listenPort: 0,
    upstream: '',
    guard: 'strict',
    logPath: '',
    allowPublic: false,
    allowPublicUpstream: false,
    maxBody: 1024 * 1024,
    help: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--allow-public') options.allowPublic = true
    else if (arg === '--allow-public-upstream') options.allowPublicUpstream = true
    else if (arg === '--listen') {
      const value = String(argv[++i] || '')
      const index = value.lastIndexOf(':')
      if (index < 0) throw new Error('--listen 需要 host:port')
      options.listenHost = value.slice(0, index) || '127.0.0.1'
      options.listenPort = Number(value.slice(index + 1))
    } else if (arg === '--upstream') options.upstream = String(argv[++i] || '')
    else if (arg === '--guard') options.guard = String(argv[++i] || 'strict')
    else if (arg === '--log') options.logPath = String(argv[++i] || '')
    else if (arg === '--max-body') options.maxBody = Number(argv[++i] || options.maxBody)
    else if (arg === '--version' || arg === '-v') {
      console.log('1.0.0')
      process.exit(0)
    } else throw new Error('未知参数：' + arg)
  }
  return options
}

let options
try {
  options = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (options.help) {
  console.log(`用法:
  node scripts/inline-gateway.mjs --listen 127.0.0.1:63487 --upstream http://127.0.0.1:63488

选项:
  --guard strict|jwt-none|off     默认 strict
  --log <path>                  访问日志
  --allow-public                允许非回环监听
  --allow-public-upstream       允许非回环上游
  --max-body <bytes>            默认 1 MiB
`)
  process.exit(0)
}
if (options.upstream === '') {
  console.error('缺少 --upstream')
  process.exit(2)
}

try {
  const gateway = await createGateway(options)
  console.log(`listening ${gateway.url}`)
  console.log(`upstream ${gateway.upstream}`)
  console.log(`log ${gateway.logPath}`)
  const stop = async () => { await gateway.close(); process.exit(0) }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
