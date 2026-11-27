import { sshExec } from './defend.mjs'

const HONEYPOT_HTML = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>管理员登录</title>
<style>body{background:#0b1220;color:#dbe4f0;font:14px system-ui;display:flex;justify-content:center;padding-top:12vh}
.box{background:#111c2e;border:1px solid #1e2b44;border-radius:12px;padding:22px;width:320px}
input{width:100%;margin:8px 0;padding:8px;background:#0b1626;border:1px solid #2a3b57;border-radius:6px;color:#e6eefc}
button{width:100%;padding:9px;background:#2563eb;color:#fff;border:0;border-radius:6px}</style>
<div class="box"><h3>管理员登录</h3><form method="post" action="/adminlog/login">
<input name="username" placeholder="用户名"><input name="password" type="password" placeholder="密码">
<button>登录</button></form></div></html>`

function buildScript(conf, honeypot) {
  return `set -e
mkdir -p /etc/nginx/blue-remote
if [ ! -f /etc/nginx/conf.d/blue-zones.conf ]; then
cat > /etc/nginx/conf.d/blue-zones.conf <<'Z'
limit_req_zone $binary_remote_addr zone=blue_login:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=blue_scan:10m rate=30r/s;
Z
fi
cat > /etc/nginx/blue-remote/honeypot.html <<'H'
${honeypot}
H
cat > /etc/nginx/blue-remote/locations.conf <<'L'
location = /.env { return 404; }
location ^~ /.git/ { return 404; }
location ~* \\.(sql|bak|old|swp|zip|tar|gz|7z|rar)$ { return 404; }
location = /wp-login.php { return 404; }
location = /xmlrpc.php { return 404; }
location = /adminlog {
  default_type text/html;
  alias /etc/nginx/blue-remote/honeypot.html;
  access_log /var/log/nginx/blue-honeypot.log;
}
location = /adminlog/login {
  limit_req zone=blue_login burst=5 nodelay;
  default_type text/html;
  alias /etc/nginx/blue-remote/honeypot.html;
  access_log /var/log/nginx/blue-honeypot.log;
}
L
CONF='${conf}'
if [ ! -f "$CONF" ]; then echo NO_CONF; exit 1; fi
cp -n "$CONF" "$CONF.bak.blue" 2>/dev/null || true
if ! grep -q 'blue-remote/locations.conf' "$CONF"; then
  sed -i '0,/server_name/s//server_name/' "$CONF"
  sed -i '/server_name/a\\    include /etc/nginx/blue-remote/locations.conf;' "$CONF"
fi
if ! nginx -t >/tmp/blue-nginx-test 2>&1; then
  cp "$CONF.bak.blue" "$CONF" 2>/dev/null || true
  cat /tmp/blue-nginx-test
  exit 2
fi
nginx -s reload >/dev/null 2>&1 || systemctl reload nginx
echo WEB_OK`
}

export async function deployWeb(cfg, host) {
  if (!host.nginxConf) return { ok: false, error: '缺少 nginxConf 配置' }
  const r = await sshExec(cfg, host, buildScript(host.nginxConf, HONEYPOT_HTML), 25000)
  if (!r.ok) return r
  if (r.out.includes('NO_CONF')) return { ok: false, error: 'nginx 配置不存在' }
  return { ok: r.out.includes('WEB_OK'), error: r.out.includes('WEB_OK') ? '' : r.out.trim() }
}

export async function removeWeb(cfg, host) {
  if (!host.nginxConf) return { ok: false, error: '缺少 nginxConf' }
  const script = `CONF='${host.nginxConf}'
sed -i '/blue-remote\\/locations.conf/d' "$CONF" 2>/dev/null || true
nginx -t >/dev/null 2>&1 && nginx -s reload >/dev/null 2>&1 || true
echo REMOVED`
  return sshExec(cfg, host, script, 15000)
}
