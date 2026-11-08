---
name: memory-forensics
description: 【取证】内存取证：采集、Volatility3 插件、进程/网络/注入/凭据/恶意模块排查
whenToUse: 需要从内存镜像确认进程、网络连接、代码注入、内存马或凭据时
role: forensics
category: 取证
tags: [memory, volatility, malware]
enabled: true
---

# 内存取证

## 采集
- Windows：WinPmem / DumpIt / Magnet RAM Capture；尽量在隔离前采集。
- Linux：LiME、`avml`、`/proc/kcore`（谨慎）。
- 记录：主机名、时间、采集工具版本、镜像 SHA-256、内存大小。

## Volatility3 基本流程
```bash
vol -f mem.raw windows.info
vol -f mem.raw windows.pslist
vol -f mem.raw windows.pstree
vol -f mem.raw windows.netscan
vol -f mem.raw windows.cmdline
vol -f mem.raw windows.dlllist --pid <pid>
vol -f mem.raw windows.malfind
vol -f mem.raw windows.handles --pid <pid>
```
Linux：
```bash
vol -f mem.raw linux.pslist
vol -f mem.raw linux.bash
vol -f mem.raw linux.sockstat
```

## 重点看什么
- 进程树异常：Web/DB/Java 进程拉起 shell、`certutil`、`bitsadmin`、`curl`。
- `malfind`：RWX 内存、无文件 PE、注入代码。
- 网络：ESTABLISHED 外连、非常见端口、C2 域名/IP。
- 命令行：编码 PowerShell、下载执行、内网探测。
- 凭据：`windows.hashdump`、`windows.lsadump`、`windows.cachedump`（仅在授权取证环境）。
- 内核模块/驱动：异常签名、隐藏服务。

## 内存马线索
- Java 进程中出现异常 ClassLoader、Filter/Servlet 注册、`ProcessBuilder` 字符串。
- PHP-FPM 进程加载非标准扩展或 `auto_prepend_file`。
- .NET 进程中 `Assembly.Load`、异常 AppDomain。

## 注意
- 内存镜像含敏感凭据，按比赛规则保管，不随意外传。
- 结论必须能对应到具体插件输出与偏移/进程 id。
- 不在生产主机上安装未知内核模块；LiME 需提前准备。

## 产出
进程/网络/注入/凭据四张表 + 时间线；用 `blue_finding_add` 落库，附镜像哈希与插件命令。
