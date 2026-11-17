#!/usr/bin/env node
/**
 * 把 test/vectors/path.json 的 40 条契约接到真实本地靶场。
 *
 * 用原始 TCP 写请求行，避免 fetch/URL 客户端把 ..、%2e、// 先规范化。
 * 断言来自网关决策日志，不只看 HTTP 状态。
 */
import assert from 'node:assert/strict'
import net from 'node:net'
import { readFileSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

import { startUpstream } from '../upstream/server.js'
import { startLabGateway } from '../gateway/start.js'

const LAB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(LAB_ROOT, '..')
const vectors = JSON.parse(readFileSync(join(ROOT, 'test', 'vectors', 'path.json'), 'utf8'))
const logPath = join(LAB_ROOT, '.run', `vectors-${Date.now()}.jsonl`)

function sendRaw(gateway, target, method = 'GET') {
  return new Promise((resolvePromise, reject) => {
    const socket = net.connect({ host: gateway.host, port: gateway.port }, () => {
      socket.write(`${method} ${target} HTTP/1.1\r\nHost: lab.test\r\nConnection: close\r\n\r\n`)
    })
    const chunks = []
    socket.on('data', (chunk) => chunks.push(chunk))
    socket.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      const match = /^HTTP\/1\.[01] (\d{3})/.exec(text)
      resolvePromise(match ? Number(match[1]) : 0)
    })
    socket.on('error', reject)
    socket.setTimeout(5000, () => {
      socket.destroy()
      reject(new Error('raw request timeout'))
    })
  })
}

const upstream = await startUpstream({ port: 0 })
let gateway

try {
  gateway = await startLabGateway({
    port: 0,
    upstream: upstream.url,
    logPath,
  })

  const statuses = new Map()
  for (const item of vectors.vectors) {
    const method = item.input === '*' ? 'OPTIONS' : 'GET'
    statuses.set(item.input, await sendRaw(gateway, item.input, method))
  }

  await gateway.close()
  gateway = null

  const decisions = new Map()
  const lines = readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean)
  for (const line of lines) {
    const entry = JSON.parse(line)
    decisions.set(entry.raw_path, entry)
  }

  for (const item of vectors.vectors) {
    const status = statuses.get(item.input)
    const entry = decisions.get(item.input)

    if (entry === undefined) {
      // 空 request-target 和相对路径可能被 Node HTTP parser 直接拒掉。
      assert.ok(item.input === '' || item.input === 'admin', `没有决策日志：${JSON.stringify(item.input)}`)
      assert.ok(status === 400 || status === 0, `${item.id} 应被拒绝，实际 ${status}`)
      continue
    }

    assert.equal(entry.decision, item.expect.decision, `${item.id} decision`)
    assert.equal(entry.canonical_path, item.expect.canonical, `${item.id} canonical`)
    assert.equal(entry.reason, item.expect.reason, `${item.id} reason`)

    if (item.expect.decision === 'block') {
      assert.ok(status === 400 || status === 403, `${item.id} block status=${status}`)
    } else {
      assert.ok(status !== 400 && status !== 403, `${item.id} allow status=${status}`)
    }
  }

  console.log(`✓ 本地靶场 40 条路径契约通过（决策日志 ${decisions.size} 条）`)
} finally {
  if (gateway) await gateway.close()
  await upstream.close()
  try { unlinkSync(logPath) } catch { /* ignore */ }
}
