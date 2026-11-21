import assert from 'node:assert/strict'
import { parseLine, shouldBlock, isPrivate } from '../v3/domain/remote/agent-detect.js'

const allow = new Set(['203.0.113.99'])
const state = { allow, failures: new Map() }

// nginx 常见格式
const line = '45.12.7.3 - - [21/Nov/2026:12:00:00 +0800] "GET /.git/config HTTP/1.1" 404 153 "-" "sqlmap/1.7"'
const event = parseLine(line)
assert.equal(event.remote, '45.12.7.3')
assert.equal(shouldBlock(event, state)?.reason, 'sensitive-path')

const cases = [
  [{ remote: '1.2.3.4', path: '/upload/shell.php', raw_path: '/upload/shell.php', status: 200 }, 'upload-shell'],
  [{ remote: '1.2.3.4', path: '/index.php', raw_path: '/index.php?q=<script>alert(1)</script>', status: 200 }, 'xss'],
  [{ remote: '1.2.3.4', path: '/download', raw_path: '/download?f=../../etc/passwd', status: 200 }, 'traversal'],
  [{ remote: '1.2.3.4', path: '/backup.sql', raw_path: '/backup.sql', status: 200 }, 'sensitive-path'],
  [{ remote: '1.2.3.4', path: '/', raw_path: '/', status: 200, user_agent: 'Nuclei - Open-source project' }, 'scanner-ua'],
]
for (const [input, reason] of cases) {
  const hit = shouldBlock(input, { allow, failures: new Map() })
  assert.equal(hit?.reason, reason, JSON.stringify(input))
}

// 白名单和内网不封
assert.equal(shouldBlock({ remote: '203.0.113.99', raw_path: '/.git/config' }, state), null)
assert.equal(shouldBlock({ remote: '192.168.1.9', raw_path: '/.git/config' }, state), null)
assert.equal(isPrivate('10.1.2.3'), true)
assert.equal(isPrivate('8.8.8.8'), false)

// 401/403 连续 6 次才封
const failures = new Map()
let last = null
for (let i = 0; i < 6; i += 1) {
  last = shouldBlock({ remote: '9.9.9.9', path: '/login', raw_path: '/login', status: 401 }, { allow, failures })
}
assert.equal(last?.reason, 'auth-failures')
assert.equal(last.count, 6)

console.log('✓ 无人值守判定：上传 webshell / XSS / 穿越 / 敏感路径 / 扫描器 / 白名单 / 内网 / 401 阈值 全部通过')
