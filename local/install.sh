#!/usr/bin/env bash
# 单机一键防护：nginx 诱饵 + 假后台 + fail2ban + nft
set -euo pipefail

CONF="${1:-}"
if [ -z "$CONF" ]; then
  echo "用法: bash install.sh /etc/nginx/sites-available/你的站点.conf"
  echo "不知道路径可以跑: nginx -T | grep -B2 server_name"
  exit 1
fi
if [ ! -f "$CONF" ]; then echo "配置不存在: $CONF"; exit 1; fi

need() { command -v "$1" >/dev/null 2>&1; }
say() { printf '%s\n' "$*"; }

say "== 检查依赖 =="
need nginx || { echo "没装 nginx"; exit 1; }
need nft || echo "警告: 没有 nft，跳过 nft 部分"
need fail2ban-client || echo "警告: 没有 fail2ban，跳过 fail2ban 部分"

STAMP=$(date +%Y%m%d-%H%M%S)
say "== 备份 $CONF =="
cp -n "$CONF" "$CONF.bak.$STAMP" || true

say "== 写诱饵和假后台 =="
mkdir -p /etc/nginx/blue-local
cat > /etc/nginx/blue-local/honeypot.html <<'H'
<!doctype html><html lang="zh"><meta charset="utf-8"><title>管理员登录</title>
<style>body{background:#0b1220;color:#dbe4f0;font:14px system-ui;display:flex;justify-content:center;padding-top:12vh}
.box{background:#111c2e;border:1px solid #1e2b44;border-radius:12px;padding:22px;width:320px}
input{width:100%;margin:8px 0;padding:8px;background:#0b1626;border:1px solid #2a3b57;border-radius:6px;color:#e6eefc}
button{width:100%;padding:9px;background:#2563eb;color:#fff;border:0;border-radius:6px}</style>
<div class="box"><h3>管理员登录</h3><form method="post" action="/adminlog/login">
<input name="username" placeholder="用户名"><input name="password" type="password" placeholder="密码">
<button>登录</button></form></div></html>
H

cat > /etc/nginx/blue-local/locations.conf <<'L'
location = /.env { return 404; }
location ^~ /.git/ { return 404; }
location ~* \.(sql|bak|old|swp|zip|tar|gz|7z|rar)$ { return 404; }
location = /wp-login.php { return 404; }
location = /xmlrpc.php { return 404; }
location = /adminlog {
  default_type text/html;
  alias /etc/nginx/blue-local/honeypot.html;
  access_log /var/log/nginx/blue-honeypot.log;
}
location = /adminlog/login {
  limit_req zone=blue_login burst=5 nodelay;
  default_type text/html;
  alias /etc/nginx/blue-local/honeypot.html;
  access_log /var/log/nginx/blue-honeypot.log;
}
L

if [ ! -f /etc/nginx/conf.d/blue-local-zones.conf ]; then
cat > /etc/nginx/conf.d/blue-local-zones.conf <<'Z'
limit_req_zone $binary_remote_addr zone=blue_login:10m rate=10r/m;
Z
fi

if ! grep -q 'blue-local/locations.conf' "$CONF"; then
  sed -i '/server_name/a\    include /etc/nginx/blue-local/locations.conf;' "$CONF"
fi

say "== nginx 校验 =="
if ! nginx -t; then
  say "校验失败，回滚"
  cp "$CONF.bak.$STAMP" "$CONF"
  exit 1
fi
systemctl reload nginx

if need fail2ban-client && [ -d /etc/fail2ban ]; then
  say "== 写 fail2ban 规则 =="
  cat > /etc/fail2ban/filter.d/nginx-login.conf <<'F'
[Definition]
failregex = ^<HOST> .* "(POST|GET) /(login|admin|adminlog/login).*" (401|403)
ignoreregex =
F
  cat > /etc/fail2ban/filter.d/nginx-scanner-ua.conf <<'F'
[Definition]
failregex = ^<HOST> .* "(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|hydra)
ignoreregex =
F
  cat > /etc/fail2ban/jail.d/blue-local.local <<'J'
[sshd]
enabled = true
maxretry = 3
findtime = 3600
bantime = 86400

[nginx-login]
enabled = true
filter = nginx-login
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime = 3600

[nginx-scanner-ua]
enabled = true
filter = nginx-scanner-ua
logpath = /var/log/nginx/access.log
maxretry = 3
findtime = 300
bantime = 86400
J
  fail2ban-client reload >/dev/null 2>&1 || systemctl restart fail2ban
fi

if need nft; then
  say "== 建 nft 封禁表 =="
  if ! nft list table inet blue_local >/dev/null 2>&1; then
    nft add table inet blue_local
    nft add set inet blue_local blocked '{ type ipv4_addr; flags timeout; }'
    nft add chain inet blue_local input '{ type filter hook input priority -10; policy accept; }'
    nft add rule inet blue_local input ip saddr @blocked drop
  fi
fi

say "== 完成 =="
say "诱饵: /.env /.git/ *.sql *.bak *.zip /wp-login.php /xmlrpc.php"
say "假后台: /adminlog  日志: /var/log/nginx/blue-honeypot.log"
say "回滚: cp $CONF.bak.$STAMP $CONF && systemctl reload nginx"
say "卸载: bash uninstall.sh $CONF"
