---
name: threat-hunting
description: 【狩猎】假设驱动的威胁狩猎：数据源选择、假设模板、异常进程/账号/网络/持久化排查与结论分级
whenToUse: 告警不足、需要主动找失陷痕迹、或事件后确认是否还有残留时
role: hunt
category: 狩猎
tags: [hunting, hypothesis, mitre]
enabled: true
---

# 威胁狩猎

## 原则
- 先写**可证伪的假设**，再找数据验证；不要“漫无目的翻日志”。
- 每条假设写：入口 → 条件 → 预期证据 → 失败信号 → 替代路径。
- 覆盖“没有告警”的盲区：合法工具滥用、内存马、计划任务、账号滥用。

## 假设模板
1. 攻击者已通过上传点落地 WebShell：查上传目录 mtime、Web 进程子进程、异常 URL 200。
2. 攻击者已用窃取凭据横向：查 4624 Type 3/10、SSH Accepted、RDP 来源、PsExec/WMI。
3. 攻击者已持久化：查计划任务、服务、启动项、crontab、authorized_keys、WMI 订阅。
4. 攻击者已外带数据：查大流量出站、DNS 长域名、云盘/邮件、压缩命令。
5. 攻击者已清痕迹：查日志缺口、审计服务停止、文件 mtime 异常、历史命令清空。

## 数据源
| 问题 | 数据 |
| --- | --- |
| 谁进来了 | Web access、VPN、SSH/RDP、EDR 登录 |
| 怎么进来的 | 上传/反序列化/弱口令/漏洞请求 |
| 留下什么 | 文件、进程、服务、计划任务、账号、注册表 |
| 去哪了 | 网络连接、DNS、代理、隧道、云 API |
| 拿了什么 | 数据库查询、文件访问、压缩/外带 |

## Windows 快查
```powershell
Get-CimInstance Win32_Process | Select ProcessId,ParentProcessId,Name,CommandLine
Get-Service | Where-Object {$_.Status -eq 'Running'} | Select Name,DisplayName,PathName
Get-ScheduledTask | Where-Object {$_.State -ne 'Disabled'} | Select TaskName,TaskPath
Get-LocalUser | Select Name,Enabled,LastLogon
netstat -ano | findstr ESTABLISHED
```
关注：`w3wp.exe`/`php-cgi.exe`/`java.exe` 拉起 `cmd.exe`/`powershell.exe`；`Temp` 下可执行文件；服务路径指向用户目录。

## Linux 快查
```bash
ps -eo pid,ppid,user,lstart,cmd --sort=start_time
ss -lntup; ss -ntp state established
crontab -l; ls -la /etc/cron.*; systemctl list-units --type=service --state=running
last -a | head -30; getent passwd; getent group sudo
find /tmp /dev/shm /var/tmp -type f -perm -111 -mtime -7 2>/dev/null
```

## 结论分级
- 已证实：有直接证据（文件内容、命令回显、登录成功记录）。
- 高度可能：多源间接证据一致，但缺关键一环。
- 线索：单一异常，需进一步验证。
每条都落 `blue_finding_add`，写清证据位置与时间。

## 覆盖说明
没命中也要写“查过哪些主机/时间窗/数据源”，否则无法证明做过。
