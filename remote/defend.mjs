import { execFile, execFileSync } from 'node:child_process'

function sshBase(cfg, host, usePassword) {
  const args = [
    '-o', `ConnectTimeout=${Math.ceil((cfg.ssh.timeout || 8000) / 1000)}`,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-p', String(host.port || 22),
  ]
  if (!usePassword) args.unshift('-o', 'BatchMode=yes')
  if (cfg.ssh.key) args.push('-i', cfg.ssh.key)
  return args
}

export function sshExec(cfg, host, script, timeout) {
  return new Promise((resolve) => {
    const target = `${host.user || cfg.ssh.user}@${host.host}`
    const password = host.password || ''
    let file, args
    if (password) {
      if (!hasSshpass()) { resolve({ ok: false, error: '缺少 sshpass' }); return }
      file = 'sshpass'
      args = ['-p', password, 'ssh', ...sshBase(cfg, host, true), target, 'bash -s']
    } else {
      file = 'ssh'
      args = [...sshBase(cfg, host, false), target, 'bash -s']
    }
    execFile(file, args, { timeout: timeout || (cfg.ssh.timeout || 8000) + 4000 }, (error, stdout, stderr) => {
      if (error) { resolve({ ok: false, error: String(stderr || error.message).split('\n')[0] }); return }
      resolve({ ok: true, out: String(stdout) })
    }).stdin.end(script)
  })
}

function hasSshpass() {
  try { execFileSync('sshpass', ['-V'], { stdio: 'ignore' }); return true } catch { return false }
}

const TABLE = 'blue_remote'

const NFT_PART = `
if ! nft list table inet ${TABLE} >/dev/null 2>&1; then
  nft add table inet ${TABLE}
  nft add set inet ${TABLE} blocked '{ type ipv4_addr; flags timeout; }'
  nft add chain inet ${TABLE} input '{ type filter hook input priority -10; policy accept; }'
  nft add rule inet ${TABLE} input ip saddr @blocked drop
fi
`

const F2B_PART = `
if [ -d /etc/fail2ban ]; then
  if [ ! -f /etc/fail2ban/jail.d/blue-remote.local ]; then
    printf '[sshd]\\nenabled = true\\nmaxretry = 3\\nfindtime = 3600\\nbantime = 86400\\n' > /etc/fail2ban/jail.d/blue-remote.local
    fail2ban-client reload >/dev/null 2>&1 || true
  fi
fi
`

export const SETUP_SCRIPT = 'set -e\n' + NFT_PART + F2B_PART + 'echo OK\n'

export async function setupHost(cfg, host) {
  const caps = String(host.caps || '')
  const hasNft = !caps || caps.split(',').includes('nft')
  const hasF2b = !caps || caps.split(',').includes('fail2ban')
  if (!hasNft && !hasF2b) return { ok: true, skipped: '被控机没有 nft 和 fail2ban' }
  const script = 'set -e\n' + (hasNft ? NFT_PART : '') + (hasF2b ? F2B_PART : '') + 'echo OK\n'
  const r = await sshExec(cfg, host, script, 20000)
  if (!r.ok) return r
  return { ok: r.out.includes('OK'), error: r.out.includes('OK') ? '' : 'setup 未完成', skipped: hasNft ? '' : 'nft 不可用' }
}

export async function listOffenders(cfg, host, minutes = 30) {
  const script = `
if [ -r /var/log/nginx/access.log ]; then
  tail -5000 /var/log/nginx/access.log 2>/dev/null | awk '
    ($9==403 || $9==401 || $9==444) { split($4,t,":"); if (t[2] != "") print $1 }
  ' | sort | uniq -c | sort -rn | head -20
fi
`
  const r = await sshExec(cfg, host, script, 15000)
  if (!r.ok) return []
  const out = []
  for (const line of r.out.split('\n')) {
    const m = /^\s*(\d+)\s+((?:\d{1,3}\.){3}\d{1,3})$/.exec(line)
    if (m) out.push({ ip: m[2], hits: Number(m[1]) })
  }
  return out
}

function validIp(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every((n) => Number(n) >= 0 && Number(n) <= 255)
}

export function ignoreIp(cfg, ip) {
  if (!validIp(ip)) return true
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(ip)) return true
  return (cfg.defense?.ignore || []).includes(ip)
}

export async function banIp(cfg, host, ip, ttl = '24h', reason = '') {
  if (!validIp(ip) || ignoreIp(cfg, ip)) return { ok: false, error: 'ignored' }
  const script = `
if command -v nft >/dev/null 2>&1; then
  nft add element inet ${TABLE} blocked '{ ${ip} timeout ${ttl} }' 2>/dev/null && echo NFT_OK || echo NFT_FAIL
fi
if command -v fail2ban-client >/dev/null 2>&1; then
  fail2ban-client set sshd banip ${ip} >/dev/null 2>&1 || true
fi
`
  const r = await sshExec(cfg, host, script, 12000)
  if (!r.ok) return r
  return { ok: r.out.includes('NFT_OK'), error: reason }
}

export async function unbanIp(cfg, host, ip) {
  if (!validIp(ip)) return { ok: false, error: 'bad ip' }
  const script = `
nft delete element inet ${TABLE} blocked '{ ${ip} }' 2>/dev/null || true
fail2ban-client set sshd unbanip ${ip} >/dev/null 2>&1 || true
echo DONE
`
  return sshExec(cfg, host, script, 10000)
}
