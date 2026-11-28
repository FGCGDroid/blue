# 复刻清单：青岚这套防御栈

给要复刻的大佬看的。按顺序装，能跑出一套一样的。

## 1. 机器

```text
阿里云 ECS
Ubuntu 24.04.2 LTS
2 核 / 1 GB / 30 GB
公网 200 Mbps
```

## 2. 组件与版本

```text
nginx              1.24.0 (Ubuntu)
libmodsecurity3    3.0.12
modsecurity-crs    3.3.5
fail2ban           1.0.2
nftables           1.0.9
Node.js            24.9.0
Endlessh           2222 / 2223
SSH 蜜罐            2224
应用                /opt/qinglan/app.mjs（原生 node:http，无依赖）
代理                /opt/blue-agent（可选，DSH 汇报用）
```

## 3. 端口

| 端口 | 用途 |
| --- | --- |
| 80 | 跳 443 |
| 443 | 站点 |
| 8080 | 应用本机监听，nginx 反代 |
| 2222 | Endlessh |
| 2223 | Endlessh 第二个 |
| 2224 | 假 SSH 蜜罐 |
| 9080 | SSH 反向隧道，DSH agent 用（可选） |

## 4. 目录

```text
/etc/nginx/sites-available/blue-lab     站点配置
/etc/nginx/conf.d/                      限速 zone
/etc/nginx/modsec/                      ModSecurity 主配置与规则
/etc/fail2ban/jail.d/                   jail 配置
/etc/fail2ban/filter.d/                 filter
/opt/qinglan/
  app.mjs          主应用
  adminlog.mjs     假后台
  shelltrap.mjs    假提权 / 假数据库
  leaks.mjs        慢速假漏文件
  guestbook.js     留言板前端
  messages.json    数据
  sessions.json
  stats.json
  traffic.json
  rootlog.jsonl    蜜罐交互日志
/opt/blue-agent/   可选，DSH 汇报
```

## 5. 复刻顺序

### 5.1 系统依赖

```bash
apt update
apt install -y nginx libmodsecurity3 modsecurity-crs fail2ban nftables curl
```

### 5.2 nginx + ModSecurity

```text
在 nginx.conf 的 http 块加载 ModSecurity：
  modsecurity on;
  modsecurity_rules_file /etc/nginx/modsec/main.conf;
main.conf 里 Include CRS 的 crs-setup.conf 和 rules/*.conf
```

站点配置建议直接用：

```text
remote/profiles/qinglan/locations.conf   诱饵与假后台
remote/profiles/qinglan/zones.conf       限速 zone
```

### 5.3 应用

```text
把 /opt/qinglan 下的 mjs 文件放好
systemd 起 node app.mjs，监听 127.0.0.1:8080
nginx 反代到 8080
```

应用自己处理：

```text
留言板、搜索、标签、点赞、RSS
假后台 /adminlog 与子路径
假提权 /adminlog/root
慢速假漏文件 /.git /backup.sql 等
```

### 5.4 fail2ban

```text
jail：
  sshd              3 次/小时，封 24 小时
  nginx-login       5 次/10 分钟，封 1 小时
  nginx-scanner-ua  3 次/5 分钟，封 24 小时
  blue-decoy        命中诱饵路径即封
  nginx-nmap        扫描特征
```

filter 与 jail 模板见：

```text
local/install.sh          单机一键版
remote/profiles/qinglan/  完整示例
```

### 5.5 nftables

```bash
nft add table inet blue_guard
nft add set inet blue_guard blocked '{ type ipv4_addr; flags timeout; }'
nft add chain inet blue_guard input '{ type filter hook input priority -10; policy accept; }'
nft add rule inet blue_guard input ip saddr @blocked drop
```

### 5.6 蜜罐

```text
Endlessh   2222、2223
假 SSH     2224，用 node 或 socat 起
假后台     nginx 静态页 + /opt/qinglan 应用
```

### 5.7 告警（可选）

```text
blue-alert.service   每分钟检查站点/服务/负载/封禁
daily-report.sh      每天 9 点日报
```

通知支持钉钉、webhook、Bark、Telegram、飞书、Server酱、ntfy。

## 6. 验证

```bash
curl -sk https://127.0.0.1/ -H 'Host: 你的域名' -o /dev/null -w '%{http_code}\n'   # 200
curl -sk 'https://127.0.0.1/.env' -H 'Host: 你的域名' -o /dev/null -w '%{http_code}\n'  # 404
curl -sk 'https://127.0.0.1/?q=union%20select' -H 'Host: 你的域名' -o /dev/null -w '%{http_code}\n'  # 403
curl -sk 'https://127.0.0.1/adminlog' -H 'Host: 你的域名' -o /dev/null -w '%{http_code}\n'  # 200 假后台
```

## 7. 不含的东西

```text
真实数据库：没有
真实命令执行：没有
真实用户数据：没有
证书私钥、后台密码、SSH 私钥：不提供
```

## 8. 两个现成包

```text
blue-local-v1.zip     单机版：诱饵 + 假后台 + fail2ban + nft
blue-remote-v1.zip    远程版：一台中心监控多台，含决策层、agent、大屏
```

复刻按单机版起步，要集中管理再上远程版。
