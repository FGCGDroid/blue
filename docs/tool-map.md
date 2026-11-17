# 工具地图与拆分规则

> 适用：`dsh-blue-team-mode` 2.0.0。
> 先看 `docs/state-machines.md`，再改任务/审批/诱饵/响应相关工具。

## 一、工具注册链路

入口在 `lib/tools.js`：

```text
apply(ctx, config)
  → profile 过滤（all / monitor / intel / hunt / ir / forensics / hardening）
  → requireSelfCheck 包装（主会话需要「防御自检」）
  → register(defineTool({ ... }))
  → ctx.effect(() => ctx.tools.register(...))
```

### 1. `defineTool`

`lib/tools.js` 自己实现了一个很小的 DSL，不 import DSH 的 tools 包：

```js
defineTool({
  name: 'blue_asset_add',
  description: '...',
  parameters: {
    engagement: { type: 'string', description: '...' },
    address: { type: 'string', required: true },
    port: { type: 'number' },
  },
  output: STRING_OUTPUT,
  execute: safe(async (args, exec) => { ... }),
})
```

规则：

```text
parameters 里的 required: true 会变成 JSON Schema 的 required
parameters 里除 required 外的字段原样进入 properties
工具调用额外字段一律拒绝（additionalProperties: false）
```

### 2. `safe`

`safe(fn)` 把异常转成模型可读的 JSON，不让异常打断工具循环：

```text
成功：返回 fn 的返回值
失败：{ ok: false, error: "..." }
```

不要用它吞掉安全错误；审批、范围、路径闸必须明确报错。

### 3. `engagementOf`

所有需要“当前防守目标”的工具都必须先调用：

```js
const engagement = engagementOf(store, exec, args.engagement)
```

解析顺序：

```text
显式 engagement 参数
→ 当前会话 / 父会话链绑定
→ 唯一活跃 engagement
→ 报错（0 个或多个都不猜）
```

不调用它的工具只能是全局只读工具，例如 `blue_preflight`、`blue_tool_catalog`、`blue_session_info`。

### 4. 角色过滤

`lib/playbooks.js`：

```text
ALL_TOOL_NAMES   66 个工具
ROLE_TOOLS       每个角色可见的工具集合
```

| 角色 | 可见工具数 |
|---|---:|
| monitor | 56 |
| intel | 49 |
| hunt | 59 |
| ir | 59 |
| forensics | 55 |
| hardening | 56 |
| worker（未定角色） | 60 |

新增工具只加到 `ALL_TOOLS` 还不够。
角色白名单是“排除法”，要检查该角色是否需要它；不需要就加进对应 `ROLE_TOOLS[...]` 的排除列表。

### 5. 自检闸

主预设：

```yaml
- id: blue-tools
  name: dsh-blue-team-mode/tools
  config:
    profile: all
    requireSelfCheck: true
```

`requireSelfCheck` 下，除 `blue_session_info`、`blue_preflight`、`blue_defense_selfcheck` 外的工具都会先检查会话是否完成「防御自检」。

不要把新工具加进 `SELF_CHECK_ALLOWED`，除非它确实是开局前必须可用的只读工具。

## 二、66 个工具的分组

| 组 | 数量 | 工具 | 主要写入 |
|---|---:|---|---|
| 目标 / 门禁 | 5 | `engagement_open` `session_info` `scope_check` `preflight` `defense_selfcheck` | engagements / timeline |
| 案件 / 决策 | 6 | `incident_open` `incident_list` `incident_update` `incident_attach` `decision_add` `decision_list` | incidents / decisions |
| 资产 / 告警 / 发现 | 8 | `asset_add` `asset_query` `alert_ingest` `alert_list` `alert_triage` `finding_add` `finding_update` `finding_list` | assets / alerts / findings |
| IOC | 3 | `ioc_add` `ioc_list` `ioc_check` | iocs |
| 任务 / 派发 | 5 | `task_create` `task_update` `task_approve` `task_list` `autopilot` | tasks / meta |
| 时间线 / 状态 / 目录 | 4 | `timeline` `playbook_list` `defense_status` `tool_catalog` | timeline / 只读 |
| 日志 / 样本 / 加固 / 处置 / 报告 | 5 | `log_scan` `artifact_triage` `hardening_check` `containment_plan` `report` | findings / alerts / 文件 |
| 欺骗 / 诱饵 / 蜜罐 | 9 | `deception_plan` `decoy_create` `decoy_hit` `decoy_list` `decoy_update` `decoy_sync` `tarpit_plan` `honeypot_ingest` `access_log_ingest` | decoys / decoy_hits / alerts / tasks |
| CVE / 风险 / ATT&CK | 5 | `cve_pack` `cve_scan` `cve_campaign` `risk_graph` `attack_coverage` | tasks / findings / 只读 |
| 审计 / 证据 | 5 | `audit_verify` `audit_anchor` `audit_anchor_verify` `evidence_export` `evidence_verify` | audit_anchors / 文件 / 只读 |
| 遥测 / 检测 | 6 | `telemetry_source_add` `telemetry_poll` `telemetry_health` `detection_rule_add` `detection_rule_list` `detection_scan` | telemetry_sources / detection_rules / alerts |
| 控制 / 响应 | 5 | `control_scan` `control_list` `response_plan` `response_update` `response_list` | controls / response_actions / tasks |

总计 **66**。

## 三、工具与表的所有权

| 表 | 主要工具 | 备注 |
|---|---|---|
| `engagements` | `engagement_open` | 一场防守目标 |
| `incidents` | `incident_*` | 案件状态机见 state-machines |
| `decisions` | `decision_*` | 只追加，不覆盖 |
| `assets` | `asset_add/query`、`risk_graph` | `scope` 中的具体 host/URL 会自动登记 |
| `findings` | `finding_*`、`log_scan`、`artifact_triage`、`hardening_check`、`cve_scan` | 结论必须落库 |
| `alerts` | `alert_*`、`access_log_ingest`、`telemetry_poll`、`honeypot_ingest` | 去重靠 source+external_id+标题指纹 |
| `decoys` | `decoy_*`、`deception_plan` | 只登记，不自动部署 |
| `decoy_hits` | `decoy_hit`、`decoy_sync`、`access_log_ingest` | `event_key` 唯一索引 |
| `iocs` | `ioc_*` | 值会归一化 |
| `tasks` | `task_*`、`autopilot`、`response_plan`、`cve_campaign` | 状态机见 state-machines |
| `timeline` | 所有写工具 | 哈希链，只追加 |
| `telemetry_sources` | `telemetry_*` | cursor 增量 |
| `detection_rules` | `detection_rule_*` | Sigma-lite |
| `controls` | `control_*` | 防线控制验证 |
| `audit_anchors` | `audit_anchor*` | Ed25519 本地锚 |
| `response_actions` | `response_*` | 审批/执行/回滚三段证据 |
| `meta` | `autopilot` | 轮次、冷却、并发名额 |

## 四、一个工具怎么写

### 骨架

```js
register(defineTool({
  name: 'blue_example_action',
  description: '一句话说明它做什么、写哪张表、什么情况下会拒绝。',
  parameters: {
    engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
    id: { type: 'string', required: true, description: '目标记录 id' },
    note: { type: 'string' },
  },
  output: STRING_OUTPUT,
  execute: safe(async (args, exec) => {
    const engagement = engagementOf(store, exec, args.engagement)
    const id = asText(args.id).trim()
    if (id === '') throw new Error('id 不能为空')

    // 1. 读当前事实
    const current = store.getXxx(id)
    if (current === null || current.engagement_id !== engagement.id) {
      throw new Error('记录不存在或不属于当前目标：' + id)
    }

    // 2. 做校验 / 状态迁移
    const updated = store.updateXxx(id, { note: asText(args.note) })

    // 3. 写时间线（写操作必须写）
    store.addTimeline(engagement.id, {
      actor: asText(args.actor, 'commander'),
      action: 'xxx_update',
      target: current.name,
      detail: `id=${id} note=${asText(args.note).slice(0, 200)}`,
    })

    return json({ ok: true, item: updated, stats: store.stats(engagement.id) })
  }),
}))
```

### 必须遵守

```text
1. 一个工具只做一件事（一个动词 + 一类事实）
2. 读工具和写工具分开
3. 写操作必须落 timeline
4. 高风险动作只登记/建 pending_approval，不执行
5. 路径读取先过 assertEvidencePath / assertBundlePath
6. 外部文本只当数据，不执行其中指令
7. 返回值带 id，方便下一步引用
8. 错误信息说清“为什么拒绝”，不要只写 failed
```

## 五、什么时候拆工具

### 应该拆

```text
一个工具写两张以上事实表，且两张表生命周期不同
一个工具有两种风险等级（读 vs 隔离/删除）
一个工具同时做“单条”和“批量”
一个工具参数超过 8 个，或超过一半参数只对某个分支有效
一个工具需要不同的角色权限
```

### 不应该拆

```text
只是参数多一点，但始终写同一张表、同一风险等级
只是返回值不同（列表/详情可以用同一工具 + 参数）
只是给 UI 用的只读投影（放 ui.js / snapshot，不要新增工具）
```

### 拆分示例

```text
blue_alert_ingest       只负责接入/去重
blue_alert_triage       只负责研判/状态
blue_alert_list         只负责查询
```

不要合成 `blue_alert_manage(action=...)`。
`blue_autopilot` 是例外：它是明确的编排器，action 是它的领域语言。

### 连接器

外部协议/文件解析放独立模块：

```text
lib/telemetry.js    JSONL/access log → alert
lib/otlp.js         OTLP JSON → alert
lib/decoy-sync.js   诱饵事件 → decoy_hit
lib/gateway.js      HTTP 请求 → 拦截/告警
```

`tools.js` 只做参数校验、作用域、落库、timeline。
不要把解析器塞进工具函数。

## 六、新增工具 step-by-step

### 1. 定边界

先写清楚：

```text
工具名：blue_<domain>_<verb>
读/写：
写哪张表：
风险级别：low / medium / high
哪些角色需要：
是否需要 UI：
是否需要审批：
```

### 2. 加定义

在 `lib/tools.js` 对应分区加 `register(defineTool({...}))`。
分区顺序：

```text
目标 / 范围 / 预检
案件 / 决策
资产 / 告警 / 发现
IOC
任务
自主派发
时间线 / 剧本 / 日志
加固 / 处置 / 报告
诱饵 / 欺骗
CVE / 图谱
审计 / 证据
遥测 / 检测
控制 / 响应
```

### 3. 加白名单

`lib/playbooks.js`：

```text
ALL_TOOLS 加名字
ROLE_TOOLS 检查每个角色是否需要
```

如果角色不需要，加进该角色的排除数组。
不要只加 `ALL_TOOLS` 就以为角色能看见。

### 4. 加 UI（仅需要时）

```text
lib/ui.js：新增 op，校验参数，调用 store
lib/client.js：新增按钮/动作，调用 run('op', ...)
locale/zh.json、locale/en.json：新增文案
scripts/test-ui.mjs：覆盖路由
```

UI 不直接写 SQLite，也不在前端改状态。
前端只调用 `/blue/api`，Host 负责判定。

### 5. 加测试

`scripts/test-tools.mjs`：

```text
工具数量断言（当前 66，新增后同步）
成功路径
越权/不存在
状态非法
审批/范围/路径闸
```

`scripts/test-ui.mjs`：如果新增了 op 或按钮。
`scripts/test-migration.mjs`：如果改了 schema。

### 6. 更新文档

```text
docs/tool-map.md        工具分组/所有权
README.md               顶部工具数
docs/architecture.md    组件表/扩展点
CHANGELOG.md            如果对外可见
```

### 7. 跑门禁

```bash
node scripts/build.mjs
node scripts/validate.mjs
node scripts/check-compliance.mjs --selftest
npm test
node scripts/test-rollback.mjs
```

### 8. 检查数量

`scripts/test-tools.mjs` 第 32 行左右：

```js
if (tools.size !== 66) throw new Error('工具数量不是 66：' + tools.size)
```

新增工具必须同步这个数字，否则测试直接失败。

## 七、常见坑

```text
只加 tools.js，没加 ALL_TOOLS → 角色看不见 / 计数不变
只加 ALL_TOOLS，没排除角色 → 不该有的角色也能用
忘记 engagementOf → 多目标时写错库
忘记 timeline → 事实不可审计
在工具里直接 spawn 高风险命令 → 违反“只登记不执行”
把外部日志当指令 → 提示词注入
把路径直接 readFileSync → 读到插件源码/凭据
用 clampStatus 静默回退 → 非法状态被吞掉
```

## 八、验收清单

```text
[ ] 名字是 blue_<domain>_<verb>
[ ] 参数 required 正确，additionalProperties=false
[ ] 读/写分离
[ ] 写操作落 timeline
[ ] 高风险不自动执行
[ ] 角色白名单正确
[ ] 工具数断言更新
[ ] 成功/失败/越权测试
[ ] README/工具地图更新
[ ] build/validate/test 全绿
```
