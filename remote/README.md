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

## 一键安装

```bash
cd remote
bash install.sh
```

脚本会问端口、token、钉钉、被控机，自动装 sshpass（密码模式）、写配置、装 systemd、跑一次验证。

本机也想监控的话，被控机填 `127.0.0.1`，认证方式选 password，填本机 root 密码即可。

## 认证方式

```text
key       推荐，中心机生成密钥后 ssh-copy-id 到被控机
password  适合不会配密钥的人，需要 sshpass
          密码明文存在 config.json（600 权限）
```

密码模式的配置：

```json
"hosts": [
  { "name": "web-1", "host": "10.0.0.11", "user": "root", "password": "***" }
]
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

## 自动防御

配置里打开：

```json
"defense": { "enabled": true, "autoBan": true, "maxPerCycle": 10, "ttl": "24h", "ignore": ["你的IP"] }
```

中心首次采集时会在被控机做一次初始化：

```
创建 nft 表 blue_remote + blocked 集合
入站流量命中集合直接 drop
写入 fail2ban sshd 规则（3 次/小时封 24 小时）
```

之后每个周期：

```
5xx 超阈值 或 SSH 失败突增
  → 从被控机 nginx 日志取 403/401/444 最多的 IP
  → 排除内网和 ignore 列表
  → 远端 nft 封禁 TTL
  → 记录到 bans 表 + 钉钉告警
```

只封 IPv4，只动 blue_remote 表，不碰已有防火墙规则。

## 网页层防御（可选）

在 host 配置里加：

```json
{ "nginxConf": "/etc/nginx/sites-available/site.conf" }
```

并把 `defense.web.enabled` 设为 true，首次采集会：

```
写 /etc/nginx/conf.d/blue-zones.conf（限速 zone）
写 /etc/nginx/blue-remote/locations.conf
  /.env、/.git/、*.sql/*.bak/*.zip 等 → 404
  /wp-login.php、/xmlrpc.php → 404
  /adminlog、/adminlog/login → 假登录页（记 blue-honeypot.log）
在站点配置 server_name 后插入 include
nginx -t 失败自动回滚
```

默认关闭，因为要改被控机 nginx 配置；开启前会留 `.bak.blue` 备份。

## WAF

ModSecurity 需要装 libmodsecurity3 + nginx 连接器，包和版本因发行版而异，自动装容易把 nginx 弄坏，这一项没做自动化，建议手工装好后再让中心只做监控和封禁。

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
