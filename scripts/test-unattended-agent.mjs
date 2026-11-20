#!/usr/bin/env node
/** 无人值守 agent 的 dry-run 测试：不碰 nftables，只验证识别和回传。 */
import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const root = mkdtempSync(join(tmpdir(), 'blue-agent-test-'))
const log = join(root, 'access.log')
writeFileSync(log, '203.0.113.5 - - [20/Nov/2026:10:00:00 +0800] "GET /.env HTTP/1.1" 200 12 "-" "sqlmap/1.8"\n', 'utf8')

let received = []
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    try { received = received.concat(JSON.parse(body).events || []) } catch { /* ignore */ }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"ok":true}')
  })
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port

const child = spawn(process.execPath, [
  'lab/blue-agent.mjs',
  '--url', `http://127.0.0.1:${port}`,
  '--token', 'test-token',
  '--engagement', 'ENG-TEST',
  '--log', log,
  '--from-start',
], { stdio: ['ignore', 'ignore', 'pipe'] })
let stderr = ''
child.stderr.on('data', (chunk) => { stderr += String(chunk) })

await new Promise((resolve) => setTimeout(resolve, 2500))
child.kill()
await new Promise((resolve) => child.on('close', resolve))
server.close()

try {
  assert.ok(received.length >= 1, 'agent 没有回传事件：' + stderr)
  assert.equal(received[0].action, 'would_block')
  assert.equal(received[0].block_reason, 'sensitive-path')
  console.log('✓ 无人值守 agent dry-run：识别敏感路径并回传 would_block')
  console.log(JSON.stringify(received[0], null, 2))
} finally {
  rmSync(root, { recursive: true, force: true })
}
