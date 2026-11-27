import { execFile, execFileSync } from 'node:child_process'

const HAS_SSHPASS = (() => {
  try { execFileSync('sshpass', ['-V'], { stdio: 'ignore' }); return true } catch { return false }
})()

const REMOTE_SCRIPT = `
echo "load=$(cut -d' ' -f1 /proc/loadavg)"
echo "disk=$(df -P / | awk 'NR==2{gsub(/%/,"",$5);print $5}')"
echo "uptime=$(cut -d. -f1 /proc/uptime)"
if [ -r /var/log/nginx/access.log ]; then
  echo "req=$(tail -2000 /var/log/nginx/access.log 2>/dev/null | wc -l)"
  echo "e5=$(tail -2000 /var/log/nginx/access.log 2>/dev/null | awk '$9 ~ /^5/' | wc -l)"
else
  echo "req=0"; echo "e5=0"
fi
if [ -r /var/log/auth.log ]; then
  echo "authfail=$(grep -c 'Failed password\\|Invalid user' /var/log/auth.log 2>/dev/null)"
else
  echo "authfail=0"
fi
if command -v fail2ban-client >/dev/null 2>&1; then
  echo "bans=$(fail2ban-client banned 2>/dev/null | tr -d "'" | wc -w)"
else
  echo "bans=0"
fi
if command -v curl >/dev/null 2>&1; then
  echo "site=$(curl -sk -m 5 -o /dev/null -w '%{http_code}' -H 'Host: %HOSTHEADER%' %SITEURL% 2>/dev/null)"
else
  echo "site=000"
fi
`

function sshBase(cfg, host, usePassword) {
  const args = [
    ...(usePassword ? [] : ['-o', 'BatchMode=yes']),
    '-o', `ConnectTimeout=${Math.ceil((cfg.ssh.timeout || 8000) / 1000)}`,
    '-o', 'StrictHostKeyChecking=accept-new',
    '-p', String(host.port || 22),
  ]
  if (cfg.ssh.key) args.push('-i', cfg.ssh.key)
  return args
}

export function collectHost(cfg, host) {
  return new Promise((resolve) => {
    const siteUrl = host.siteUrl || ''
    const hostHeader = host.hostHeader || host.host
    const script = REMOTE_SCRIPT.replace('%SITEURL%', siteUrl || 'https://127.0.0.1/').replace('%HOSTHEADER%', hostHeader)
    const started = Date.now()
    const target = `${host.user || cfg.ssh.user}@${host.host}`
    const password = host.password || ''
    let file, args
    if (password) {
      if (!HAS_SSHPASS) {
        resolve({ ok: false, error: '密码模式需要 sshpass（apt install sshpass）', ms: 0 })
        return
      }
      file = 'sshpass'
      args = ['-p', password, 'ssh', ...sshBase(cfg, host, true), target, 'bash -s']
    } else {
      file = 'ssh'
      args = [...sshBase(cfg, host), target, 'bash -s']
    }
    const child = execFile(file, args, { timeout: cfg.ssh.timeout || 8000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, error: String(stderr || error.message).split('\n')[0] || 'ssh failed', ms: Date.now() - started })
        return
      }
      const out = {}
      for (const line of String(stdout).split('\n')) {
        const i = line.indexOf('=')
        if (i > 0) out[line.slice(0, i)] = line.slice(i + 1).trim()
      }
      resolve({
        ok: true,
        ms: Date.now() - started,
        load: Number(out.load || 0),
        disk: Number(out.disk || 0),
        uptime: Number(out.uptime || 0),
        req: Number(out.req || 0),
        e5: Number(out.e5 || 0),
        authfail: Number(out.authfail || 0),
        bans: Number(out.bans || 0),
        site: String(out.site || '000'),
      })
    })
    child.stdin.end(script)
  })
}
