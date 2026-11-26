---
name: blue-setup
description: 【开工】蓝队防守开工清单：目标与范围、资产盘点、工具预检、角色分工、事实库初始化
whenToUse: 新开一场 CTF 防守、换靶标、或接手别人的防守环境时
role: monitor
category: 基础
tags: [setup, asset, preflight]
enabled: true
---

# 蓝队开工清单

## 0. 自检后的第一句话（默认）
如果用户还没给目标，只问一句：

> 把服务器公网 IP 或靶场网址发给我，其他不用填。

拿到目标后直接：

```text
blue_protect action=start target=<IP/域名/网址>
```

它会自动建立目标、绑定会话、登记资产、给出 5 项检查清单。  
不要让普通用户先填名称、范围、资产类型、风险等级；这些是高级模式。

## 1. 先定“守什么”
- 向导自动建立目标；需要补充范围时再用 `blue_engagement_open` / `blue_asset_add`。
- 多会话各自绑定，不共享“当前目标”。
- 范围不清时按用户给的清单执行，先记录为 `unknown`，不要自行扩大。

## 2. 工具预检
`blue_preflight` 检查：
- 流量：tcpdump / tshark / zeek / suricata
- 主机：osquery / auditd / sysmon / velociraptor
- 检测：yara / clamav / rkhunter / chkrootkit
- 取证：volatility3 / sleuthkit / foremost / bulk_extractor
- 情报：VT / AbuseIPDB / MISP key
缺什么就写清替代方案（纯日志 grep、系统自带 `ss`/`netstat`/`tasklist`/`ps`），不要假装可用。

## 3. 资产盘点（先粗后细）
至少覆盖：
- 对外 Web/API/管理端/登录口
- VPN/堡垒机/远程桌面/SSH
- 数据库/缓存/对象存储/备份
- 容器/K8s/云控制面
- 内部横向可达的网段与双网卡主机
每条用 `blue_asset_add` 落库，标 `criticality`，写归属/暴露面证据。

## 4. 角色分工
| 角色 | 先做什么 |
| --- | --- |
| monitor | 告警接入、可用性探测、首轮研判 |
| intel | 收集本场 IOC、补检测规则 |
| hunt | 假设驱动找 WebShell/横向/持久化 |
| ir | 已确认事件的隔离、清除、恢复 |
| forensics | 样本/内存/磁盘/日志取证 |
| hardening | 修入口、收敛暴露面、补监控 |

## 5. 基线三件事
1. 时间同步：所有日志统一 UTC 或注明本地时区。
2. 证据目录：`blue_report write=true` 的输出目录 + 原始日志副本。
3. 变更记录：任何隔离/封禁/改配置前记录原值与回滚方式。

## 6. 开工自检
- `blue_defense_status` 应能看到资产、告警、任务、IOC 的计数。
- `blue_autopilot action=plan` 能生成至少一条任务。
- 没有资产/没有日志时，先补这两样，不要直接开始“猜攻击”。
