import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const root = mkdtempSync(join(tmpdir(), 'blue-decoy-'))
const log = join(root, 'events.jsonl')
const serverPath = fileURLToPath(new URL('./decoy-server.mjs', import.meta.url))

function start(args) {
  return spawn(process.execPath, [serverPath, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function waitForUrl(child) {
  return new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error('启动超时：' + output)), 5000)
    child.stdout.on('data', (chunk) => {
      output += chunk.toString('utf8')
      const match = output.match(/listening (http:\/\/[^\s]+)/)
      if (match) {
        clearTimeout(timer)
        resolve(match[1])
      }
    })
    child.stderr.on('data', (chunk) => { output += chunk.toString('utf8') })
    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error('服务提前退出：' + code + ' ' + output))
    })
  })
}

let child
try {
  child = start(['--port', '0', '--log', log, '--name', 'test-decoy', '--theme', 'tomcat'])
  const base = await waitForUrl(child)
  const admin = await fetch(base + '/admin')
  const adminText = await admin.text()
  if (admin.status !== 200 || !adminText.includes('Tomcat Manager')) throw new Error('假管理页失败')

  const git = await fetch(base + '/.git/config')
  const gitText = await git.text()
  if (git.status !== 200 || !gitText.includes('repositoryformatversion')) throw new Error('假 .git 失败')

  const backup = await fetch(base + '/backup.sql')
  const backupText = await backup.text()
  if (backup.status !== 200 || backupText.length < 1024 || backupText.length > 128 * 1024) throw new Error('合成备份大小异常')

  const shell = await fetch(base + '/shell.php')
  const shellText = await shell.text()
  if (shell.status !== 200 || !shellText.includes('synthetic decoy') || shellText.includes('exec')) throw new Error('假 shell 不应执行')

  await fetch(base + '/admin', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=SuperSecret123&token=abc123',
  })
  await fetch(base + '/admin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'JsonSecret456', token: 'jsonToken789' }),
  })
  await fetch(base + '/admin?token=QuerySecret321&x=1')

  const missing = await fetch(base + '/random-path')
  if (missing.status !== 404) throw new Error('未知路径应 404')

  for (let i = 0; i < 25; i += 1) await fetch(base + `/p/${i}`)

  await sleep(100)
  const logText = readFileSync(log, 'utf8')
  for (const secret of ['SuperSecret123', 'abc123', 'JsonSecret456', 'jsonToken789', 'QuerySecret321']) {
    if (logText.includes(secret)) throw new Error('日志泄露口令/token：' + secret)
  }
  if (!logText.includes('[REDACTED]')) throw new Error('日志未标记脱敏')
  const lines = logText.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 4) throw new Error('事件日志不足：' + lines.length)
  const events = lines.map((line) => JSON.parse(line))
  if (!events.some((event) => (event.tags || []).includes('automation_burst'))) throw new Error('未记录自动化突发标签')
  const event = events[0]
  if (event.decoy !== 'test-decoy' || !event.remote || !event.path) throw new Error('事件字段不完整')

  child.kill('SIGTERM')
  child = null

  const blocked = start(['--host', '0.0.0.0', '--port', '0', '--log', join(root, 'blocked.jsonl')])
  const exitCode = await new Promise((resolve) => blocked.on('exit', resolve))
  if (exitCode !== 2) throw new Error('公开监听未要求 --allow-public')

  console.log('✓ 诱饵服务测试通过：假路径/有界数据/本地日志/公开监听保护')
} finally {
  if (child) child.kill('SIGTERM')
  rmSync(root, { recursive: true, force: true })
}
