---
name: log-analysis
description: 【日志】Web/系统/认证/安全设备日志分析：关键字段、攻击特征、时间线还原与误报判断
whenToUse: 需要从 access.log、auth.log、IIS、EDR、WAF、裁判系统日志里找攻击证据时
role: monitor
category: 日志
tags: [log, nginx, apache, iis, auth]
enabled: true
---

# 日志分析

## 先确认日志可信
- 时间是否同步（NTP）、时区是否一致、是否有轮转/截断。
- 攻击者可能清日志：检查 `last -x`、登录记录、日志文件 mtime、审计服务是否被停。
- 优先使用只读副本，原始文件计算哈希。

## Web 访问日志关键字段
Nginx/Apache 常见 combined：
`remote_addr - user [time] "method uri protocol" status bytes "referer" "user_agent"`

重点看：
- 高频 404/403 的目录扫描；401/403 后突然 200。
- 超长 URL、编码字符（`%00`、`%2e%2e`、`%3cscript`）。
- POST 到上传/登录/接口路径；响应 200 且体积异常。
- 同一 IP 多路径、多 UA、短时间高并发。
- `../`、`union select`、`<script`、`/etc/passwd`、`cmd=`、`eval(`。

常用：
```bash
grep -Ei "union( |\\+)+(all( |\\+)+)?select|\\.\\./|%2e%2e|/etc/passwd|<script|eval\\(|base64_decode" access.log
awk '{print $1}' access.log | sort | uniq -c | sort -nr | head -20
grep " 200 " access.log | awk '{print $7}' | sort | uniq -c | sort -nr | head -30
```

## 认证日志
Linux `/var/log/auth.log` / `secure`：
- `Failed password`、`Invalid user`、`Accepted publickey/password`、`sudo:`。
- 失败后成功、异常来源、凌晨登录、新账号。
Windows 安全日志：
- 4624 登录（关注 LogonType 3/10）、4625 失败、4648 显式凭据、4672 特权、4720 建号、4732 加组。

## WAF/IDS
- 规则命中不等于成功：看后端是否返回 200、是否继续有利用请求。
- 关注被放行的编码变体、分块传输、超长 header。

## 分析产出
每条结论写：时间（UTC）、来源 IP、资产、请求/事件、判定（成功/失败/待验证）、证据行号。
用 `blue_log_scan` 快速筛，再用 `blue_finding_add` 落库。

## 误报控制
- CDN/负载均衡健康检查、内部扫描器、监控探针、搜索引擎爬虫。
- 业务正常的大文件上传/导入接口。
- 确认误报后写 `note`，不要直接删除日志。
