#!/usr/bin/env bash
# 无人值守防御组安装：nftables TTL 封禁 + blue-agent systemd。
# 用法：sudo bash install-unattended.sh URL token ENG-xxx /www/wwwlogs/site.log "1.2.3.4,10.0.0.0/8" [enforce]
set -euo pipefail

URL="${1:?DSH URL}"
TOKEN="${2:?collector token}"
ENGAGEMENT="${3:?engagement id}"
LOG="${4:-/www/wwwlogs/access.log}"
ALLOW="${5:-}"
MODE="${6:-dry-run}"
DIR=/opt/blue-agent

if [ "$(id -u)" -ne 0 ]; then
  echo "需要 root：sudo bash install-unattended.sh ..." >&2
  exit 1
fi
if ! command -v nft >/dev/null 2>&1; then
  echo "缺少 nftables；先安装 nftables" >&2
  exit 1
fi

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(ls -1 /www/server/nodejs/*/bin/node 2>/dev/null | tail -1 || true)"
fi
if [ -z "$NODE_BIN" ]; then
  echo "缺少 node；宝塔可在软件商店安装 Node.js，或设置 NODE_BIN" >&2
  exit 1
fi

mkdir -p "$DIR" /etc/blue-agent
# 只备份一次，避免覆盖最初状态。
[ -f /etc/blue-agent/nftables.backup ] || nft list ruleset > /etc/blue-agent/nftables.backup || true

# 创建独立 table/set/chain；已存在则跳过。
nft list table inet blue_guard >/dev/null 2>&1 || nft add table inet blue_guard
nft list set inet blue_guard blocked >/dev/null 2>&1 || nft add set inet blue_guard blocked '{ type ipv4_addr; flags timeout; timeout 600s; }'
nft list chain inet blue_guard input >/dev/null 2>&1 || nft add chain inet blue_guard input '{ type filter hook input priority -10; policy accept; }'
if ! nft list chain inet blue_guard input 2>/dev/null | grep -q '@blocked'; then
  nft add rule inet blue_guard input tcp dport '{ 80, 443 }' ip saddr @blocked drop
fi

# 不再下载 collector；agent 已由远程部署上传。
if [ ! -f /tmp/blue-agent.mjs ]; then
  echo "缺少 /tmp/blue-agent.mjs；请用 blue_remote unattended 部署" >&2
  exit 3
fi
mv /tmp/blue-agent.mjs "$DIR/blue-agent.mjs"
chmod 755 "$DIR/blue-agent.mjs"

cat > /etc/blue-agent/agent.env <<EOF
BLUE_AGENT_URL=$URL
BLUE_AGENT_TOKEN=$TOKEN
BLUE_AGENT_ENGAGEMENT=$ENGAGEMENT
BLUE_AGENT_LOG=$LOG
BLUE_AGENT_ALLOW_IPS=$ALLOW
EOF
chmod 600 /etc/blue-agent/agent.env

EXTRA=""
[ "$MODE" = "enforce" ] && EXTRA="--enforce"
cat > /etc/systemd/system/blue-agent.service <<EOF
[Unit]
Description=DSH Blue Team unattended defense agent
After=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/blue-agent/agent.env
ExecStart=$NODE_BIN $DIR/blue-agent.mjs --url \$BLUE_AGENT_URL --token \$BLUE_AGENT_TOKEN --engagement \$BLUE_AGENT_ENGAGEMENT --log \$BLUE_AGENT_LOG --allow-ips "\$BLUE_AGENT_ALLOW_IPS" $EXTRA
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now blue-agent
echo "已安装 blue-agent；mode=$MODE"
echo "查看：systemctl status blue-agent && tail -f /var/log/blue-agent.log"

cat > "$DIR/uninstall.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
systemctl disable --now blue-agent 2>/dev/null || true
rm -f /etc/systemd/system/blue-agent.service
systemctl daemon-reload
nft delete table inet blue_guard 2>/dev/null || true
rm -rf /opt/blue-agent /etc/blue-agent
echo "blue-agent 已卸载；nftables 只删除 blue_guard 表"
EOF
chmod 755 "$DIR/uninstall.sh"
echo "卸载：bash $DIR/uninstall.sh"
