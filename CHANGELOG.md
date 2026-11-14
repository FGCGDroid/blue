# Changelog

## 1.5.3 — 2026-11-14

### Changed

- `engines.dsh` 从 `>=0.2.1-rc.5` 下调到 `>=0.2.1-rc.1`，覆盖 0.2.1 的早期 rc。
- 新增 `docs/compatibility.md`，说明 DSH/Node 支持范围。
- README 的 Release / 本地 tarball 版本号更新为 `1.5.3`。
- 仅配置与文档变更，无运行时行为变更。

## 1.5.2 — 2026-11-13

### Docs

- 安全支持范围更新为 `1.5.x`。
- README 的 Release / 本地 tarball 版本号更新为 `1.5.2`。
- 仅文档与版本元数据变更，无运行时行为变化。

## 1.5.0 — 2026-11-13

### Added

- 新增 `blue_attack_coverage`：把内置 13 条日志规则映射到 MITRE ATT&CK 技术和战术。
- 新增 `docs/blue-team-repos.md`：抽样调研 AiSOC、Security Onion、Sigma、APT-Hunter、UAC、VanGuard 等蓝队项目，记录借鉴与不借鉴的边界。

### Notes

- 覆盖映射只代表内置日志规则，不代表 ATT&CK 全量覆盖。
- 没有引入 Sigma 规则库、外部工具、SIEM/EDR 或自动封禁。

## 1.4.0 — 2026-11-12

### Added

- 轻量行为窗口 `lib/hunter.js`：按来源 IP 统计 1 秒窗口内的请求数、路径数和工具指纹。
- 诱饵日志新增 `tags` / `risk`：`automation_burst`、`path_sweep`、`automation_tool`。
- 诱饵服务新增 `--theme generic/tomcat/thinkphp/wordpress` 静态主题。
- 报告新增一段“执行摘要”，用事实库数字概括关键资产、待审批任务和诱饵命中。

### Safety

- 行为标签只做展示和研判，不自动封禁。
- 不调用大模型实时生成假漏洞页面；诱饵主题仍是静态模板。
- 不新增绕过 `pending_approval` 的自动 root 封禁。

## 1.3.2 — 2026-11-11

### Security

- 脱敏覆盖 JSON body 和 query string 中的 password/token/secret/cookie/session。
- 脱敏同时应用于 User-Agent 和 Referer。
- 限流表增加过期清理，避免长期运行时无界增长。

### Docs

- 新增 `SECURITY.md`：支持范围、私密报告、隐私与安全边界。
- 新增 GitHub issue 模板，默认禁止公开贴凭据和客户数据。

## 1.3.1 — 2026-11-10

### Security

- 诱饵日志不再记录 Cookie / Authorization。
- body 中的 password、token、secret、cookie、session 等字段自动替换为 `[REDACTED]`。
- 增加凭证脱敏回归测试。

## 1.3.0 — 2026-11-10

### Added

- 可选独立 HTTP 诱饵程序 `scripts/decoy-server.mjs`。
- 默认只监听 `127.0.0.1`，公开监听必须显式 `--allow-public`。
- 静态假路径：`/admin`、`/.git/config`、`/phpmyadmin`、`/backup.sql`、`/shell.php`。
- 本地 JSONL 事件日志，不主动外传。
- 请求体上限、每 IP 限流、固定长度响应。

### Safety

- 不执行 PHP/Shell/命令。
- 不做无限/10GB 响应。
- 不抓 WebRTC、Canvas 或硬件指纹。
- 不自动启动、不自动部署。

## 1.2.0 — 2026-11-10

### Added

- `blue_tarpit_plan`：Endlessh、假路径、有界慢响应、fail2ban 7 天 jail 配置。
- `blue_honeypot_ingest`：蜜罐事件 → 告警 → high 风险待审批封禁任务。
- 19 个随包技能。

### Safety

- 插件不直接调用 `iptables` / `nft` / `fail2ban-client`。
- 封禁必须人工审批；不按可伪造 UA 自动封禁。

## 1.1.1 — 2026-11-10

### Added

- 诱饵自动过期：默认 24 小时，最大 168 小时。
- 到期自动标记 `retired`，写时间线。
- 控制台显示到期时间。

### Note

- 只更新事实库状态；真实部署的诱饵仍需人工下线。

## 1.1.0 — 2026-11-09

### Added

- 欺骗防御工具：`blue_deception_plan`、`blue_decoy_create`、`blue_decoy_hit`、`blue_decoy_list`。
- SQLite `decoys` / `decoy_hits`。
- 控制台「诱饵」页签、命中率、来源分布。
- 金丝雀文件/URL、假管理入口、假凭据、低交互 tarpit。

### Safety

- 必须 `authorized=true` 且目标在 scope 内。
- 不使用真实个人信息、身份证号或伪造执法材料。
- 不做全屏锁定、无限弹窗、心理恐吓。
- 不收集 WebRTC/Canvas/硬件指纹。

## 1.0.0 — 2026-11-09

### Added

- 蓝队防御模式首个公开版本。
- 30 个蓝队工具、SQLite 事实库、右侧控制台。
- 六个执行角色、任务队列、高风险审批。
- 「防御自检」开局门禁。
- 不可信数据边界与路径闸。
