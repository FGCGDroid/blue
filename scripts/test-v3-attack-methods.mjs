#!/usr/bin/env node
/**
 * 对照 docs/3.0/attack-methods.md 的网关回归测试。
 *
 * 每个用例都带对照（M25）：
 *   - 正常请求必须 200 且真的到上游；
 *   - 攻击请求必须被拒，且上游 0 命中（不能只检测不阻断）。
 * 同一请求连发 3 次结果必须一致（M14：没有“首次放行”窗口）。
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { startGateway } from '../v3/infra/gateway/server.js'

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve(server.address().port)
    })
  })
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.()
    server.close(resolve)
  })
}

const hits = new Map()
function hit(path) {
  const key = String(path).split('?')[0]
  hits.set(key, (hits.get(key) || 0) + 1)
}
function hitsOf(path) {
  return hits.get(path) || 0
}

const upstream = http.createServer((req, res) => {
  hit(req.url)
  res.setHeader('x-powered-by', 'UpstreamTest/1.0')
  res.setHeader('server', 'upstream-test')
  res.setHeader('via', '1.1 upstream')
  res.end('upstream:' + req.url.split('?')[0])
})

function rawRequest(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: false,
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        rawHeaders: response.rawHeaders,
        body: Buffer.concat(chunks).toString('utf8'),
      }))
    })
    request.on('error', reject)
    if (options.body !== undefined) request.write(options.body)
    request.end()
  })
}

function countRawHeader(rawHeaders, name) {
  let count = 0
  for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
    if (String(rawHeaders[index]).toLowerCase() === name) count += 1
  }
  return count
}

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const jwt = (header, payload = { sub: 'x' }) => `${b64(header)}.${b64(payload)}.`

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`PASS  ${name}`)
  } catch (error) {
    results.push({ name, ok: false, error })
    console.log(`FAIL  ${name}: ${error && error.message ? error.message : error}`)
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'blue-attack-methods-'))
let gateway
let allowGateway
let upstreamPort

const policy = {
  version: 1,
  default_action: 'allow',
  case_insensitive: true,
  max_path_length: 4096,
  reject_semicolon: true,
  protected: [{ id: 'admin', prefix: '/admin', action: 'block', allow: [] }],
  deny: [],
  builtin_allow: [],
}

const form = (jsonText) => 'json=' + encodeURIComponent(jsonText)
const postJson = (text) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: text })
const postForm = (text) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: text })

try {
  upstreamPort = await listen(upstream)
  gateway = await startGateway({
    host: '127.0.0.1',
    port: 0,
    upstream: `http://127.0.0.1:${upstreamPort}`,
    policyPath: join(tmp, 'policy.json'),
    logPath: join(tmp, 'decisions.jsonl'),
    mode: 'enforce',
  }, {
    policy,
    logAllow: false,
    watchPolicy: false,
    maxBody: 64 * 1024,
  })
  const port = gateway.port

  // ---- 对照组：正常请求必须真的到上游 ----
  await check('对照：GET / 200 且到上游', async () => {
    const response = await rawRequest(port, '/')
    assert.equal(response.status, 200)
    assert.ok(hitsOf('/') >= 1)
  })

  await check('对照：单 token Cookie 不误拦', async () => {
    const response = await rawRequest(port, '/', { headers: { cookie: 'token=opaque-session-id' } })
    assert.equal(response.status, 200)
  })

  await check('对照：普通表单 json 不误拦', async () => {
    const response = await rawRequest(port, '/', postForm(form('{"theme":"dark"}')))
    assert.equal(response.status, 200)
  })

  // ---- M01/M04：响应去指纹 ----
  await check('M01：响应不带 Server / X-Powered-By / Via', async () => {
    hitsOf('/') // 保持引用
    const response = await rawRequest(port, '/')
    assert.equal(countRawHeader(response.rawHeaders, 'server'), 0)
    assert.equal(countRawHeader(response.rawHeaders, 'x-powered-by'), 0)
    assert.equal(countRawHeader(response.rawHeaders, 'via'), 0)
  })

  await check('M01：Date 只有一层', async () => {
    const response = await rawRequest(port, '/')
    assert.equal(countRawHeader(response.rawHeaders, 'date'), 1)
  })

  // ---- M32：目录 403 后打子文件名 ----
  await check('M32：/backup 403', async () => {
    assert.equal((await rawRequest(port, '/backup')).status, 403)
  })
  await check('M32：/backup/ 403', async () => {
    assert.equal((await rawRequest(port, '/backup/')).status, 403)
  })
  await check('M32：/backup/flag.txt 也 403 且上游 0 命中', async () => {
    const response = await rawRequest(port, '/backup/flag.txt')
    assert.equal(response.status, 403)
    assert.equal(hitsOf('/backup/flag.txt'), 0)
  })
  await check('M32：/backup/config.json 403', async () => {
    assert.equal((await rawRequest(port, '/backup/config.json')).status, 403)
  })
  await check('M32：/backups/x 403', async () => {
    assert.equal((await rawRequest(port, '/backups/x')).status, 403)
  })

  // ---- M12：路径规范化 ----
  await check('M12：/%62ackup 解码后仍 403', async () => {
    assert.equal((await rawRequest(port, '/%62ackup')).status, 403)
  })
  await check('M12：/./backup 400', async () => {
    assert.equal((await rawRequest(port, '/./backup')).status, 400)
  })
  await check('M12：/x/../backup 400', async () => {
    assert.equal((await rawRequest(port, '/x/../backup')).status, 400)
  })
  await check('M12：//backup 403', async () => {
    assert.equal((await rawRequest(port, '//backup')).status, 403)
  })
  await check('M12：双编码 400', async () => {
    assert.equal((await rawRequest(port, '/%252e/backup')).status, 400)
  })

  // ---- M10：鉴权路径变体 ----
  for (const path of ['/admin', '/ADMIN', '/Admin/', '//admin', '/%61dmin']) {
    await check(`M10：${path} 403 且上游 0 命中`, async () => {
      assert.equal((await rawRequest(port, path)).status, 403)
      assert.equal(hitsOf('/admin'), 0)
    })
  }
  await check('M10：/admin;x 400', async () => {
    assert.equal((await rawRequest(port, '/admin;x')).status, 400)
  })
  await check('M10：/admin%2fx 400', async () => {
    assert.equal((await rawRequest(port, '/admin%2fx')).status, 400)
  })

  // ---- M05：JWT alg 变体 ----
  const algs = [
    { alg: 'none' }, { alg: 'None' }, { alg: 'NONE' }, { alg: 'nOnE' },
    { alg: ' none ' }, { alg: null }, { typ: 'JWT' },
  ]
  for (const header of algs) {
    const label = JSON.stringify(header)
    await check(`M05：alg=${label} 403`, async () => {
      const token = jwt(header)
      assert.equal((await rawRequest(port, '/', { headers: { cookie: `token=${token}` } })).status, 403)
      assert.equal((await rawRequest(port, '/', { headers: { authorization: `Bearer ${token}` } })).status, 403)
    })
  }
  await check('M05：重复 alg 键（前 none 后 HS256）403', async () => {
    const raw = Buffer.from('{"alg":"none","alg":"HS256"}').toString('base64url')
    const token = `${raw}.${b64({ sub: 'x' })}.`
    assert.equal((await rawRequest(port, '/', { headers: { cookie: `token=${token}` } })).status, 403)
  })

  // ---- M06：重复 Cookie ----
  const cookieCases = [
    'token=a; token=b',
    'token=b; token=a',
    'Token=a; token=b',
    'session=a; session=b',
    'jwt=a; jwt=b',
  ]
  for (const cookie of cookieCases) {
    await check(`M06：${cookie} 403`, async () => {
      assert.equal((await rawRequest(port, '/', { headers: { cookie } })).status, 403)
    })
  }

  // ---- M11/M13：转义与重复键 ----
  const jsonCases = [
    '{"admin":true}',
    '{"\\u0061dmin":true}',
    '{"is\\u0041dmin":true}',
    '{"__proto__":{"isAdmin":true}}',
    '{"constructor":{"prototype":{"isAdmin":true}}}',
    '{"alg":"HS256","alg":"none"}',
    '[{"__proto__":{}}]',
  ]
  for (const text of jsonCases) {
    await check(`M11/M17：表单 json=${text} 403`, async () => {
      assert.equal((await rawRequest(port, '/', postForm(form(text)))).status, 403)
    })
  }
  await check('M11：转义 __proto__ 403', async () => {
    const escaped = '{"\\u005f\\u005fproto\\u005f\\u005f":{"isAdmin":true}}'
    assert.equal((await rawRequest(port, '/', postForm(form(escaped)))).status, 403)
  })
  await check('M13：重复 json 参数 403', async () => {
    const body = 'json=' + encodeURIComponent('{"theme":"dark"}') + '&json=' + encodeURIComponent('{"admin":true}')
    assert.equal((await rawRequest(port, '/', postForm(body))).status, 403)
  })
  await check('M13：裸 application/json 同样检查', async () => {
    assert.equal((await rawRequest(port, '/', postJson('{"is_admin":true}'))).status, 403)
  })

  // ---- M15：深嵌套 / multipart / chunked / 体积 ----
  await check('M15：深嵌套 12 层 403', async () => {
    let nested = '{"is_admin":true}'
    for (let index = 0; index < 12; index += 1) nested = '{"a":' + nested + '}'
    const response = await rawRequest(port, '/', postJson(nested))
    assert.equal(response.status, 403)
  })

  await check('M15：multipart 里的 json 字段 403', async () => {
    const boundary = '----blueboundary'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="json"',
      '',
      '{"is_admin":true}',
      `--${boundary}--`,
      '',
    ].join('\r\n')
    const response = await rawRequest(port, '/', {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
    })
    assert.equal(response.status, 403)
  })

  await check('M15：上传文件里的 __proto__ 不误拦', async () => {
    const boundary = '----blueboundary2'
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="notes.txt"',
      'Content-Type: text/plain',
      '',
      '{"__proto__":{"x":1}}',
      `--${boundary}--`,
      '',
    ].join('\r\n')
    const response = await rawRequest(port, '/', {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body,
    })
    assert.equal(response.status, 200)
  })

  await check('M15：chunked body 同样检查且不挂起', async () => {
    const response = await rawRequest(port, '/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"admin":true}',
    })
    assert.equal(response.status, 403)
  })

  await check('M15：40KB 填充也绕不过', async () => {
    const padding = 'x'.repeat(40 * 1024)
    const response = await rawRequest(port, '/', postJson(JSON.stringify({ pad: padding, is_admin: true })))
    assert.equal(response.status, 403)
  })

  await check('M15：超过 maxBody 413', async () => {
    const response = await rawRequest(port, '/', postJson('x'.repeat(80 * 1024)))
    assert.equal(response.status, 413)
  })

  // ---- M16：不泄露规则名 ----
  await check('M16：403 不回规则名', async () => {
    for (const [path, options] of [['/backup', {}], ['/', { headers: { cookie: 'token=' + jwt({ alg: 'none' }) } }]]) {
      const response = await rawRequest(port, path, options)
      assert.equal(response.status, 403)
      assert.equal(response.body, 'request blocked')
      assert.ok(!/builtin|jwt-none|sensitive|proto|rule/i.test(response.body))
    }
  })

  // ---- M14：没有状态化放行窗口 ----
  await check('M14：同一请求连发 3 次结果一致', async () => {
    const samples = []
    for (let index = 0; index < 3; index += 1) {
      samples.push(await rawRequest(port, '/', { headers: { cookie: 'token=' + jwt({ alg: 'none' }) } }))
    }
    assert.ok(samples.every((item) => item.status === samples[0].status && item.body === samples[0].body))
    assert.equal(samples[0].status, 403)

    const pathSamples = []
    for (let index = 0; index < 3; index += 1) pathSamples.push(await rawRequest(port, '/backup/flag.txt'))
    assert.ok(pathSamples.every((item) => item.status === 403))
  })

  // ---- builtin_allow 逃生口 ----
  allowGateway = await startGateway({
    host: '127.0.0.1',
    port: 0,
    upstream: `http://127.0.0.1:${upstreamPort}`,
    policyPath: join(tmp, 'policy-allow.json'),
    logPath: join(tmp, 'decisions-allow.jsonl'),
    mode: 'enforce',
  }, {
    policy: { ...policy, builtin_allow: ['/backup'] },
    watchPolicy: false,
    maxBody: 64 * 1024,
  })
  await check('builtin_allow：显式放行 /backup 后可达上游', async () => {
    const response = await rawRequest(allowGateway.port, '/backup')
    assert.equal(response.status, 200)
  })
  await check('builtin_allow：只放行指定的那一条', async () => {
    assert.equal((await rawRequest(allowGateway.port, '/.env')).status, 403)
  })

  const failed = results.filter((item) => !item.ok)
  console.log('')
  console.log(`共 ${results.length} 项：通过 ${results.length - failed.length}，失败 ${failed.length}`)
  if (failed.length > 0) {
    console.log('失败项：' + failed.map((item) => item.name).join('；'))
    process.exitCode = 1
  } else {
    console.log('✓ 攻击方法全集回归通过')
  }
} finally {
  if (gateway) await gateway.close()
  if (allowGateway) await allowGateway.close()
  await close(upstream)
  rmSync(tmp, { recursive: true, force: true })
}
