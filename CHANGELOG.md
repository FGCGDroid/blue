# Changelog

## 2.0.0-beta.12 — 2026-11-13（本地试用，未发布）

### Fixed

- 修复 beta.11 的启动崩溃：旧库的 `decoy_hits` 还没有 `event_key` 列，但 schema 里提前创建了引用该列的唯一索引，导致 `no such column: event_key`。
- 唯一索引改为迁移补列后再创建；新增 `test:migration` 覆盖旧库升级。

### Notes

- 这是 beta.11 页面/接口加载失败的根本原因。
- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.11 — 2026-11-13（本地试用，未发布）

### Added

- 新增 `blue_decoy_sync`：把外部诱饵 JSONL 事件同步进事实库，自动补登记未知诱饵并按事件去重。
- 诱饵页新增「同步事件」按钮；设置 `BLUE_DECOY_EVENTS` 后，overview 会自动同步，页面随 2 秒刷新更新。
- `decoy_hits` 增加 `event_key` 唯一键，避免重复导入。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.10 — 2026-11-13（本地试用，未发布）

### Fixed

- 案件状态机：拒绝 `closed -> contained` 等非法迁移，允许 `closed -> open` 重开。
- 案件关联改为先全量校验再更新，避免“告警挂上了、任务不存在”导致部分写入。
- 决策记录校验关联的案件/任务/告警必须属于当前防守目标。
- 诱饵状态机：`retired` 不能重新激活，只允许 `planned -> active/retired`、`active -> retired`。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.9 — 2026-11-13（本地试用，未发布）

### Added

- 案件页签增加「调查 / 控制 / 关闭」操作，走同源 `/blue/api` 的 `updateIncident`。
- `blue_incident_update` 和 UI 更新都会写入时间线。

### Fixed

- ATT&CK 覆盖说明从 13 条规则修正为 16 条，避免文档和实际规则数不一致。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.8 — 2026-11-13（本地试用，未发布）

### Added

- 新增 `lib/inline-guard.js`：路径规范化、重复 Cookie、JWT `alg=none`、原型污染、权限字段检查。
- 新增 `scripts/inline-gateway.mjs`：可选内联 HTTP 网关，检查后转发并写访问日志。
- 新增 `test:gateway` 回归：转发、路径、重复 Cookie、JWT、原型、权限字段、日志。

### Notes

- 网关需要上游只监听回环/内网才有意义，不会自动改端口。
- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.7 — 2026-11-13（本地试用，未发布）

### Fixed

- `blue_access_log_ingest` 使用 `raw_path` 识别 `/./config`、`/%2e/config` 这类被规范化后的路径异常。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.6 — 2026-11-13（本地试用，未发布）

### Fixed

- `blue_access_log_ingest` 现在会把 ctf-lab `guard` 拦截事件和路径规范化异常标成高危告警。
- 补充回归测试，覆盖 4 条访问日志事件。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.5 — 2026-11-13（本地试用，未发布）

### Added

- 新增 `scripts/test-ctf-defense.mjs`：本地 ctf-lab 防守回归测试，验证 M05/M06/M12/M16，只发 GET、只允许回环地址。
- `npm run test:ctf-defense` 可输出 PASS/FAIL 矩阵。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.4 — 2026-11-13（本地试用，未发布）

### Added

- `blue_access_log_ingest` 识别 `guard` 拦截事件和路径规范化异常，生成高危告警。
- ctf-lab `CTF_LAB_GUARD=strict`：阻断重复 `token` Cookie、`alg=none`、`./`/`../`/编码路径；403 不回显规则名。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.3 — 2026-11-13（本地试用，未发布）

### Fixed

- 控制台增加 2 秒自动刷新：前台每 2 秒拉取 overview，页面切到后台时暂停，切回来立即补一次。
- 审批、告警、任务、案件等外部变更不再需要手动点刷新。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.2 — 2026-11-13（本地试用，未发布）

### Added

- 新增 `incidents` 案件表：把多条告警、发现和任务归到同一事件下。
- 新增 `decisions` 决策记录表：记录决策、理由、置信度和证据。
- 新增 `blue_incident_open/list/update/attach` 和 `blue_decision_add/list`。
- 控制台新增「案件」页签。
- 报告新增案件和决策记录段落。
- 任务/告警/发现增加 `incident_id` 关联字段，旧库自动补列。

### Fixed

- `blue_scope_check` 支持 CIDR、`host:port` 和 URL；不再把真实目标误判为范围外。
- `blue_alert_ingest` 顶层 `title/severity/note` 不再被 JSON 路径吞掉；新增独立 `event_time` 列。
- 重复告警返回 `ingested=0`、`updated=1`，不再假装新入账。
- `blue_log_scan` 支持 `custom_rules` 自定义字段规则；补 HTTP 401 登录失败、JWT `alg=none`、`Process.Start` 型 ASPX 马。
- 新增 `blue_decoy_update`，可把诱饵从 `planned` 更新为 `active`。
- 诱饵日志目录不可写时回退到 workspace `.blue-decoy/`，并支持 `BLUE_LOG_DIR`。
- 未知/缺失的本地插件不再阻塞 profile reconcile。
- ctf-lab 题目服务新增 access.jsonl 访问日志；新增 `blue_access_log_ingest`。
- ctf-lab 支持 `CTF_LAB_GUARD=jwt-none` 的可选内联阻断，默认关闭。

### Notes

- 2.0 仍是本地 beta，没有发布 npm 或市场。
- 45 个工具、19 个技能、10 个控制台页签、12 张事实表。

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
