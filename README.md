# DSH BlueTeam 模式

> 本插件由 **FGCGDroid** 和 **大肥鱼** 一起创作。

把 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）变成一张**蓝队防守指挥台**：
只给一个防守目标，主会话拉起监控值守、情报分析、威胁狩猎、应急响应、取证分析、加固修复六个执行角色；
资产、告警、发现、IOC、任务与时间线实时写进本机 SQLite，右侧常驻控制台同步可视化。

> ⚠️ **仅限已获授权的 CTF 靶场 / 攻防演练 / 自有资产防守使用。**
> 本仓库是蓝队编排、事实记录与辅助研判的工程实现，**不包含攻击、漏洞利用或未授权探测代码**。
> 使用者必须自行确保对目标拥有书面授权，并遵守比赛规则与当地法律。

**60 个 `blue_*` 工具 · 19 个随 npm 包技能 · 6 个执行角色 · 11 个控制台页签 · 17 张事实库表**

> 🧪 当前源码是 `2.0.0-beta.19` 本地试用版，**没有发布到 npm / 市场**。  
> 正式安装仍用 `1.5.2`；2.0 用本地 tarball 装。  
> DSH 兼容：最低 `0.2.1-rc.1`，当前验证 `0.2.2-rc.3`；详见 `docs/compatibility.md`。

---

## 安装

```sh
dsh plugin --profile desktop add dsh-blue-team-mode
```

装完**重启一次 `dsh web`**，在助手栏选择预设 **蓝队防御模式**。

第一条消息必须是：

```text
防御自检
```

自检通过后，直接发防守目标即可开工：

```text
防守目标：example-ctf 靶场，范围 10.10.0.0/24 和 *.example.test。
先盘点资产、接入告警，然后自主派活。
```

**环境准备**：本插件不提供 nmap、tshark、suricata、zeek、yara、volatility、fail2ban 等外部工具的下载或安装；运行 `blue_preflight` 查看缺什么，工具由你自行准备。

> 前置：DSH 能正常 `dsh web` 启动；Node.js ≥ 22.13（依赖内置 `node:sqlite`）。
> 建议跑在专用的演练机、Docker 或虚拟机里，不要直接跑在存有生产密钥的宿主机账户下。

<details>
<summary>从 tarball 安装 / 从源码安装（开发者）</summary>

**从 GitHub Release 安装指定版本**：

```sh
dsh plugin --profile desktop add \
  https://github.com/FGCGDroid/blue/releases/download/v1.5.2/dsh-blue-team-mode-1.5.2.tgz
# 装完重启一次 dsh web
```

**本地 tarball**：

```sh
npm pack --pack-destination dist
dsh plugin --profile desktop add ./dist/dsh-blue-team-mode-1.5.2.tgz
```

**从源码目录安装**：

```sh
dsh plugin --profile desktop add .
```

源码模式修改后需要重新 `add` 或重启，npm 安装的副本不会自动跟着源码变。

</details>

---

## 它解决什么问题

手工防守常见的三个问题：

1. **信息散**：告警在 WAF、日志在服务器、样本在桌面、结论在聊天里，复盘时对不上。
2. **派活乱**：指挥官一边盯告警一边自己扫日志，忘了还有哪些资产没看。
3. **没证据**：子智能体说“清掉了”，但库里没有记录，报告写不出来。

蓝队模式把这三件事压到一条流水线上：

```text
日志 / 告警 / 样本
  → blue_* 工具
  → SQLite 事实库
  → 控制台 / 报告 / 任务
  → subagent 执行
  → 结果回写事实库
```

**结论必须落库。** 子智能体说“处理完了”不算，任务、时间线、告警状态里要有记录。

---

## 功能

- **一套角色分工**：主会话只做指挥（计划、派活、核对落库、汇报），动手的活交给监控值守 / 情报分析 / 威胁狩猎 / 应急响应 / 取证分析 / 加固修复六个执行角色，默认 3 个并发（可配置）。
- **开工前预检**：`blue_preflight` 检查本机工具链和 key，缺什么、能降级到什么方案，一次说清；不假装工具可用。
- **风险闸**：高风险动作（隔离、封禁、删除、改防火墙、杀进程、重置凭据）进入 `pending_approval`，必须人工批准后才能派发；不会自动执行。
- **自主派发**：`blue_autopilot` 生成候选任务、按并发名额领取、派给对应角色；子智能体回报后查库核对，再回收闭环。带轮次上限和冷却。
- **右侧常驻控制台**：态势 / 案件 / 防线 / 告警 / 资产 / 发现 / 任务 / IOC / 诱饵 / 时间线 / 报告 十一个页签，支持拖拽调宽和全屏浏览；前台每 2 秒自动刷新，后台暂停。
- **面板跟着会话走**：多会话并行时，左侧切到哪个会话，右侧就显示该会话绑定的防守目标；没绑定的会话回落到最近一个活跃目标。
- **任务书**：每个任务带目标、已知事实、约束、验收标准和期望输出，统一由 TaskSpec 渲染，避免“让子智能体自己猜”。
- **报告**：从事实库生成 Markdown，包含态势、关键资产、告警研判、脆弱性、IOC、任务与时间线；只允许写到 `$DSH_HOME/blue/reports/`。
- **欺骗防御（可选）**：金丝雀文件/URL、假管理入口、假凭据、低交互 tarpit；登记诱饵、记录命中、生成 `deception` 告警。诱饵默认自动过期（24–168 小时），但真实部署仍需人工下线。
- **蜜罐 / 焦油坑（可选）**：`blue_tarpit_plan` 生成 Endlessh、Nginx 假路径、有界慢响应和 fail2ban 7 天 jail 配置；`blue_honeypot_ingest` 把命中转成告警和待审批封禁任务。插件不直接调用 `iptables` / `nft` / `fail2ban-client`。
- **可选诱饵程序**：包内自带手动启动的 HTTP 诱饵，默认只监听 `127.0.0.1`，公开监听必须显式 `--allow-public`；提供 `generic/tomcat/thinkphp/wordpress` 静态主题；不执行命令、不抓指纹、不做无限响应。
- **低指纹诱饵**：按主题返回 Server / X-Powered-By / ETag / Last-Modified / Set-Cookie，补齐 favicon、robots、CSS 和登录后假面板；响应里不再写 `synthetic decoy` 这类自曝字符串。
- **诱饵可配置**：`--lures` 控制暴露哪些诱饵，`--token` 写入金丝雀标识，`--tls-cert/--tls-key` 可挂真实证书启用 HTTPS；页面构建号和资源版本随机化。
- **自动化流量标注**：诱饵服务按来源 IP 维护 1 秒行为窗口，命中高频请求、路径扫描或工具 UA 时打上 `automation_burst` / `path_sweep` / `automation_tool` 标签；只做研判，不自动封禁。
- **诱饵状态与日志回退**：`blue_decoy_update` 可把诱饵从 `planned` 更新为 `active`；`blue_decoy_sync` 把外部 JSONL 事件同步进事实库；默认日志目录不可写时回退到 workspace，也可用 `BLUE_LOG_DIR` 指定。
- **执行摘要**：报告开头用事实库数字概括关键资产、未闭环高危告警、待审批任务和诱饵命中，方便直接发给人看。
- **案件与决策记录**：`blue_incident_*` 把多条告警/发现/任务归到同一案件；`blue_decision_*` 记录决策、理由、置信度和证据，方便复盘。
- **接入字段可回退**：`blue_alert_ingest` 支持顶层 `title/severity/note`，并单独保存 `event_time`，重复投递返回 `updated` 而不是假 `ingested`。
- **范围支持 URL / host:port**：`blue_scope_check` 同时识别 CIDR、`host:port` 和 URL，避免把真实目标误判为范围外。
- **日志规则补齐**：增加 JWT `alg=none`、HTTP 401 登录失败、`Process.Start` 型 ASPX 马；支持 `custom_rules` 自定义字段规则。
- **可选内联网关**：`scripts/inline-gateway.mjs` 在同一入口检查路径、重复 Cookie、JWT `alg=none`、原型污染和权限字段，写访问日志后再转发；不自动改端口。
- **ctf-lab 访问日志接入**：ctf-lab 的题目服务会写 `access.jsonl`，`blue_access_log_ingest` 把 401/403/5xx/404 转成告警；设置 `CTF_LAB_GUARD=jwt-none` 或 `strict` 可启用内联阻断。
- **Sigma-lite 检测**：`blue_detection_rule_add` 用 JSON selection + all/any 写规则，`blue_detection_scan` 扫描遥测源，遥测轮询会自动套用启用规则。
- **遥测接入**：`blue_telemetry_source_add/poll/health` 增量读取 JSONL/access log，按 cursor 去重落告警，overview 自动轮询 active 源。
- **防线控制验证**：`blue_control_scan` 检查审计链、审批闸、遥测源健康、诱饵在线和审计锚定，输出控制分。
- **受控响应台账**：`blue_response_plan` 只生成高风险待审批任务和回滚方案，`blue_response_update` 回填执行/回滚证据，不执行命令。
- **审计链**：时间线按 SHA-256 哈希链串联，`blue_audit_verify` 能发现事后改记录、插队或断链；只证明库内一致性，不是外部公证。
- **ATT&CK 覆盖映射**：`blue_attack_coverage` 把内置 16 条日志规则映射到技术和战术，标出未映射规则；明确说明这不是全量覆盖。
- **数据只在本机**：全部落在 `$DSH_HOME/blue/`，无遥测、无上报、无云端同步。

---

## 控制台

右侧是一个独立面板，不是塞在文件 tab 里的表单。

| 页签 | 内容 | 可执行操作 |
| --- | --- | --- |
| 态势 | 资产/告警/发现/IOC/任务统计、关键告警、任务队列 | 规划任务、刷新、调整并发、生成报告 |
| 案件 | 级别、标题、状态、负责人、摘要 | 调查、控制、关闭 |
| 防线 | 控制分、控制项、检测规则、遥测源、响应动作 | 验证防线、拉取遥测、刷新 |
| 告警 | 级别、来源、状态、时间 | 确认、标误报、转处置任务 |
| 资产 | 关键级别、地址、端口、服务、状态 | 新增/更新资产 |
| 发现 | 严重级别、类型、状态 | 标记已修复、接受风险 |
| 任务 | 优先级、角色、状态、任务书 | 领取（生成 subagent 任务书）、完成、阻塞 |
| IOC | 类型、值、置信度、来源 | 新增 IOC |
| 诱饵 | 类型、目标、状态、到期时间、命中次数 | 查看（部署仍由人工执行） |
| 时间线 | 时间、主体、动作、对象、详情 | 查看 |
| 报告 | 从事实库生成的 Markdown | 生成/刷新 |

面板默认打开；拖拽左边界可调宽，点标题栏的全屏按钮进入全面浏览，`Esc` 退出。

Host 侧通过 `POST /blue/api` 提供同源 JSON 桥接，浏览器不直接碰数据库；会话与目标的绑定镜像到 `$DSH_HOME/blue/session-bindings.json`。

---

## 六个执行角色

| 角色 | 定位 |
| --- | --- |
| monitor | 盯告警与可用性，先止血再深挖 |
| intel | 把外部情报转成可检测的 IOC / 规则 |
| hunt | 主动狩猎，验证可疑行为 |
| ir | 应急处置，隔离、封禁、恢复 |
| forensics | 取证与时间线还原 |
| hardening | 加固基线与修复建议 |

主会话只做指挥。动手的任务带 `role` 和 `agent_preset`，由主会话通过 `subagent` 派发；worker 没有审批、派发、报告和目标绑定权限。

---

## 安全边界

- 主会话和执行角色都不挂 `bash` / `pwsh` / `fs` / `fs-search` / `jobs` / `web`。
- 文件读取只走 `blue_*`，并有路径闸：拒绝插件源码、`$DSH_HOME` 配置、`.env`、私钥/凭据文件。
- 日志、样本、网页、文件名、User-Agent、URL 参数、worker 回报按不可信数据处理。
- `blue_log_scan` / `blue_artifact_triage` 返回 `untrusted: true` 并检测注入/外传信号。
- 任务书用 `<untrusted_task_data>` 包裹，禁止外传源码、环境变量、凭据和完整日志。
- 高风险动作必须人工审批；插件不直接调用 root 防火墙。
- 诱饵日志不记录 Cookie / Authorization；body、query、UA、Referer 中的 password/token/secret/cookie/session 会替换为 `[REDACTED]`。
- 不做 WebRTC 真实 IP、Canvas、硬件指纹；不做全屏锁定、无限弹窗、心理恐吓、无限响应。

它不是 EDR、IPS、WAF、防火墙或备份系统，不承诺拦截或恢复攻击。真实服务器使用前请自行完成授权、备份、回滚演练和独立安全评估。

---

## 数据与隐私

事实库和报告默认保存在：

```text
$DSH_HOME/blue/
├── blue.db
├── session-bindings.json
├── reports/
└── decoy-events.jsonl
```

这些内容**不要提交到公开仓库**：

| 不入库 | 说明 |
| --- | --- |
| 真实目标 / 资产清单 | 单位名、域名、真实 IP、内网段 |
| 真实凭据 | 口令、密钥、哈希、Cookie、token |
| 客户日志 / 样本 | 含个人信息、业务数据或未脱敏流量的文件 |
| 演练战绩 | 打了几家、多少资产、多少告警、封了多少 IP |
| 诱饵 token | 真实部署的 canary/诱饵凭据 |

插件默认不主动上传任何数据；外部情报查询由用户显式调用，并自行承担配额与合规责任。

---

## 限制

- 不捆绑任何外部工具，只做检测和编排；nmap、tshark、yara、volatility、fail2ban 等需要自行准备。
- 不是 OS 沙箱；`blue_*` 仍能读取“允许范围内的证据文件”，不要把 DSH 跑在能看到无关生产密钥的账户下。
- Prompt 注入仍可能影响模型判断和低风险工具调用；真实对抗建议再加 Docker/VM、只读证据挂载、无出站网络。
- 自动派发只覆盖 low/medium 任务；high 任务必须人工批准，这是设计约束，不是 bug。
- 诱饵自动过期只改事实库状态，不会物理删除已部署的诱饵。

---

## 更新与支持

- 更新记录：[CHANGELOG](CHANGELOG.md)
- 版本发布：[GitHub Releases](https://github.com/FGCGDroid/blue/releases)
- 安全问题：[SECURITY](SECURITY.md)
- 问题反馈：[Issues](https://github.com/FGCGDroid/blue/issues)
- 开发说明：[docs/development.md](docs/development.md)
- 内联防御边界：[docs/inline-defense.md](docs/inline-defense.md)
- 防守回归测试：[docs/defense-regression.md](docs/defense-regression.md)
- 蓝队开源项目调研：[docs/blue-team-repos.md](docs/blue-team-repos.md)

发版流程、测试命令和目录结构见开发说明。

---

## 合规

面向**授权范围内**的防守：CTF 靶场、攻防演练、企业自检、教学研究。

未获授权的扫描、探测、入侵或数据获取均属违法，与本项目作者无关。MIT，见 [LICENSE](LICENSE)。
