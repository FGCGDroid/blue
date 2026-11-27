#!/usr/bin/env bash
# 一键安装：本机或服务器都能跑，支持密钥/密码两种方式
set -euo pipefail
DIR=/opt/blue-remote
SRC=$(cd "$(dirname "$0")" && pwd)

say() { printf '%s\n' "$*"; }
ask() { local p="$1" d="$2" v; read -r -p "$p [$d]: " v || true; printf '%s' "${v:-$d}"; }

if ! command -v node >/dev/null 2>&1; then
  say "缺少 node，先装 Node.js 22+ 再跑"; exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 22 ]; then say "Node 版本太低（$NODE_MAJOR），需要 22+"; exit 1; fi

say "== 安装到 $DIR =="
mkdir -p "$DIR"
cp "$SRC/hub.mjs" "$SRC/collect.mjs" "$DIR/"

if ! command -v sshpass >/dev/null 2>&1; then
  say "== 没装 sshpass，密码模式需要它 =="
  if command -v apt-get >/dev/null 2>&1; then
    read -r -p "现在安装 sshpass？[Y/n]: " yn || true
    case "${yn:-Y}" in y|Y) apt-get update -qq && apt-get install -y -qq sshpass >/dev/null ;; esac
  fi
fi

if [ ! -f "$DIR/config.json" ]; then
  say "== 生成配置 =="
  PORT=$(ask "网页端口" "8090")
  TOKEN=$(ask "网页访问 token（留空自动生成）" "$(head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)")
  WEBHOOK=$(ask "钉钉 webhook（可留空）" "")
  KEYWORD=$(ask "钉钉关键词" "蓝队汇报")
  say ""
  say "== 添加被控机（直接回车结束）=="
  HOSTS_JSON='[]'
  while true; do
    NAME=$(ask "名称（回车结束）" "")
    [ -z "$NAME" ] && break
    HOST=$(ask "地址" "")
    [ -z "$HOST" ] && break
    HPORT=$(ask "SSH 端口" "22")
    HUSER=$(ask "SSH 用户" "root")
    AUTH=$(ask "认证方式 key/password" "key")
    UPASS=""
    if [ "$AUTH" = "password" ]; then UPASS=$(ask "SSH 密码" ""); fi
    SITE=$(ask "站点地址（可空，如 https://example.com/）" "")
    HOSTS_JSON=$(HOSTS_JSON="$HOSTS_JSON" NAME="$NAME" HOST="$HOST" HPORT="$HPORT" HUSER="$HUSER" UPASS="$UPASS" SITE="$SITE" node -e '
      const h = JSON.parse(process.env.HOSTS_JSON)
      const o = { name: process.env.NAME, host: process.env.HOST, port: Number(process.env.HPORT), user: process.env.HUSER }
      if (process.env.UPASS) o.password = process.env.UPASS
      if (process.env.SITE) { o.siteUrl = process.env.SITE; o.hostHeader = new URL(process.env.SITE).hostname }
      h.push(o); console.log(JSON.stringify(h))')
  done
  KEYPATH=$(ask "SSH 私钥路径（密码模式可留空）" "/root/.ssh/id_ed25519")
  HOSTS_JSON="$HOSTS_JSON" PORT="$PORT" TOKEN="$TOKEN" WEBHOOK="$WEBHOOK" KEYWORD="$KEYWORD" KEYPATH="$KEYPATH" node -e '
    const fs = require("fs")
    const cfg = {
      hub: { port: Number(process.env.PORT), bind: "127.0.0.1", token: process.env.TOKEN },
      db: "/opt/blue-remote/hub.db",
      intervalSec: 120, cooldownSec: 600,
      ssh: { user: "root", key: process.env.KEYPATH || "", timeout: 8000 },
      dingtalk: { webhook: process.env.WEBHOOK || "", keyword: process.env.KEYWORD },
      thresholds: { load: 4, disk: 85, e5: 20, authDelta: 20, banDelta: 30 },
      hosts: JSON.parse(process.env.HOSTS_JSON),
    }
    fs.writeFileSync("/opt/blue-remote/config.json", JSON.stringify(cfg, null, 2))
  ' 
  chmod 600 "$DIR/config.json"
  say "配置已写入 $DIR/config.json（含密码，权限 600）"
fi

say "== 先跑一次 =="
cd "$DIR"
node hub.mjs --once || true

say "== 安装 systemd =="
cat > /etc/systemd/system/blue-remote.service <<U
[Unit]
Description=Blue remote hub
After=network.target

[Service]
WorkingDirectory=$DIR
ExecStart=$(command -v node) hub.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
U
systemctl daemon-reload
systemctl enable --now blue-remote >/dev/null 2>&1 || true
sleep 1
systemctl is-active blue-remote || true

PORT=$(node -p 'require("/opt/blue-remote/config.json").hub.port')
TOKEN_VAL=$(node -p 'require("/opt/blue-remote/config.json").hub.token')
say ""
say "完成。页面：http://127.0.0.1:${PORT}/?token=${TOKEN_VAL}"
say "远程访问：ssh -L ${PORT}:127.0.0.1:${PORT} root@<这台机器>"
