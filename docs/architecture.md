# 架构说明

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

## 三、数据流

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

## 四、数据库

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

## 五、扩展点

### 加一个工具

```text
lib/tools.js
→ register(defineTool({ name, description, parameters, execute }))
→ 加入 lib/playbooks.js 的 ALL_TOOLS
→ 如需给角色，检查 ROLE_TOOLS
→ 更新 count / README / 测试
```

### 加一张表

```text
lib/store.js
→ CREATE TABLE IF NOT EXISTS
→ 加索引
→ 加迁移
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

## 六、安全边界

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

## 七、测试地图

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

## 八、不要动的部分

```text
timeline 哈希算法
high 风险审批闸
证据签名/脱敏
store 迁移的幂等性
```

这些一改，历史数据或安全语义就断了。

## 九、当前已知结构债

```text
tools.js 过大
client.js 过大
CVE 数据未版本化
OTLP 没有队列
没有 RBAC
没有静态加密
```

详见 `docs/known-issues.md`。
