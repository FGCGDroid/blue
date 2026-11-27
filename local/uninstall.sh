#!/usr/bin/env bash
# 卸载单机防护
set -uo pipefail
CONF="${1:-}"
[ -z "$CONF" ] && { echo "用法: bash uninstall.sh /etc/nginx/sites-available/站点.conf"; exit 1; }
[ -f "$CONF" ] || { echo "配置不存在: $CONF"; exit 1; }

sed -i '/blue-local\/locations.conf/d' "$CONF"
rm -rf /etc/nginx/blue-local
rm -f /etc/nginx/conf.d/blue-local-zones.conf
rm -f /etc/fail2ban/jail.d/blue-local.local
rm -f /etc/fail2ban/filter.d/nginx-login.conf /etc/fail2ban/filter.d/nginx-scanner-ua.conf
rm -f /var/log/nginx/blue-honeypot.log

if nginx -t >/dev/null 2>&1; then systemctl reload nginx; else echo "nginx 校验失败，请检查 $CONF"; fi
command -v fail2ban-client >/dev/null 2>&1 && systemctl restart fail2ban
if command -v nft >/dev/null 2>&1; then nft delete table inet blue_local 2>/dev/null || true; fi

echo "已卸载。备份文件保留在 $CONF.bak.*"
