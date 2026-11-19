#!/usr/bin/env bash
# 在 Linux 服务器上安装蓝队日志采集器为 systemd 服务。
# 用法：sudo bash install-collector.sh http://DSH:端口 <token> ENG-xxx /var/log/nginx/access.log
set -euo pipefail

URL="${1:?DSH URL}"
TOKEN="${2:?collector token}"
ENGAGEMENT="${3:?engagement id}"
LOG="${4:-/var/log/nginx/access.log}"
DIR=/opt/blue-collector

if [ "$(id -u)" -ne 0 ]; then
  echo "需要 root：sudo bash install-collector.sh ..." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "缺少 node（需要 Node.js 18+）" >&2
  exit 1
fi

mkdir -p "$DIR"
curl -fsSL "$URL/blue/collector.mjs" -o "$DIR/blue-collector.mjs"
cat > "$DIR/collector.env" <<EOF
BLUE_COLLECTOR_TOKEN=$TOKEN
BLUE_COLLECTOR_URL=$URL
BLUE_COLLECTOR_ENGAGEMENT=$ENGAGEMENT
BLUE_COLLECTOR_LOG=$LOG
EOF
chmod 600 "$DIR/collector.env"

cat > /etc/systemd/system/blue-collector.service <<EOF
[Unit]
Description=DSH Blue Team log collector
After=network-online.target

[Service]
Type=simple
EnvironmentFile=$DIR/collector.env
ExecStart=/usr/bin/env node $DIR/blue-collector.mjs --url \$BLUE_COLLECTOR_URL --engagement \$BLUE_COLLECTOR_ENGAGEMENT --log \$BLUE_COLLECTOR_LOG
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now blue-collector
echo "已安装：systemctl status blue-collector"
