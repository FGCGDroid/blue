# Changelog

## 2.0.0-beta.24 — 2026-11-14（本地试用，未发布）

### Added

- `blue_risk_graph`：资产—CVE—发现关联图，输出风险分、对外/内部标记和排序。
- 控制台新增「图谱」页签：资产风险条、关联 CVE、CVE 影响资产数。
- `docs/risk-graph.md` 说明图谱边界。

### Notes

- 风险分只是排查排序，不是 CVSS。
- CVE 关联未验证版本，不能直接判定资产受影响。

## 2.0.0-beta.23 — 2026-11-14（本地试用，未发布）

### Added

- `blue_cve_campaign`：把 CVE 防御包匹配到资产，生成 hardening 核查任务；支持 dry-run、按 CVE/资产过滤、任务去重。
- 控制台「防线」页新增「生成 CVE 任务」按钮。

### Notes

- 只按资产名称/服务/tag 匹配，未验证版本；create=true 也不执行补丁或隔离。
- CVE 条目仍为用户提供的未核验描述。

## 2.0.0-beta.22 — 2026-11-14（本地试用，未发布）

### Added

- 新增 2026 CVE 防御包：12 个条目，覆盖 Node.js Brotli、PHP2Shell、Symfony Mime CRLF、VeloCloud SQLi、AnyDesk、Ivanti、BeyondTrust、NetScaler。
- `blue_cve_pack`：按 CVE/产品查询补丁动作和缓解措施。
- `blue_cve_scan`：启发式日志特征扫描，返回命中 CVE 和片段，不写库。
- 控制台「防线」页签新增 CVE 防御包表。

### Notes

- 条目按用户提供描述建模，未联网核验受影响版本和补丁号。
- 扫描只作线索，不等同于已利用结论。

## 2.0.0-beta.21 — 2026-11-14（本地试用，未发布）

### Changed

- 诱饵服务按 50579 复盘改成“死线索 + 假成功”模型：
  - `/robots.txt` 默认返回 `/admin/` 死线索，不暴露真实备份路径。
  - `/flag` 和 `/flag.txt` 返回 200 格式合法的随机假 flag。
  - `/backup/flag.txt` 默认固定 403，且禁止加入假 flag 路径。
  - 路径先解码两次并折叠 `./`、`../`、反斜杠，再匹配保护表和诱饵表。
  - 新增 `--protect`、`--robots-disallow`、`--fake-flag`、`--tarpit-min/max`。
- 欺骗防御技能补充入口线索、假成功、真假隔离、旁路边界。

## 2.0.0-beta.20 — 2026-11-14（本地试用，未发布）

### Added

- `blue_evidence_export`：导出事实库快照、审计链/锚点状态、Ed25519 签名，写入数据目录 `evidence/`。
- `blue_evidence_verify`：校验 schema、digest 和签名，能发现包内容被改。
- 证据包按敏感键和常见凭据文本脱敏；限制在 evidence/ 或工作区读取。

### Notes

- 证据包是 JSON 快照，不是磁盘/内存镜像，也不是法庭取证规范。
- 签名只证明内容与签名时一致，不证明采集过程未被操控。

## 2.0.0-beta.19 — 2026-11-14（本地试用，未发布）

### Changed

- `engines.dsh` 从 `>=0.2.1-rc.5` 下调到 `>=0.2.1-rc.1`，覆盖 0.2.1 的早期 rc。
- 新增运行时版本检测；`blue_session_info`、`blue_autopilot status` 返回 `dsh` 能力。
- DSH < 0.2.1-rc.1 时，`next/cycle` 和控制台领取会明确拒绝 `agent_preset` 派发，不静默用错角色。
- 新增 `docs/compatibility.md` 和 `test:compat`。

## 2.0.0-beta.18 — 2026-11-13（本地试用，未发布）

### Docs

- `SECURITY.md` 支持范围从过时的 `1.3.x` 改为 `2.0.x beta` + `1.5.x stable`。
- 无运行时变更。

## 2.0.0-beta.17 — 2026-11-13（本地试用，未发布）

### Added

- 诱饵支持 `--tls-cert/--tls-key` 启用 HTTPS，可用真实证书链。
- `--lures` 控制 admin/git/phpmyadmin/backup/shell/status 的暴露子集。
- `--token` 金丝雀标识写入假 git 配置和 SQL dump；日志记录 canary。
- 首页构建号、假后台服务行、SQL 数据随机化，降低静态模板特征。

### Notes

- 仍然不是不可识别；真实证书、真实反向代理和隔离网络更重要。
- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.16 — 2026-11-13（本地试用，未发布）

### Changed

- 诱饵服务降低指纹：按主题返回 Server / X-Powered-By，补 ETag、Last-Modified、Set-Cookie，静态 CSS、favicon、robots、首页和登录后假面板。
- 移除响应里的 `synthetic decoy` 等自曝字符串；假 SQL 改成真实 dump 形态。
- 登录后访问管理页返回假面板，不再总是登录页。

### Notes

- 这只能提高识别成本，不能保证红队一定识破不了。
- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.15 — 2026-11-13（本地试用，未发布）

### Added

- Sigma-lite 检测规则：`blue_detection_rule_add/list`，JSON selection + all/any，点路径和 `*` 通配符。
- `blue_detection_scan` 用启用规则扫描遥测源，返回命中，不写库。
- 遥测轮询自动套用启用规则：无规则时保留原始事件，有规则时只落规则命中和 guard 事件。
- 控制台「防线」页签新增检测规则表。

### Notes

- JSON 规则不是完整 Sigma，不支持 aggregation/时间窗/转换后端。
- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.14 — 2026-11-13（本地试用，未发布）

### Added

- 文件型遥测接入：`blue_telemetry_source_add/poll/health`，按完整行 cursor 增量读取，overview 自动轮询 active 源。
- 防线控制验证：`blue_control_scan/list`，检查审计链、审批闸、遥测健康、诱饵在线、审计锚定。
- 审计链外部锚定：本机 Ed25519 签名链头，`blue_audit_anchor` / `blue_audit_anchor_verify`。
- 受控响应台账：`blue_response_plan/update/list`，只生成高风险待审批任务和回滚方案，不执行命令。
- 控制台新增「防线」页签：控制分、遥测源、响应动作。

### Notes

- 锚定不是外部公证；响应动作仍由人工执行。
- 仍是本地 beta，没有发布 npm 或市场。

## 2.0.0-beta.13 — 2026-11-13（本地试用，未发布）

### Added

- 时间线新增 SHA-256 哈希链：每条事件带 `prev_hash/hash`，旧库自动补链。
- 新增 `blue_audit_verify`：检测时间线被改、被插队或链断裂；不是外部公证。
- 控制台时间线页显示审计链状态；Timeline 页的 `audit` 字段随 overview 返回。

### Notes

- 仍是本地 beta，没有发布 npm 或市场。

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
