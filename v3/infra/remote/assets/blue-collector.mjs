#!/usr/bin/env node
/**
 * 蓝队远程日志采集器（放在被防守的服务器上跑）。
 *
 * 只读 tail 访问日志，按行转成 JSON，批量 POST 到 DSH /blue/collect。
 * 不执行日志内容，不读取业务数据。
 *
 * 用法：
 *   node blue-collector.mjs --url http://DSH:端口 --token <token> --engagement ENG-xxx --log /var/log/nginx/access.log
 * token 建议用环境变量 BLUE_COLLECTOR_TOKEN，避免出现在进程列表。
 */
import { closeSync, openSync, readSync, statSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

function argsOf(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    out[key.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
  }
  return out
}

const args = argsOf(process.argv.slice(2))
const url = String(args.url || process.env.BLUE_COLLECTOR_URL || '').replace(/\/+$/, '')
const token = String(args.token || process.env.BLUE_COLLECTOR_TOKEN || '')
const engagement = String(args.engagement || process.env.BLUE_COLLECTOR_ENGAGEMENT || '')
const logPath = String(args.log || process.env.BLUE_COLLECTOR_LOG || '')
const intervalMs = Math.max(Number(args.interval) || 2000, 500)
if (!url || !token || !engagement || !logPath) {
  console.error('缺少参数：--url --token --engagement --log')
  process.exit(2)
}

let position = args['from-start'] === 'true' ? 0 : Math.max(statSync(logPath).size, 0)
let pending = []

function parseLine(line) {
  const text = line.trim()
  if (text === '') return null
  // 先支持 JSONL；不是 JSON 再按 Nginx/Apache combined 解析。
  if (text.startsWith('{')) {
    try {
      const event = JSON.parse(text)
      return event && typeof event === 'object' ? event : null
    } catch { return null }
  }
  const m = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*)" (\d{3}) \S+ "([^"]*)" "([^"]*)"/.exec(text)
  if (!m) return null
  return {
    at: new Date().toISOString(),
    remote: m[1],
    method: m[3],
    path: m[4].split('?')[0],
    raw_path: m[4],
    status: Number(m[5]),
    referer: m[6],
    user_agent: m[7],
    source: 'remote-collector',
  }
}

async function flush() {
  if (pending.length === 0) return
  const batch = pending.splice(0, 200)
  try {
    const response = await fetch(url + '/blue/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ engagement, events: batch }),
    })
    if (!response.ok) {
      pending = batch.concat(pending).slice(-1000)
      console.error('collector POST failed:', response.status)
    }
  } catch (error) {
    pending = batch.concat(pending).slice(-1000)
    console.error('collector POST error:', error.message)
  }
}

async function readOnce() {
  let size
  try { size = statSync(logPath).size } catch { return }
  if (size < position) position = 0
  if (size === position) return
  const fd = openSync(logPath, 'r')
  try {
    const length = Math.min(size - position, 1024 * 1024)
    const buffer = Buffer.alloc(length)
    const read = readSync(fd, buffer, 0, length, position)
    position += read
    for (const line of buffer.subarray(0, read).toString('utf8').split(/\r?\n/)) {
      const event = parseLine(line)
      if (event) pending.push(event)
    }
  } finally {
    closeSync(fd)
  }
  await flush()
}

console.log('collector started:', { url, engagement, logPath, intervalMs })
process.on('SIGINT', async () => { await flush(); process.exit(0) })
while (true) {
  await readOnce()
  await sleep(intervalMs)
}
