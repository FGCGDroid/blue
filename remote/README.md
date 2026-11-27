# 远程防控中心

一台机器做中心，SSH 拉取其它服务器的状态，SQLite 存样本，异常推钉钉，能自动封 IP、加诱饵、放假后台，还带一个只读网页。

不依赖 DSH，不依赖 npm 包，Node 22+ 就能跑。

---

## 一、它能做什么

```text
采集      每台被控机的负载、磁盘、站点状态、5xx、SSH 失败、封禁数
检测      站点挂了、负载高、磁盘满、5xx 多、SSH 被爆破、封禁突增
告警      钉钉，带机器名和事件，同类 10 分钟只发一次
封禁      nft 表 + fail2ban，自动封 403/401 高频 IP
网页层    404 诱饵、假登录页、登录限速（可选）
展示      127.0.0.1 上的只读页面和 JSON 接口
```

## 二、它不能做什么

```text
不能装 WAF（ModSecurity 需手工装）
不能代替云清洗，DDoS 还是靠阿里云/高防
不执行任何非防御类命令
不做多用户、不做权限体系
没有历史图表
```

---

## 三、架构

```text
中心机（装 Node 22+）
  hub.mjs       调度、检测、告警、网页
  collect.mjs   通过 SSH 在被控机跑只读脚本
  defend.mjs    nft / fail2ban / 自动封禁
  webdefend.mjs 写 nginx 诱饵配置
  hub.db        SQLite

被控机（N 台）
  只需要 SSH 可达
  不需要装 agent、不用开端口
```

中心只主动连被控机，被控机不反向连中心。

---

## 四、文件说明

```text
hub.mjs                 主程序：定时采集、检测、告警、HTTP 页面
collect.mjs             SSH 采集脚本（只读）
defend.mjs              nft 表、fail2ban、封禁/解封
webdefend.mjs           nginx 诱饵、假登录页、限速
setup.mjs               Windows/交互式配置向导
启动.bat                Windows 双击启动（无配置时进向导）
install.sh              Linux/macOS 一键安装
config.example.json     配置模板
profiles/qinglan/       青岚社区同款配置模板
hub.db                  运行后生成
config.json             向导或手工生成
```

---

## 五、环境要求

```text
中心机
  Node.js 22 或更高
  ssh 客户端（Windows 10+ 自带）
  可选 sshpass（密码模式）
  可选钉钉机器人 webhook

被控机
  sshd 可达
  一个能读日志的账号（建议非 root）
  可选 curl、fail2ban、nftables
```

检查版本：

```bash
node --version
ssh -V
```

---

## 六、Windows 安装

```text
1. 解压 zip
2. 双击 启动.bat
3. 第一次会进向导，按提示填
4. 填完自动启动，窗口里会打印页面地址
```

关闭窗口 = 停止。要开机自启，用任务计划程序指向 `启动.bat`。

## 七、Linux 安装

```bash
cd remote
bash install.sh
```

脚本会：

```text
检查 Node 版本
需要时装 sshpass
问端口、token、钉钉、被控机
写 /opt/blue-remote/config.json（600）
装 systemd 服务 blue-remote
跑一次采集验证
```

---

## 八、配置字段

```json
{
  "hub": { "port": 8090, "bind": "127.0.0.1", "token": "xxx" },
  "db": "./hub.db",
  "intervalSec": 120,
  "cooldownSec": 600,
  "ssh": { "user": "root", "key": "/root/.ssh/id_ed25519", "timeout": 8000 },
  "dingtalk": { "webhook": "", "keyword": "蓝队汇报" },
  "thresholds": { "load": 4, "disk": 85, "e5": 20, "authDelta": 20, "banDelta": 30 },
  "defense": { "enabled": false, "autoBan": false, "maxPerCycle": 10, "ttl": "24h", "ignore": [], "web": { "enabled": false } },
  "hosts": []
}
```

### hub

```text
port           网页端口，默认 8090
bind           监听地址，默认 127.0.0.1（别改成 0.0.0.0）
token          完整口令，能看能解封
readonlyToken  只读口令，只能看，不能解封（可空）
```

### db

```text
SQLite 文件路径，相对路径按启动目录算
```

### intervalSec

```text
采集间隔，默认 120 秒
机器多时别调太小，SSH 是串行的
```

### cooldownSec

```text
同类告警冷却，默认 600 秒
```

### ssh

```text
user        默认 SSH 用户
key         私钥路径，密码模式可留空
timeout     单台超时毫秒，默认 8000
```

### dingtalk

```text
webhook     机器人地址，留空就不发告警
keyword     机器人关键词，必须出现在消息里
```

### thresholds

```text
load        负载阈值，超过告警
disk        磁盘百分比
e5          最近 2000 条里的 5xx 数量
authDelta   两次采集之间 SSH 失败增量
banDelta    两次采集之间封禁增量
```

### defense

```text
enabled      总开关
autoInstall  缺少 nftables/fail2ban 时自动安装（需在向导里确认）
autoBan      自动封禁
maxPerCycle 每轮最多封几个
ttl         封禁时长，如 24h / 1h / 30m
ignore      永不封的 IP 列表
web.enabled 是否部署网页诱饵（需要 host.nginxConf）
```

### hosts

```json
{
  "name": "web-1",
  "host": "10.0.0.11",
  "port": 22,
  "user": "root",
  "password": "可选",
  "siteUrl": "https://example.com/",
  "hostHeader": "example.com",
  "nginxConf": "/etc/nginx/sites-available/example.conf"
}
```

```text
name        显示名，也是唯一键
host        IP 或域名
port        SSH 端口
user        SSH 用户
password    填了就走密码模式，不填用 key
siteUrl     站点检查地址，留空不检查
hostHeader  站点检查时发的 Host 头
nginxConf   网页诱饵要改的 nginx 配置路径
```

---

## 九、采集内容

中心通过 SSH 在被控机执行一段只读脚本，拿回：

```text
load        /proc/loadavg 1 分钟负载
disk        df -P / 使用率
uptime      /proc/uptime
req         nginx access.log 最近 2000 条数量
e5          其中 5xx 数量
authfail    auth.log 里 Failed password / Invalid user 次数
bans        fail2ban-client banned 的数量
site        curl 本机站点返回码
```

被控机没有 nginx、auth.log、fail2ban 时对应项为 0，不报错。

### 能力探测

每轮采集会同时探测并缓存：

```text
nft         有没有 nftables
fail2ban    有没有 fail2ban-client
authlog     有没有 /var/log/auth.log
journald    有没有 journalctl（auth.log 缺失时用它数失败）
nginx       有没有 nginx
```

大屏主机卡底部会显示这些能力。自动防御按能力降级：

```text
没有 nft       跳过 nft 初始化
没有 fail2ban  跳过 jail 写入
两个都没有     直接跳过，只监控不封禁
```

---

## 十、检测与告警

| 条件 | 级别 | 说明 |
| --- | --- | --- |
| SSH 连不上 | down | 主机不可达 |
| site 非 200 | site | 只在填了 siteUrl 时 |
| load > thresholds.load | load | 持续高负载 |
| disk > thresholds.disk | disk | 磁盘快满 |
| e5 > thresholds.e5 | 5xx | 应用报错 |
| auth 增量 > authDelta | auth | 被爆破 |
| bans 增量 > banDelta | ban | 封禁突增 |

同一台机器同一类型 10 分钟内只发一次。

---

## 十一、自动防御流程

安装时向导会探测每台被控机缺少什么，逐项问：

```text
web-1: 缺少 nftables / fail2ban
  安装 nftables？(y/n)
  安装 fail2ban？(y/n)
```

选 y 会写进 host.install，中心首轮安装后再初始化防御。

第一轮采集时：

```text
1. 如果 defense.web.enabled 且 host.nginxConf 有值
   → 写 zones.conf、locations.conf、honeypot.html
   → 在 server_name 后插入 include
   → nginx -t，失败自动回滚
2. 创建 nft 表 blue_remote 和 blocked 集合
3. 入站命中 blocked 直接 drop
4. 如果装了 fail2ban，写 sshd 规则
```

之后每轮：

```text
e5 超阈值 或 SSH 失败突增
  → 读被控机 nginx 日志里 403/401/444 最多的 IP
  → 排除内网段和 ignore
  → 远端 nft 封禁 TTL
  → 写 bans 表
  → 发钉钉
```

安全设计：

```text
只动自己的 blue_remote 表
只封 IPv4
自动跳过 10./192.168./172.16-31./127.
封禁带超时，到期自动解
```

---

## 十二、网页诱饵做了什么

```text
/.env                          404
/.git/                         404
*.sql *.bak *.zip *.old *.swp  404
/wp-login.php /xmlrpc.php      404
/adminlog                      假登录页，写 blue-honeypot.log
/adminlog/login                假登录页 + 10 次/分钟限速
```

假登录页只是一个 HTML，没有后端，提交也不会成功。

---

## 十三、解封、审计与数据保留

解封两种方式：

```text
页面「当前封禁」里点「解封」
POST /api/unban {"host":"web-1","ip":"1.2.3.4"}，带 token
```

解封会做三件事：

```
远端 nft / fail2ban 移除
bans 表标记 active=0
写一条 audit
```

审计：

```
所有自动封禁、手动解封都记 audit（时间、动作、目标、详情、结果）
页面「最近操作」显示最近 15 条
```

数据保留：

```json
"retentionDays": 30
```

每轮清理超过 30 天的 samples、alerts，以及已失效的 bans。

## 十四、外部接入

### CrowdSec

被控机装了 CrowdSec（有 cscli）会自动识别：

```text
采集   当前决策数量，大屏显示「CS决策」
告警   决策数突增 20 条以上
封禁   自动封禁同时写 cscli decisions add
解封   同时 cscli decisions delete
```

### Uptime Kuma

配置：

```json
"integrations": { "uptimeKuma": { "baseUrl": "http://1.2.3.4:3001", "slug": "default" } }
```

每轮拉心跳，有异常推钉钉，大屏「外部接入」显示正常/异常数量。

### 通用 Webhook（Wazuh 等）

```bash
curl -X POST 'http://127.0.0.1:8090/ingest?token=你的token' \
  -H 'content-type: application/json' \
  -d '{"source":"wazuh","host":"web-1","severity":"high","message":"ssh brute force"}'
```

```text
写 events 表，大屏「最近事件」显示
severity 为 high / critical 时直接推钉钉
Wazuh、Grafana、自建脚本都能往这里发
```

## 十五、安全大屏

打开：

```
http://127.0.0.1:8090/?token=xxx
```

深色大屏，30 秒自动刷新：

```
顶部四个 KPI：在线主机 / 离线主机 / 24h 告警 / 封禁中（含平均负载）
每台主机一张卡：站点码、负载、磁盘、5xx、SSH 失败、封禁数、负载曲线
底部两块：最近告警、当前封禁列表
```

## 页面和接口

```text
http://127.0.0.1:8090/?token=xxx          总览表格
http://127.0.0.1:8090/api/state?token=xxx JSON
```

页面显示：

```text
名称、地址、状态、负载、磁盘、站点、5xx、SSH 失败、封禁数、时间、封禁计数、最近告警
```

远程访问用 SSH 隧道：

```bash
ssh -L 8090:127.0.0.1:8090 root@中心机
```

---

## 十七、systemd

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
systemctl daemon-reload
systemctl enable --now blue-remote
journalctl -u blue-remote -f
```

---

## 十八、配置模板

`profiles/qinglan/` 是青岚社区在用的参数：

```text
zones.conf                    限速 zone
locations.conf                404 诱饵 + 假登录页
fail2ban-blue.local           sshd / nginx-login / scanner-ua
config.qinglan.example.json   中心配置示例
README.md                     套用步骤
```

---

## 十九、常见问题

**向导卡住或乱序**

```text
交互模式用键盘输入
管道模式按行喂，一行一个答案
```

**密码模式连不上**

```text
apt install sshpass
或者改用密钥
```

**网页诱饵没生效**

```text
nginxConf 路径不对，先 nginx -T 找站点配置
或者 server_name 不在文件里，include 插错位置
nginx -t 失败会自动回滚
```

**告警没收到**

```text
webhook 是否为空
钉钉机器人关键词是否和 keyword 一致
机器人是否在目标群
```

**采集很慢**

```text
机器多就调大 intervalSec
SSH 串行，100 台会明显慢
```

**页面打不开**

```text
默认只监听 127.0.0.1
远程用 SSH 隧道，别直接放公网
```

---

## 二十、安全边界

```text
只读采集，不执行用户命令
封禁只操作 nft 的 blue_remote 表和 fail2ban
改 nginx 前备份 .bak.blue，nginx -t 失败回滚
config.json 含密码时权限 600
页面默认只听 127.0.0.1，必须带 token
只读 token 无法调用解封接口（403）
```

---

## 二十一、限制

```text
SSH 串行，机器多时慢
只支持 IPv4 封禁
日志格式变化可能漏采
没有历史图表、没有多用户
WAF 未自动化
```

---

## 二十二、后续计划

```text
并发采集
趋势图
告警渠道扩展（邮件、企业微信）
被控机一键接入脚本
```
