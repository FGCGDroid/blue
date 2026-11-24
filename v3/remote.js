/**
 * 远程接入服务：SSH 私钥部署采集器 + 通用云 Webhook 封禁。
 *
 * 只允许本地已有的私钥路径；不接收、不保存私钥内容。
 * 所有远程写操作必须先有已审批的高风险任务。
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { REMOTE_BAN, normalizeTtl } from './domain/remote/config.js'
import { unbanElementCommand, flushBanCommand } from './domain/remote/commands.js'
import { join } from 'node:path'

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function quote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function hostOk(host) {
  return /^[A-Za-z0-9.-]{1,253}$/.test(host) || /^[0-9a-f:]+$/i.test(host)
}

function userOk(user) {
  return /^[A-Za-z0-9._-]{1,64}$/.test(user)
}

function keyOk(path) {
  return typeof path === 'string' && path !== '' && existsSync(path)
}

function clampPort(value) {
  const port = Number(value) || 22
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 22
}

export function createRemoteService(store) {
  function settings() {
    return {
      host: text(store.db.getMeta('remote:ssh:host', '')),
      user: text(store.db.getMeta('remote:ssh:user', '')),
      key_path: text(store.db.getMeta('remote:ssh:key', '')),
      port: clampPort(store.db.getMeta('remote:ssh:port', '22')),
      cloud_url: text(store.db.getMeta('remote:cloud:url', '')),
      cloud_token: text(store.db.getMeta('remote:cloud:token', '')),
    }
  }

  function save(input = {}) {
    const host = text(input.host).trim()
    const user = text(input.user).trim()
    const keyPath = text(input.key_path).trim()
    if (!hostOk(host)) throw new Error('host 不合法')
    if (!userOk(user)) throw new Error('user 不合法')
    if (!keyOk(keyPath)) throw new Error('key_path 必须是本机已存在的私钥文件')
    const port = clampPort(input.port)
    store.db.setMeta('remote:ssh:host', host)
    store.db.setMeta('remote:ssh:user', user)
    store.db.setMeta('remote:ssh:key', keyPath)
    store.db.setMeta('remote:ssh:port', String(port))
    if (input.cloud_url !== undefined) store.db.setMeta('remote:cloud:url', text(input.cloud_url).trim())
    if (input.cloud_token !== undefined) store.db.setMeta('remote:cloud:token', text(input.cloud_token).trim())
    return { ...settings(), cloud_token: settings().cloud_token ? '***' : '' }
  }

  function run(command, args, timeoutMs = 30000) {
    return new Promise((resolve) => {
      const child = spawn(command, args, { windowsHide: true })
      let stdout = ''
      let stderr = ''
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { child.kill() } catch { /* ignore */ }
        resolve({ ok: false, error: 'timeout', stdout, stderr })
      }, timeoutMs)
      child.stdout.on('data', (chunk) => { stdout += String(chunk) })
      child.stderr.on('data', (chunk) => { stderr += String(chunk) })
      child.on('error', (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: false, error: error.message, stdout, stderr })
      })
      child.on('close', (code) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ ok: code === 0, code, stdout, stderr })
      })
    })
  }

  function sshBase(config) {
    return ['-i', config.key_path, '-p', String(config.port), '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=8', `${config.user}@${config.host}`]
  }

  async function test(input = {}) {
    const config = { ...settings(), ...input }
    if (!keyOk(config.key_path)) return { ok: false, error: '私钥不存在' }
    const result = await run('ssh', [...sshBase(config), 'node --version && echo BLUE_OK'])
    return { ok: result.ok && result.stdout.includes('BLUE_OK'), ...result }
  }

  async function deploy(input = {}) {
    const config = { ...settings(), ...input }
    if (!keyOk(config.key_path)) return { ok: false, error: '私钥不存在' }
    const collectorUrl = text(input.collector_url).replace(/\/+$/, '')
    const token = text(input.token)
    const engagement = text(input.engagement)
    if (collectorUrl === '' || token === '' || engagement === '') {
      return { ok: false, error: '需要 collector_url / token / engagement' }
    }
    const localScript = new URL('./infra/remote/assets/blue-collector.mjs', import.meta.url)
    let script
    try { script = readFileSync(localScript, 'utf8') } catch (error) { return { ok: false, error: '读取采集器失败：' + error.message } }
    const dir = mkdtempSync(join(tmpdir(), 'blue-remote-'))
    const file = join(dir, 'blue-collector.mjs')
    writeFileSync(file, script, 'utf8')
    try {
      const scp = await run('scp', ['-i', config.key_path, '-P', String(config.port), '-o', 'StrictHostKeyChecking=accept-new', file, `${config.user}@${config.host}:/tmp/blue-collector.mjs`])
      if (!scp.ok) return { ok: false, step: 'scp', ...scp }
      const remote = [
        'mkdir -p /opt/blue-collector',
        'mv /tmp/blue-collector.mjs /opt/blue-collector/blue-collector.mjs',
        'pkill -f /opt/blue-collector/blue-collector.mjs || true',
        'NODE_BIN=$(command -v node || ls -1 /www/server/nodejs/*/bin/node 2>/dev/null | tail -1 || true)',
        '[ -n "$NODE_BIN" ] || { echo NODE_NOT_FOUND; exit 2; }',
        `nohup env ${quote(`BLUE_COLLECTOR_TOKEN=${token}`)} ${quote(`BLUE_COLLECTOR_URL=${collectorUrl}`)} ${quote(`BLUE_COLLECTOR_ENGAGEMENT=${engagement}`)} ${quote(`BLUE_COLLECTOR_LOG=${text(input.log, '/www/wwwlogs/access.log')}`)} "$NODE_BIN" /opt/blue-collector/blue-collector.mjs --url ${quote(collectorUrl)} --engagement ${quote(engagement)} --log ${quote(text(input.log, '/www/wwwlogs/access.log'))} >/opt/blue-collector/collector.log 2>&1 &`,
      ].join(' && ')
      const install = await run('ssh', [...sshBase(config), remote])
      return { ok: install.ok, step: install.ok ? 'deployed' : 'ssh', ...install }
    } finally {
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
    }
  }

  async function deployUnattended(input = {}) {
    const config = { ...settings(), ...input }
    if (!keyOk(config.key_path)) return { ok: false, error: '私钥不存在' }
    const collectorUrl = text(input.collector_url).replace(/\/+$/, '')
    const token = text(input.token)
    const engagement = text(input.engagement)
    if (collectorUrl === '' || token === '' || engagement === '') {
      return { ok: false, error: '需要 collector_url / token / engagement' }
    }
    let agent
    let detect
    let installer
    try {
      agent = readFileSync(new URL('./infra/remote/assets/blue-agent.mjs', import.meta.url), 'utf8')
      detect = readFileSync(new URL('./domain/remote/agent-detect.js', import.meta.url), 'utf8')
      installer = readFileSync(new URL('./infra/remote/assets/install-unattended.sh', import.meta.url), 'utf8')
    } catch (error) {
      return { ok: false, error: '读取无人值守文件失败：' + error.message }
    }
    const dir = mkdtempSync(join(tmpdir(), 'blue-unattended-'))
    const agentFile = join(dir, 'blue-agent.mjs')
    const detectFile = join(dir, 'agent-detect.mjs')
    const installerFile = join(dir, 'install-unattended.sh')
    writeFileSync(agentFile, agent, 'utf8')
    writeFileSync(detectFile, detect, 'utf8')
    writeFileSync(installerFile, installer, 'utf8')
    try {
      const scp = await run('scp', ['-i', config.key_path, '-P', String(config.port), '-o', 'StrictHostKeyChecking=accept-new', agentFile, detectFile, installerFile, `${config.user}@${config.host}:/tmp/`])
      if (!scp.ok) return { ok: false, step: 'scp', ...scp }
      const mode = input.enforce === true ? 'enforce' : 'dry-run'
      const ttl = normalizeTtl(input.ttl)
      const webhook = text(input.webhook).trim()
      const digestHour = Math.min(Math.max(Number(input.digest_hour) || 9, 0), 23)
      const command = `if [ "$(id -u)" -eq 0 ]; then bash /tmp/install-unattended.sh ${quote(collectorUrl)} ${quote(token)} ${quote(engagement)} ${quote(text(input.log, '/www/wwwlogs/access.log'))} ${quote(text(input.allow_ips, ''))} ${quote(mode)} ${quote(String(ttl))} ${quote(webhook)} ${quote(String(digestHour))}; else sudo -n bash /tmp/install-unattended.sh ${quote(collectorUrl)} ${quote(token)} ${quote(engagement)} ${quote(text(input.log, '/www/wwwlogs/access.log'))} ${quote(text(input.allow_ips, ''))} ${quote(mode)} ${quote(String(ttl))} ${quote(webhook)} ${quote(String(digestHour))}; fi`
      const install = await run('ssh', [...sshBase(config), command], 60000)
      return { ok: install.ok, mode, ttl, webhook: webhook !== '', step: install.ok ? 'installed' : 'install', ...install }
    } finally {
      try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
    }
  }

  async function cloudBlock(input = {}) {
    const config = { ...settings(), ...input }
    const url = text(config.cloud_url)
    const token = text(config.cloud_token)
    if (!/^https:\/\//i.test(url)) return { ok: false, error: '云 Webhook 必须是 https' }
    if (!input.ip || !/^[0-9a-f:.]+$/i.test(String(input.ip))) return { ok: false, error: 'ip 不合法' }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ip: input.ip, ttl_seconds: Math.min(Math.max(Number(input.ttl_seconds) || 3600, 60), 86400), reason: text(input.reason, 'blue-team') }),
      })
      const body = await response.text()
      return { ok: response.ok, status: response.status, body: body.slice(0, 2000) }
    } catch (error) {
      return { ok: false, error: error.message }
    }
  }


  async function unban(input = {}) {
    const config = { ...settings(), ...input }
    if (!keyOk(config.key_path)) return { ok: false, error: '私钥不存在' }
    const ip = text(input.ip).trim()
    const command = ip === '' ? flushBanCommand() : unbanElementCommand(ip)
    if (command === null) return { ok: false, error: 'ip 不合法' }
    const result = await run('ssh', [...sshBase(config), command])
    return { ok: result.ok, mode: ip === '' ? 'flush' : 'element', ip, ...result }
  }

  return { settings, save, test, deploy, deployUnattended, unban, cloudBlock }
}
