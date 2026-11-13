#!/usr/bin/env node
/**
 * 本地 ctf-lab 防守回归测试。
 *
 * 只允许 127.0.0.1/::1/localhost；只发 GET；不写配置、不删数据、不跑大字典。
 * 目的：验证 CTF_LAB_GUARD=strict 时，M05/M06/M12/M16 是否真的被拦住。
 *
 * 用法：
 *   node scripts/test-ctf-defense.mjs --base http://127.0.0.1:63488
 *   node scripts/test-ctf-defense.mjs --base http://127.0.0.1:63488 --json
 */
import http from 'node:http'

const RULE_NAMES = ['jwt-none', 'duplicate-cookie', 'path-normalization', 'BLUETEAM gateway', 'proto-pollution']

function parseArgs(argv) {
  const options = { base: 'http://127.0.0.1:63488', json: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base') options.base = String(argv[++i] || options.base)
    else if (arg === '--json') options.json = true
    else if (arg === '--help' || arg === '-h') {
      console.log('用法: node scripts/test-ctf-defense.mjs --base http://127.0.0.1:63488 [--json]')
      process.exit(0)
    } else {
      throw new Error('未知参数：' + arg)
    }
  }
  return options
}

function baseOf(raw) {
  const url = new URL(raw)
  if (url.protocol !== 'http:') throw new Error('只支持 http:// 本地靶场')
  if (!['127.0.0.1', '::1', 'localhost'].includes(url.hostname)) throw new Error('只允许本地回环目标：' + url.hostname)
  return { hostname: url.hostname, port: Number(url.port || 80) }
}

function request(base, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: base.hostname,
      port: base.port,
      method: 'GET',
      path,
      headers: { connection: 'close', ...headers },
      timeout: 5000,
    }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { if (body.length < 65536) body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }))
    })
    req.on('timeout', () => req.destroy(new Error('请求超时')))
    req.on('error', reject)
    req.end()
  })
}

function jwt(header, payload) {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${b64(header)}.${b64(payload)}.`
}

const options = parseArgs(process.argv.slice(2))
const base = baseOf(options.base)
const valid = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoiZ3Vlc3QifQ.c2lnbmF0dXJl'
const forged = jwt({ alg: 'none', typ: 'JWT' }, { user: 'guest', role: 'admin' })
const results = []

async function check(id, title, path, headers, verify) {
  let response
  try {
    response = await request(base, path, headers)
  } catch (error) {
    results.push({ id, title, pass: false, detail: '请求失败：' + error.message })
    return
  }
  let pass = false
  let detail = ''
  try {
    const verdict = verify(response)
    pass = verdict.pass
    detail = verdict.detail
  } catch (error) {
    detail = error.message
  }
  results.push({ id, title, pass, status: response.status, detail })
}

await check('CONTROL', '正常请求不被误杀', '/', {}, (res) => ({
  pass: res.status === 200,
  detail: 'GET / expected 200',
}))

await check('M05', 'JWT alg=none 被拦', '/admin', { cookie: `token=${forged}` }, (res) => ({
  pass: res.status === 403,
  detail: 'expected 403, got ' + res.status,
}))

await check('M06', '重复 token Cookie 被拦', '/admin', { cookie: `token=${valid}; token=${forged}` }, (res) => ({
  pass: res.status === 403,
  detail: 'expected 403, got ' + res.status,
}))

await check('M12', '路径 ./ 规范化被拦', '/./config', {}, (res) => ({
  pass: res.status === 403,
  detail: 'expected 403, got ' + res.status,
}))

await check('M12b', '路径 %2e 编码被拦', '/%2e/config', {}, (res) => ({
  pass: res.status === 403,
  detail: 'expected 403, got ' + res.status,
}))

await check('M16', '403 不回显规则名', '/./config', {}, (res) => {
  const leaked = RULE_NAMES.filter((name) => res.body.toLowerCase().includes(name.toLowerCase()))
  return {
    pass: res.status === 403 && leaked.length === 0,
    detail: leaked.length > 0 ? '泄露规则名：' + leaked.join(', ') : 'no rule name leaked',
  }
})

const failed = results.filter((item) => !item.pass)
if (options.json) {
  console.log(JSON.stringify({ base: options.base, results, failed: failed.length }, null, 2))
} else {
  for (const item of results) {
    console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.id.padEnd(7)} ${item.title}${item.status ? '  status=' + item.status : ''}  ${item.detail}`)
  }
  console.log('')
  console.log(failed.length === 0 ? '全部通过。' : `失败 ${failed.length} 项：检查 CTF_LAB_GUARD=strict 是否已设置并重启 DSH。`)
}
process.exit(failed.length === 0 ? 0 : 1)
