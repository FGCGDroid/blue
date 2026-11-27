# 远程防控（初版）

一台机器做中心，SSH 拉取其它服务器的状态，SQLite 存样本，异常推钉钉，只读网页看总览。

不依赖 DSH、不依赖任何 npm 包。

## 组成

```text
hub.mjs       中心：定时采集 + 检测 + 钉钉 + 网页
collect.mjs   SSH 采集脚本
config.json   配置
hub.db        SQLite（自动创建）
```

## 部署

```bash
mkdir -p /opt/blue-remote
cp -r remote/* /opt/blue-remote/
cd /opt/blue-remote
cp config.example.json config.json
# 改 config.json：ssh.key、hosts、dingtalk.webhook
node --version   # 需要 22+
node hub.mjs --once   # 先跑一次看结果
node hub.mjs          # 常驻
```

## 被控机要求

```text
一个能 SSH 的只读/普通账号即可（建议非 root）
能读 /var/log/nginx/access.log、/var/log/auth.log
装了 curl、fail2ban 可选
```

中心机生成密钥并分发：

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519_hub -N ''
ssh-copy-id -i /root/.ssh/id_ed25519_hub.pub root@10.0.0.11
```

## 系统服务

```ini
[Unit]
Description=Blue remote hub
After=network.target

[Service]
WorkingDirectory=/opt/blue-remote
ExecStart=/usr/bin/node hub.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now blue-remote
```

## 看页面

```text
http://127.0.0.1:8090/?token=change-me
```

默认只监听 127.0.0.1，远程看用 SSH 隧道：

```bash
ssh -L 8090:127.0.0.1:8090 root@中心机
```

## 检测项

```text
主机不可达        SSH 失败
站点非 200       配置了 siteUrl 才检查
负载 > 4
磁盘 > 85%
5xx > 20（最近 2000 条）
SSH 失败突增 +20
封禁突增 +30
```

同类告警 10 分钟内只发一次。

## 限制（初版）

```text
只读，不执行任何远程命令
SSH 串行采集，机器多会慢
浏览器/日志格式变化可能漏采
没有历史图表、没有账号体系
```

后续可以加：并发采集、趋势图、多用户、Webhook 通用化。
