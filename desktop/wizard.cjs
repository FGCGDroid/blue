const { createServer } = require('node:http')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')

const PORT = 8123
const DIR = process.cwd()
let PUB = ''
try { PUB = readFileSync(join(DIR, 'license-public.pem'), 'utf8') } catch { PUB = '' }

const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>蓝队远程防控 · 安装向导</title>
<style>body{background:#0b1220;color:#dbe4f0;font:15px/1.7 system-ui;margin:0;padding:24px}
.box{max-width:560px;margin:6vh auto}.card{background:#111c2e;border:1px solid #1e2b44;border-radius:14px;padding:20px}
h1{font-size:22px}label{display:block;margin:12px 0 4px;color:#94a3b8;font-size:13px}
input{width:100%;padding:9px;background:#0b1626;border:1px solid #2a3b57;border-radius:8px;color:#e6eefc}
button{margin-top:18px;width:100%;padding:11px;background:#2563eb;border:0;border-radius:8px;color:#fff;font-size:15px}
.msg{margin-top:14px;color:#34d399}.err{color:#f87171}</style>
<div class="box"><h1>远程防控 · 安装向导</h1>
<div class="card"><form method="post" action="/save">
<input type="hidden" name="publicKey" value="${PUB.replace(/"/g, '&quot;')}">
<label>本机公网 IP（被控服务器 IP）</label><input name="selfIp" placeholder="例如 1.2.3.4" required>
<label>卡密</label><input name="card" placeholder="签发的长串" required>
<label>中心端口</label><input name="port" value="8090">
<label>访问 token</label><input name="token" placeholder="自己设一个">
<label>SSH 用户</label><input name="user" value="root">
<label>SSH 私钥路径（可空）</label><input name="key">
<button>保存配置</button></form>
<div id="m" class="msg"></div></div></div>
<script>
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = new FormData(e.target)
  const r = await fetch('/save', { method: 'POST', body: new URLSearchParams(f) })
  const j = await r.json(); const m = document.getElementById('m')
  m.className = j.ok ? 'msg' : 'err'; m.textContent = j.ok ? '已保存，下一步启动 hub.mjs' : (j.error || '保存失败')
})
</script></html>`

function body(req) {
  return new Promise((resolve) => { let b = ''; req.on('data', (c) => { b += c }); req.on('end', () => resolve(b)) })
}

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return
  }
  if (req.method === 'POST' && req.url === '/save') {
    try {
      const f = new URLSearchParams(await body(req))
      const cfgPath = join(DIR, 'config.json')
      let cfg = {}
      try { cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) } catch { cfg = {} }
      cfg.hub = Object.assign({}, cfg.hub, {
        port: Number(f.get('port') || 8090),
        bind: '127.0.0.1',
        token: String(f.get('token') || ''),
      })
      cfg.ssh = Object.assign({ user: 'root', key: '', timeout: 8000 }, cfg.ssh, {
        user: String(f.get('user') || 'root'),
        key: String(f.get('key') || ''),
      })
      cfg.license = {
        publicKey: String(f.get('publicKey') || ''),
        card: String(f.get('card') || ''),
        selfIp: String(f.get('selfIp') || ''),
        whitelistPath: './whitelist.json',
      }
      cfg.hosts = cfg.hosts || []
      writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true })); return
    } catch (e) {
      res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: String(e.message) }))
    }
  }
  res.writeHead(404); res.end('not found')
}).listen(PORT, '127.0.0.1', () => {
  console.log('wizard on http://127.0.0.1:' + PORT)
  try { execFileSync('cmd', ['/c', 'start', 'http://127.0.0.1:' + PORT]) } catch { /* ignore */ }
})
