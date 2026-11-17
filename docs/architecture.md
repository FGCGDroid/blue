# 架构说明

> 改工具前先看 [tool-map.md](tool-map.md)；改任务/审批/诱饵/响应状态前先看 [state-machines.md](state-machines.md)。
> 这两份是维护者手册，本文只给整体结构和入口。

## 一、整体

这是一个 DSH Cordis 插件，不是独立服务。

```text
DSH Host
├── Cordis loader
│   ├── lib/index.js
│   │   ├── ctx.blueTeam = BlueStore
│   │   ├── apply → 注册 tools
│   │   └── apply → 注册 /blue/api
│   └── blue presets
├── SQLite: $DSH_HOME/blue/blue.db
└── Web client: 右侧栏控制台
```

## 二、运行时组件

| 组件 | 文件 | 职责 |
|---|---|---|
| 插件入口 | `lib/index.js` | 打开 store、注册服务、挂载 tools/ui |
| 工具层 | `lib/tools.js` | 66 个 `blue_*` 工具 |
| 事实库 | `lib/store.js` | SQLite schema、CRUD、审计链 |
| 控制台 API | `lib/ui.js` | `/blue/api`、`/blue/otlp/v1/logs`、snapshot |
| 前端 | `lib/client.js` | 12 个页签、表单、动作 |
| 预设 | `presets/blue/*` | 主指挥官 + 六个执行角色 |
| 生成补丁 | `cordis.patch.yml` | 由 `scripts/build.mjs` 生成 |
| 规划 | `lib/plan.js` | 风险分类、候选任务 |
| 任务书 | `lib/taskspec.js` | TaskSpec 渲染/校验 |
| 审计锚 | `lib/anchor.js` | Ed25519 锚定 |
| 证据 | `lib/evidence.js` | 导出/校验/脱敏 |
| 诱饵 | `lib/decoy-sync.js`、`scripts/decoy-server.mjs` | 事件同步、假响应 |
| 网关 | `lib/gateway.js`、`lib/inline-guard.js` | 路径/Cookie/JWT/走私拦截 |
| 遥测 | `lib/telemetry.js` | JSONL 增量轮询 |
| OTLP | `lib/otlp.js` | OTLP/HTTP JSON 接收 |
| CVE | `lib/cve-pack.js`、`lib/cve-campaign.js` | 防御包、扫描、任务生成 |
| 图谱 | `lib/graph.js` | 资产—CVE—发现风险图 |
| 资产导入 | `lib/inventory.js` | scope → 资产 |

## 三、工具与状态机

### 工具

66 个 `blue_*`，按事实域分组：

| 组 | 数量 | 代表工具 |
|---|---:|---|
| 目标 / 门禁 | 5 | `blue_engagement_open`、`blue_defense_selfcheck` |
| 案件 / 决策 | 6 | `blue_incident_*`、`blue_decision_*` |
| 资产 / 告警 / 发现 | 8 | `blue_asset_*`、`blue_alert_*`、`blue_finding_*` |
| IOC | 3 | `blue_ioc_*` |
| 任务 / 派发 | 5 | `blue_task_*`、`blue_autopilot` |
| 时间线 / 状态 / 目录 | 4 | `blue_timeline`、`blue_defense_status` |
| 日志 / 样本 / 加固 / 处置 / 报告 | 5 | `blue_log_scan`、`blue_report` |
| 欺骗 / 诱饵 / 蜜罐 | 9 | `blue_decoy_*`、`blue_honeypot_ingest` |
| CVE / 风险 / ATT&CK | 5 | `blue_cve_*`、`blue_risk_graph` |
| 审计 / 证据 | 5 | `blue_audit_*`、`blue_evidence_*` |
| 遥测 / 检测 | 6 | `blue_telemetry_*`、`blue_detection_*` |
| 控制 / 响应 | 5 | `blue_control_*`、`blue_response_*` |

工具注册链路、参数 DSL、角色白名单、拆分规则、新增步骤：
[`docs/tool-map.md`](tool-map.md)。

### 状态机

任务状态机的唯一来源是 `lib/judge.js`：

```text
queued → dispatched → running → done
  │          │           ├→ blocked
  │          ├→ done/blocked/cancelled
  └→ cancelled
pending_approval → queued（只有 approveTask）
pending_approval → cancelled
```

硬规则：

```text
high 任务创建即 pending_approval
pending_approval 不能直接 dispatched
high 没有 approved_at 不能 dispatched
审批必须写 approved_by/at + timeline approval
终态不再迁移
```

完整迁移表、字段、迁移步骤、案件/诱饵/响应状态机：
[`docs/state-machines.md`](state-machines.md)。

## 四、数据流

### 工具调用

```text
用户/智能体
→ blue_* tool
→ engagementOf(store, exec, id)
→ store 写事实库
→ timeline 追加哈希链
→ 返回 JSON
```

### 控制台

```text
client.js
→ POST /blue/api {op}
→ sameOrigin 校验
→ handle()
→ snapshot(ctx, store)
→ 返回数据 + snapshot
```

### 遥测

```text
telemetry_sources
→ pollTelemetry
→ alert 去重/落库
→ timeline
```

### OTLP

```text
OTLP Collector
→ POST /blue/otlp/v1/logs?engagement=...
→ Bearer token
→ ingestOtlp
→ alerts
```

### 证据

```text
blue_evidence_export
→ 读取事实库
→ 脱敏
→ Ed25519 签名
→ JSON 文件
```

## 五、数据库

17 张表：

```text
meta
engagements
incidents
decisions
assets
findings
alerts
decoys
decoy_hits
iocs
tasks
timeline
telemetry_sources
controls
audit_anchors
response_actions
detection_rules
```

关键关系：

```text
engagement 1─N assets
engagement 1─N alerts/findings/tasks
asset 1─N findings
decoy 1─N decoy_hits
task 1─N timeline
incident 1─N alerts/tasks/decisions
```

`timeline`：

```text
id / engagement_id / at / actor / action / target / detail
prev_hash / hash
```

哈希链：

```text
sha256(JSON.stringify([prev_hash, engagement_id, at, actor, action, target, detail]))
```

不要直接改历史行。
要改就追加新事件。

## 六、扩展点

### 加一个工具

```text
1. 定边界：名字 / 读或写 / 写哪张表 / 风险 / 角色 / 是否需要审批
2. lib/tools.js 对应分区 register(defineTool({...}))
3. lib/playbooks.js 加 ALL_TOOLS，并检查 ROLE_TOOLS 排除列表
4. 需要 UI 才动 lib/ui.js + lib/client.js + locale
5. scripts/test-tools.mjs 加成功/失败/越权用例，并更新工具数 66
6. README / docs/tool-map.md / docs/architecture.md 同步
7. build + validate + npm test
```

完整模板、拆分判断、常见坑：[`docs/tool-map.md`](tool-map.md)。

### 改一个状态

```text
1. lib/judge.js 改 TASK_STATUS / 分类数组 / TASK_TRANSITIONS
2. lib/store.js 改 createTask / updateTask / approveTask 的 guard 和时间戳
3. lib/plan.js 改 initialStatusForRisk / 候选状态
4. lib/tools.js 改 autopilot 过滤、审批工具
5. lib/ui.js / lib/client.js 改 op、按钮、文案、颜色
6. 加 test-tools / test-ui / test-migration 用例
7. 同步 docs/state-machines.md
```

不要在 `client.js` 或 `tools.js` 里复制迁移表。
完整迁移表和不变量：[`docs/state-machines.md`](state-machines.md)。

### 加一张表

```text
lib/store.js
→ CREATE TABLE IF NOT EXISTS
→ 加索引
→ migrate() 幂等补列
→ 加 CRUD
→ test-migration / test-rollback
```

### 加一个页签

```text
snapshot() 提供数据
→ client.js tabs 数组
→ render 函数
→ locale zh/en
→ test-ui
```

### 加一个连接器

优先做成：

```text
lib/<connector>.js
```

不要直接塞进 `tools.js`。
连接器只负责“把外部事件转成 alert/telemetry”，不负责 UI。

## 七、安全边界

必须保持：

```text
high 风险任务 → pending_approval
诱饵 → 只登记，不自动部署
封禁/隔离/删除 → 人工审批
证据 → 导出前脱敏
外部日志 → 不可信数据，不执行
```

禁止：

```text
自动执行 iptables / nft / fail2ban
自动删除文件
自动杀进程
自动修改账号
把 token 写进日志
```

## 八、测试地图

| 测试 | 覆盖 |
|---|---|
| `test-tools.mjs` | 工具 schema、链路、审批、CVE、图谱 |
| `test-ui.mjs` | Host 路由、client 注册、快照 |
| `test-hunter.mjs` | 行为窗口 |
| `test-inline-gateway.mjs` | 路径/Cookie/JWT/CL+TE |
| `test-decoy-server.mjs` | 假路径/假 flag/日志 |
| `test-migration.mjs` | 旧库迁移 |
| `test-rollback.mjs` | 1.5.3 → beta → 回滚 |
| `test-compat.mjs` | DSH 版本兼容 |
| `test-otlp.mjs` | OTLP 解析/去重/token |
| `test-ctf-defense.mjs` | 内联网关真的挡住 JWT none/路径/Cookie |
| `test-ui-e2e.mjs` | 真实浏览器审批（需运行中的 Web + URL） |

## 九、不要动的部分

```text
timeline 哈希算法
high 风险审批闸
证据签名/脱敏
store 迁移的幂等性
```

这些一改，历史数据或安全语义就断了。

## 十、当前已知结构债

```text
tools.js 约 2748 行
client.js 约 1848 行
store.js 约 1484 行
CVE 数据未版本化
OTLP 没有队列
没有 RBAC
没有静态加密
告警/发现状态机未强制
```

详见 `docs/known-issues.md`。
