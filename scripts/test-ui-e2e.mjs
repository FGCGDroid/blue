#!/usr/bin/env node
/**
 * 控制台 E2E：真实浏览器点击「批准」，验证 request → Host API → DB → UI。
 *
 * 前置：一个已加载最新插件、正在运行的 DSH Web。
 * 运行：
 *   BLUE_E2E_URL='http://127.0.0.1:PORT/?token=...' node scripts/test-ui-e2e.mjs
 *
 * 需要本机 Chrome/Chromium；可用 CHROME_PATH 指定。
 * 不下载浏览器、不依赖 Playwright；用 CDP + Node 内置 WebSocket。
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const urlArg = process.argv.find((item) => item.startsWith('--url='))?.slice(6)
const baseUrl = process.env.BLUE_E2E_URL || urlArg
if (!baseUrl) {
  console.error('缺少 BLUE_E2E_URL（或 --url=http://.../?token=...）')
  process.exit(2)
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  const hit = candidates.find((path) => existsSync(path))
  if (!hit) throw new Error('找不到 Chrome；请设置 CHROME_PATH')
  return hit
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function api(body) {
  const response = await fetch(new URL('/blue/api', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error(`API 非 JSON（${response.status}）：${text.slice(0, 300)}`) }
  if (!response.ok || data.ok === false) throw new Error(`API 失败（${response.status}）：${text.slice(0, 500)}`)
  return data
}

class CDP {
  constructor(ws) {
    this.ws = ws
    this.nextId = 0
    this.pending = new Map()
    this.listeners = new Map()
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(message.error.message))
        else resolve(message.result)
        return
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params)
    }
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, [])
    this.listeners.get(method).push(listener)
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
}

function waitForFile(path, timeoutMs = 10000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (existsSync(path)) {
        try {
          const [port, pathPart] = readFileSync(path, 'utf8').trim().split(/\r?\n/)
          if (port && pathPart) return resolve({ port: Number(port), path: pathPart })
        } catch { /* retry */ }
      }
      if (Date.now() - started > timeoutMs) return reject(new Error('Chrome CDP 端口未就绪'))
      setTimeout(tick, 100)
    }
    tick()
  })
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId)
  if (result.exceptionDetails) throw new Error('页面脚本异常：' + (result.exceptionDetails.text || 'unknown'))
  return result.result?.value
}

async function dismissOnboarding(cdp, sessionId) {
  for (let index = 0; index < 8; index += 1) {
    const clicked = await evaluate(cdp, sessionId, `(() => {
      const buttons = [...document.querySelectorAll('button')];
      const target = buttons.find((button) => ['Continue', 'Get started', 'Close'].includes((button.textContent || '').trim()));
      if (!target) return '';
      const text = (target.textContent || '').trim();
      target.click();
      return text;
    })()`)
    if (!clicked) return
    await sleep(350)
  }
}

async function main() {
  const stamp = Date.now()
  const engagement = await api({ op: 'openEngagement', name: `E2E 审批 ${stamp}`, scope: '10.0.0.0/24' })
  const engagementId = engagement.engagement.id
  const taskTitle = `隔离主机 E2E ${stamp}`
  const created = await api({
    op: 'createTask', engagement: engagementId, role: 'ir', title: taskTitle,
    brief: 'E2E 验证控制台批准按钮', priority: 'P0', risk_level: 'high',
  })
  const taskId = created.task.id
  if (created.task.status !== 'pending_approval') throw new Error('测试任务不是 pending_approval：' + created.task.status)

  const profile = mkdtempSync(join(tmpdir(), 'blue-e2e-'))
  const chrome = spawn(chromePath(), [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' })

  let cdp
  const errors = []
  const requests = []
  try {
    const { port, path } = await waitForFile(join(profile, 'DevToolsActivePort'))
    const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`)
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = reject
    })
    cdp = new CDP(ws)

    const target = await cdp.send('Target.createTarget', { url: baseUrl })
    const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
    const sessionId = attached.sessionId
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send('Network.enable', {}, sessionId)
    cdp.on('Runtime.exceptionThrown', (params) => errors.push(params.exceptionDetails?.text || 'page exception'))
    cdp.on('Log.entryAdded', (params) => {
      if (params.entry?.level === 'error') errors.push(params.entry.text)
    })
    cdp.on('Network.requestWillBeSent', (params) => {
      const postData = params.request?.postData
      if (!postData) return
      try {
        const body = JSON.parse(postData)
        if (body.op === 'approveTask') requests.push(body)
      } catch { /* ignore non-JSON */ }
    })

    await cdp.send('Log.enable', {}, sessionId).catch(() => {})
    await sleep(2500)
    await dismissOnboarding(cdp, sessionId)
    await sleep(500)

    const tabClicked = await evaluate(cdp, sessionId, `(() => {
      const tab = document.querySelector('[data-testid="tab-tasks"]');
      if (!tab) return false;
      tab.click();
      return true;
    })()`)
    if (!tabClicked) {
      const text = await evaluate(cdp, sessionId, 'document.body.innerText.slice(0, 500)')
      throw new Error('找不到任务标签；页面：' + text)
    }

    const buttonSelector = `[data-testid="approve-${taskId}"]`
    let found = false
    for (let index = 0; index < 20; index += 1) {
      found = await evaluate(cdp, sessionId, `Boolean(document.querySelector(${JSON.stringify(buttonSelector)}))`)
      if (found) break
      await sleep(250)
    }
    if (!found) {
      const text = await evaluate(cdp, sessionId, 'document.body.innerText.slice(0, 800)')
      throw new Error('找不到批准按钮；页面：' + text)
    }

    await evaluate(cdp, sessionId, `document.querySelector(${JSON.stringify(buttonSelector)}).click()`)
    await sleep(1500)

    const after = await api({ op: 'overview', engagement: engagementId })
    const task = (after.tasks || []).find((item) => item.id === taskId)
    if (!task) throw new Error('审批后找不到任务')
    if (task.status !== 'queued') throw new Error('审批后状态不是 queued：' + task.status)
    if (task.approved_by !== 'console' || !task.approved_at) throw new Error('审批审计字段缺失：' + JSON.stringify(task))
    if (requests.length !== 1) throw new Error('未捕获到一条 approveTask 请求：' + JSON.stringify(requests))
    if (errors.length > 0) throw new Error('页面错误：' + errors.join(' | '))

    const pendingVisible = await evaluate(cdp, sessionId, `Boolean(document.querySelector('[data-testid="approve-${taskId}"]'))`)
    if (pendingVisible) throw new Error('审批后 UI 仍显示批准按钮')

    const rowText = await evaluate(cdp, sessionId, `document.querySelector('[data-testid="task-row-${taskId}"]')?.innerText || ''`)
    if (!/Queued|排队/.test(rowText) || !/console/.test(rowText)) {
      throw new Error('审批后任务行未显示 queued/审批人：' + rowText.slice(0, 300))
    }

    console.log(`✓ 控制台 E2E 通过：${taskId} pending_approval → queued，请求/审计/UI 均验证`)
  } finally {
    try { await cdp?.send('Browser.close') } catch { /* ignore */ }
    try { chrome.kill() } catch { /* ignore */ }
    await sleep(800)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try { rmSync(profile, { recursive: true, force: true }); break } catch { await sleep(300) }
    }
  }
}

main().catch((error) => {
  console.error('✗ 控制台 E2E 失败：' + (error instanceof Error ? error.message : String(error)))
  process.exit(1)
})
