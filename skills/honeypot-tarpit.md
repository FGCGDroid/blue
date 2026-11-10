---
name: honeypot-tarpit
description: 授权资产上的 SSH/HTTP 焦油坑、假路径与 fail2ban 7 天封禁方案；只生成配置和待审批任务，不自动执行防火墙命令。
---

# 蜜罐与焦油坑（授权资产）

## 可做

- SSH 焦油坑：Endlessh 慢速 Banner，限制连接数、延迟和行长度。
- HTTP 假路径：`/admin`、`/.git/config`、`/phpmyadmin` 返回静态假页面。
- 有界慢响应：`limit_rate` + 超时 + 连接数限制，避免拖垮自己的带宽。
- 假 Shell 页面：只返回静态乱码/假提示，不执行任何命令。
- 蜜罐日志 → `blue_alert_ingest` / `blue_honeypot_ingest` → 告警 → 待审批的 7 天封禁任务。
- fail2ban 配置：`bantime=7d`、`findtime=10m`、`maxretry=5`、`ignoreip` 白名单。

## 不做

- 不发送 10GB/无限 HTTP 响应；这是 DoS，会先打垮自己的出口和内存。
- 不做真正的反弹 Shell、命令执行或凭据收集。
- 不按 User-Agent 直接封禁；UA 可伪造，误封率高。
- 不在插件里直接调用 `iptables` / `nft` / `fail2ban-client`；封禁必须由人工审批后，在主机侧执行。
- 不收集 WebRTC/Canvas/硬件指纹。

## 自动闭环

```text
蜜罐日志 / Webhook
  → blue_honeypot_ingest
  → 告警 + high 风险待审批任务
  → 人工批准
  → 主机侧 fail2ban 执行 7 天封禁
  → 报告记录
```

插件负责研判、落库、生成任务和证据；不替人按 root 防火墙按钮。

## 部署检查

- 确认目标在 `engagement.scope` 内。
- 先配置 `ignoreip`，避免封掉自己/办公出口/监控。
- 先 dry-run，再启用 jail。
- 7 天后复核；保留蜜罐原始日志。
