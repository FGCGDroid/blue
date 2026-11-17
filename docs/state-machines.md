# 状态机与迁移规则

> 适用：`dsh-blue-team-mode` 2.0.0。
> 任务状态机的唯一来源是 `lib/judge.js`；`lib/store.js` 只负责执行和落库。
> 不要在 `tools.js`、`ui.js`、`client.js` 里另写一套 `if (status === ...)`。

## 一、任务状态机

### 1. 状态

`lib/judge.js`：

```js
queued
pending_approval
dispatched
running
done
blocked
cancelled
```

分类：

| 分类 | 状态 |
|---|---|
| 未闭环 | `queued` `pending_approval` `dispatched` `running` |
| 活跃 | `dispatched` `running` |
| 终态 | `done` `blocked` `cancelled` |

### 2. 允许的迁移

```text
queued ─────────→ dispatched ─────────→ running ─────────→ done
  │                   │                    │
  │                   ├────────────────────┼──────────────→ blocked
  │                   │                    │
  └───────────────────┴────────────────────┴──────────────→ cancelled

pending_approval ──(approveTask)──→ queued
pending_approval ─────────────────────────────────────────→ cancelled

done / blocked / cancelled = 终态，不再迁移
```

完整表：

| from | to | 谁触发 | 额外条件 / 副作用 |
|---|---|---|---|
| `queued` | `dispatched` | `updateTask` / `autopilot` | high 必须有 `approved_at`；首次写 `dispatched_at` |
| `queued` | `cancelled` | `updateTask` | 写 `completed_at` |
| `pending_approval` | `queued` | **只有** `approveTask` | `actor` 非空；写 `approved_by/at/note`；timeline `approval` |
| `pending_approval` | `cancelled` | `updateTask` | 写 `completed_at` |
| `dispatched` | `running` | `updateTask` | 不改 `dispatched_at` |
| `dispatched` | `done` / `blocked` / `cancelled` | `updateTask` / `autopilot complete` | 首次终态写 `completed_at` |
| `running` | `done` / `blocked` / `cancelled` | `updateTask` | 首次终态写 `completed_at` |
| 任意 | 相同状态 | `updateTask` | 允许；仍写一条 timeline |
| 终态 | 任意 | — | 拒绝 |

`canTransitionTask(from, to)` 对 `from === to` 返回 `true`，所以重复写同一状态是幂等的。

### 3. 创建时的强制规则

`lib/plan.js`：

```js
export function initialStatusForRisk(riskLevel) {
  return riskLevel === 'high' ? 'pending_approval' : 'queued'
}
```

`lib/store.js` `createTask()`：

```text
risk_level = high
  → requires_approval 强制 1
  → status 强制 pending_approval（忽略传入的 queued/dispatched）
risk_level = low / medium
  → status 用传入值，缺省 queued
```

`blue_task_create` 也会先跑 `inferRisk()`，再走上面的规则。

### 4. 审批

`store.approveTask(id, { actor, note })`：

```text
1. actor 不能为空
2. 任务必须存在
3. 当前状态必须是 pending_approval
4. risk_level 必须是 high
5. transaction 内：
   UPDATE tasks SET status='queued', approved_by=?, approved_at=?, approval_note=?
   WHERE id=? AND status='pending_approval'
6. 写 timeline：action='approval'
   detail 至少含 task_id / risk_level / decision=approved / note
7. 返回最新任务
```

`blue_task_approve` 只做参数校验和调用；普通 worker 没有这个工具。

### 5. 改角色导致风险升级

`blue_task_update` 改 `role` 时：

```text
新角色重新跑 inferRisk()
  → 如果变成 high 且原任务不是 high
  → store.reclassifyTaskRisk()
       risk_level = high
       requires_approval = 1
       status = pending_approval
       清空 approved_by/approved_at/approval_note
       写 timeline: risk_reclassified
  → 返回 approval_required，其他字段不应用
```

`reclassifyTaskRisk()` 拒绝：

```text
终态任务
dispatched / running 任务（先取消，再重建）
```

### 6. 自动派发闸门

`blue_autopilot` 的 `next/cycle`：

```text
只从 status='queued' 领取
high 且 approved_at 为空 → 不领取
队列里只剩 pending_approval / 未审批 high
  → 返回 reason='approval_required'
  → 不自动派发
```

`cycle` 前还有：

```text
max_rounds 默认 12
cooldown 默认 30 秒
超过 → reason='round_limit' / 'cooldown'
```

`plan` 不占轮次；`cycle` 成功派发才 `markAutopilotCycle()`。

### 7. 不变量

```text
1. high 永远不能直接进入 dispatched
2. pending_approval 不能直接 dispatched
3. 只有 approveTask 能把 pending_approval 改成 queued
4. 审批必须同时写 approved_* 和 timeline approval
5. 高风险未审批任务即使被手工写成 queued，autopilot 也不领取
6. 终态不可再迁移
7. 每次 updateTask 都写 timeline task_update
8. dispatched_at 只在第一次 dispatched 时写
9. completed_at 只在第一次进入终态时写
```

### 8. 已知行为

`store.updateTask()` 用 `clampStatus(asText(patch.status, current.status), current.status)`：

```text
非法 status 字符串 → 静默回退到 current.status
```

这不会绕过迁移校验，但会把“写错状态”吞掉。
新增状态时务必把状态加进 `TASK_STATUS`，否则会被当成非法值回退。

## 二、案件状态机

`lib/store.js`：

```js
const INCIDENT_TRANSITIONS = {
  open: ['investigating', 'contained', 'closed'],
  investigating: ['open', 'contained', 'closed'],
  contained: ['investigating', 'closed'],
  closed: ['open'],
}
```

| from | 允许 to |
|---|---|
| `open` | `investigating` `contained` `closed` |
| `investigating` | `open` `contained` `closed` |
| `contained` | `investigating` `closed` |
| `closed` | `open` |

`updateIncident()` 会校验状态，并写 `updated_at`。
`blue_incident_update` 的状态参数只应传上述值。

## 三、诱饵状态机

`lib/store.js`：

```js
const DECOY_STATUSES = ['planned', 'active', 'retired']

const DECOY_TRANSITIONS = {
  planned: ['active', 'retired'],
  active: ['retired'],
  retired: [],
}
```

| from | 允许 to | 说明 |
|---|---|---|
| `planned` | `active` | 人工确认真实部署，或首次命中自动升级 |
| `planned` | `retired` | 取消/到期 |
| `active` | `retired` | 下线/到期 |
| `retired` | — | 终态 |

自动迁移：

```text
addDecoyHit()
  planned + 首次命中
  → active
  → timeline decoy_auto_active

expireDecoys()
  planned/active + expires_at <= now
  → retired
  → timeline decoy_expire
```

`listDecoys()` 会先跑 `expireDecoys()` 和 `reconcileDecoys()`，所以查询会触发自动状态校准。

`blue_decoy_update` 用 `DECOY_TRANSITIONS` 校验；不要直接 SQL 改状态。
`planned` 不等于“正在运行”；真实部署后必须 `active`，或者等首次命中自动升级。

## 四、响应动作状态机

`lib/response.js`：

```js
const STATUSES = new Set(['planned', 'applied', 'rolled_back', 'cancelled'])
```

| from | 允许 to | 条件 |
|---|---|---|
| `planned` | `applied` | 关联任务必须已有 `approved_by`；必须写 `evidence` |
| `planned` | `cancelled` | 只能从 planned 取消 |
| `applied` | `rolled_back` | 只能从 applied 回滚 |
| `rolled_back` | — | 终态 |
| `cancelled` | — | 终态 |

`planResponse()`：

```text
创建 high 风险任务（pending_approval）
创建 response_actions 记录（planned）
写 timeline response_plan
不执行任何命令
```

`updateResponse()` 只回填状态/证据，不执行命令。
`blue_response_update` 的 `applied` 必须带执行证据；没有审批的响应动作不能标记已执行。

## 五、告警与发现

这两个目前是“语义状态”，没有集中迁移表：

```text
alert:   open / investigating / contained / closed / false_positive
finding: open / fixed / accepted / false_positive
```

`lib/judge.js` 只定义：

```js
ALERT_OPEN_STATUSES  = ['open', 'investigating']
ALERT_CLOSED_STATUSES = ['closed', 'false_positive']
FINDING_OPEN_STATUSES = ['open']
FINDING_CLOSED_STATUSES = ['fixed', 'accepted', 'false_positive']
```

`store.updateAlert()` / `store.updateFinding()` 目前不校验迁移，也不限制状态枚举。
这是已知结构债，不是可以随便加状态的理由。

如果要收紧：

```text
1. 在 judge.js 加 ALERT_TRANSITIONS / FINDING_TRANSITIONS
2. 在 store.updateAlert/updateFinding 里校验
3. UI 只显示合法动作
4. test-tools 加非法迁移用例
5. 文档同步
```

## 六、任务表字段与迁移

`tasks` 关键字段：

```sql
risk_level TEXT NOT NULL DEFAULT 'low'
requires_approval INTEGER NOT NULL DEFAULT 0
approved_by TEXT
approved_at TEXT
approval_note TEXT
scope TEXT NOT NULL DEFAULT ''
constraints TEXT NOT NULL DEFAULT '[]'
expected_output TEXT NOT NULL DEFAULT '{}'
dispatched_at TEXT
completed_at TEXT
```

迁移在 `lib/store.js` `migrate()`：

```text
PRAGMA table_info(tasks)
缺列 → ALTER TABLE ADD COLUMN
不重建表
不删旧列
CREATE INDEX idx_tasks_approval (engagement_id, status, risk_level)
```

改状态机时，如果只是新增状态值：

```text
不需要改表结构（status 是 TEXT）
但要改 TASK_STATUS / TASK_STATUSES / TASK_TRANSITIONS
```

如果新增字段：

```text
加进 CREATE TABLE
加进 migrate() 的 add('tasks', [...])
加进 test-migration / test-rollback
```

## 七、改状态机的 step-by-step

### 1. 先改判定层

`lib/judge.js`：

```js
export const TASK_STATUS = Object.freeze({
  ...,
  NEW_STATE: 'new_state',
})

export const TASK_STATUSES = ...
export const OPEN_TASK_STATUSES = ...
export const ACTIVE_TASK_STATUSES = ...
export const TERMINAL_TASK_STATUSES = ...

export const TASK_TRANSITIONS = {
  ...,
  [TASK_STATUS.X]: [TASK_STATUS.Y, TASK_STATUS.Z],
}
```

不要改 `canTransitionTask` 的语义。
如果新状态需要特殊判断，加单独的函数，不要塞进 store 的 if。

### 2. 改创建/更新

`store.createTask()`：

```text
新状态的初始条件
requires_approval 是否强制
```

`store.updateTask()`：

```text
是否需要额外 guard
时间戳字段
timeline detail
```

`store.approveTask()`：

```text
只处理 pending_approval → queued
不要把别的状态塞进来
```

### 3. 改规划

`lib/plan.js`：

```text
initialStatusForRisk()
planCandidates() 的候选 status
```

如果新状态影响自动派发，改 `blue_autopilot` 的过滤条件。

### 4. 改 UI

`lib/client.js`：

```text
状态文案（locale）
状态颜色
按钮显示条件
不允许前端直接改状态
```

`lib/ui.js`：

```text
新 op 必须校验状态
审批只走 approveTask
```

### 5. 加迁移/测试

```text
旧库启动
旧任务默认值
新状态迁移
非法迁移拒绝
审批路径
autopilot 不派发 high
rollback 仍可打开旧库
```

测试文件：

```text
scripts/test-tools.mjs
scripts/test-ui.mjs
scripts/test-migration.mjs
scripts/test-rollback.mjs
```

### 6. 更新文档

```text
docs/state-machines.md
docs/tool-map.md（如果新增工具）
docs/architecture.md
CHANGELOG.md
```

## 八、不要做的事

```text
不要在 client.js 里把 pending_approval 改成 queued
不要在 tools.js 里复制 TASK_TRANSITIONS
不要在 store.updateTask 里放业务分支
不要用 SQL 直接改 status 绕过 approveTask
不要把“已检测”写成“已阻断”
不要给终态加“重新打开”，除非明确设计并迁移历史数据
```

## 九、回归用例

```text
1. 创建 high 任务 → pending_approval / requires_approval=1
2. pending_approval → dispatched 被拒绝
3. approveTask(actor='') 被拒绝
4. approveTask 成功 → queued + approved_by/at + timeline approval
5. 未审批 high 即使手工 queued，autopilot 也不派发
6. approved high 派发 → dispatch 带 approved_by/at
7. 改角色导致 high → 回到 pending_approval，审批字段清空
8. dispatched/running 任务不能 reclassify
9. 终态任务不能迁移
10. 连续 cycle 第二次触发 cooldown
11. max_rounds=1 后第二次触发 round_limit
12. 旧库启动后 tasks 新列存在，旧任务 risk_level='low'
```
