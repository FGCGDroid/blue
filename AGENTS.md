# AGENTS.md — 蓝队插件 P0 风险闸任务清单

> 目标：把“自主规划”和“自主动手”切开。  
> 范围：只做 P0。P1/P2/P3 不在本清单的完成标准内。  
> 前提：本项目是授权防守场景工具；不要对真实主机执行隔离、删除、防火墙修改等动作，测试只用临时 SQLite 和假数据。

## 0. 当前事实（实现前先读）

- 任务表当前没有风险字段，见 `lib/store.js` 的 `CREATE TABLE tasks`。
- `blue_autopilot` 的 `plan/cycle` 会把 `planCandidates()` 生成的任务直接写成 `queued`，`next/cycle` 再直接改成 `dispatched`，见 `lib/tools.js`。
- 任务书由 `buildTaskPrompt()` 生成；`dispatch` 参数里目前只有 `description/prompt/agent_preset`。
- 任务状态目前只有 `queued/dispatched/running/done/blocked/cancelled`。
- 当前工具数 28；新增审批工具后要同步 `README.md`、`scripts/test-tools.mjs` 和角色工具白名单。

## 1. 必须实现的语义

### 1.1 风险等级

```ts
type RiskLevel = 'low' | 'medium' | 'high'
```

| 等级 | 典型任务 | 自动派发 |
| --- | --- | --- |
| low | 只读排查、日志确认、IOC 提取、报告 | 可以 |
| medium | 非破坏性配置核对、可回滚加固建议、服务重启评估 | 可以，但必须记录 |
| high | 隔离主机、删除/隔离文件、改防火墙、杀进程、禁用账号、重置凭据、改启动项/内核参数 | **不可以** |

规则：

- `ir` / `hardening` 角色中，凡是会产生上述 high 动作的任务，`risk_level = 'high'`。
- `risk_level = 'high'` 时强制 `requires_approval = true`，任务初始状态为 `pending_approval`。
- 不允许通过 `blue_task_create`、`blue_autopilot plan`、`blue_autopilot cycle` 的任何参数绕过。
- 只有显式审批动作能把 `pending_approval` 改成 `queued`。

### 1.2 状态机

新增状态：

```text
pending_approval
```

合法迁移：

```text
queued          -> dispatched | cancelled
pending_approval -> queued (仅审批) | cancelled
dispatched      -> running | done | blocked | cancelled
running         -> done | blocked | cancelled
done / blocked / cancelled -> 终态
```

禁止：

- `pending_approval -> dispatched`（必须经过 `queued`）；
- 任何工具把 `high` 任务直接从 `queued` 派发；
- 审批动作只改状态但不写审计。

### 1.3 审批审计

`tasks` 新增：

```sql
risk_level TEXT NOT NULL DEFAULT 'low'
requires_approval INTEGER NOT NULL DEFAULT 0
approved_by TEXT
approved_at TEXT
approval_note TEXT
```

审批必须同时：

1. 写 `approved_by` / `approved_at` / `approval_note`；
2. 写 `timeline`，`action = 'approval'`，`detail` 至少包含 `task_id`、`risk_level`、`decision=approved`；
3. 把任务状态改成 `queued`。

建议新增 `blue_task_approve` 工具，不要复用 `blue_task_update` 的 `status` 参数来做审批。

## 2. 数据层任务

### T1 — tasks schema 与迁移

**文件**：`lib/store.js`

要求：

- `CREATE TABLE tasks` 加上述 5 个字段。
- 对已存在的数据库做幂等迁移：用 `PRAGMA table_info(tasks)` 检查列，缺哪列补哪列，不要直接重建表。
- 新增索引：`idx_tasks_approval (engagement_id, status, risk_level)`。
- `createTask()` 写入 `risk_level/requires_approval`，默认 `low/0`。
- `getTask()`、`listTasks()` 返回新字段。
- `stats()` 增加：

```text
tasks_pending_approval
tasks_high_risk
```

- 新增 `approveTask(id, { actor, note })`：
  - 只接受 `pending_approval`；
  - 设置审批字段和 `queued`；
  - 写 timeline `approval`；
  - 原子更新，失败回滚（`this.db.transaction` 或等价）。

**验收**：

- 新库和旧库都能启动；
- 旧库任务自动有 `risk_level='low'`、`requires_approval=0`；
- 对非 `pending_approval` 调 `approveTask` 抛出明确错误；
- 审批后 timeline 恰好一条 `approval` 事件。

### T2 — 风险分类器

**文件**：`lib/plan.js`

要求：

- 新增 `inferRisk(candidate)` 或 `riskForTask(role, title, brief, metadata)`。
- 至少覆盖：
  - `role=ir` 且标题/简报含 `隔离|isolate|断网|封禁|firewall|iptables|kill|删除|delete|清除|disable|锁定|reset` → `high`；
  - `role=hardening` 且含 `防火墙|防火墙规则|firewall|iptables|内核|启动项|ssh|凭据|密码` → `high`（纯检查建议可以是 `medium`，但不要自动执行）；
  - 其余 `ir` 为 `medium`，`hunt/monitor/intel` 为 `low`，纯加固建议为 `medium`。
- `planCandidates()` 返回的每个 candidate 必须带 `risk_level` 与 `requires_approval`。
- 增加一个集中函数 `initialStatusForRisk(riskLevel)`，不要在多个文件里散写 `if high`。

**验收**：

- 构造 ir + “隔离主机 10.0.0.5” → `high/true/pending_approval`；
- 构造 monitor + “确认日志接入” → `low/false/queued`；
- 构造 hardening + “检查防火墙规则并给出建议” → 至少 `medium`，不自动执行删除/修改。

### T3 — 任务创建/更新保护

**文件**：`lib/tools.js`

要求：

- `blue_task_create` 参数增加：

```text
risk_level: low | medium | high
requires_approval: boolean
```

- 如果 `risk_level=high`，无条件覆盖为 `requires_approval=true`，初始 `pending_approval`。
- `blue_task_update` 禁止把 `pending_approval` 直接改成 `dispatched/running`；只能改成 `cancelled`，或由 `blue_task_approve` 改成 `queued`。
- 新增 `blue_task_approve`：

```text
parameters: engagement?, task_id, actor?, note?
```

  - 只接受高风险/待审批任务；
  - 返回审批后的任务和新的 stats；
  - 在描述中明确“这是人工放行，必须由控制台/人类触发”。

**验收**：

- 手工创建 high 任务后状态为 `pending_approval`；
- 直接 `blue_task_update(status=dispatched)` 被拒绝；
- `blue_task_approve` 后状态 `queued`，审批字段和时间线齐全。

## 3. 派发层任务

### T4 — autopilot 风险闸

**文件**：`lib/tools.js`，函数：`blue_autopilot` 的 `plan/cycle/next`

要求：

- `plan` 创建 high 任务时写 `pending_approval`，不进入可派发队列。
- `next/cycle` 只领取：

```sql
status = 'queued' AND risk_level <> 'high'
```

- 即使数据库里出现异常的 `high + queued`，也要在派发前再拦截一次，返回：

```json
{
  "ok": false,
  "reason": "approval_required",
  "task_id": "TSK-...",
  "risk_level": "high",
  "note": "先调用 blue_task_approve 或控制台放行"
}
```

- `dispatch` 参数包增加：

```json
{
  "task_id": "...",
  "risk_level": "high",
  "requires_approval": true,
  "approved_by": "...",
  "approved_at": "...",
  "scope": "...",
  "constraints": "...",
  "expected_output": "..."
}
```

P0 只要求 `risk_level/requires_approval/approved_by/approved_at`；`scope/constraints/expected_output` 可留占位，P3 再完善。

**验收**：

- 模拟 `ir` 任务“隔离主机”后执行 `cycle`，返回中**没有该任务的 dispatch**；
- 审批后再次 `cycle`，该任务只出现一次；
- low/medium 任务仍能正常自动派发；
- 已审批的 high 任务在 `dispatch` 里带审批信息。

### T5 — 轮次与冷却

**文件**：`lib/tools.js`，复用 `store.getMeta/setMeta`

建议 meta key：

```text
autopilot:rounds:<engagementId>
autopilot:last_cycle:<engagementId>
autopilot:max_rounds:<engagementId>
autopilot:cooldown_sec:<engagementId>
```

要求：

- 默认 `max_rounds = 12`（单场），`cooldown_sec = 30`。
- `cycle` 前检查：
  - 超过 `max_rounds`：返回 `reason='round_limit'`；
  - 距上次 cycle 小于 cooldown：返回 `reason='cooldown'` 和剩余秒数。
- 成功后写 `last_cycle` 并递增 rounds；`plan` 不占 rounds。
- `set_slots` 不清空轮次；需要重置时提供显式 `reset_rounds`（可选，P0 可只支持 `set_max_rounds`）。

**验收**：

- 连续两次 `cycle` 第二次返回 `cooldown`；
- 设置 `max_rounds=1` 后第二次返回 `round_limit`；
- 审批/人工操作不受 cooldown 影响。

## 4. 控制台与 API 任务

### T6 — Host API

**文件**：`lib/ui.js`

要求：

- 新增 op `approveTask`：

```json
{ "op": "approveTask", "task": "TSK-...", "note": "人工放行" }
```

- 调用 `store.approveTask()`，返回任务和 stats。
- `overview` 返回的 tasks 自然带新字段；stats 带 `tasks_pending_approval`。
- 审批接口必须同源校验，沿用现有 `/blue/api` 保护。

**验收**：

- `POST /blue/api` 可审批；
- 审批后 overview 的 pending 数减少、queued 数增加；
- 非法 task/非 pending 返回 JSON 错误。

### T7 — 控制台 UI

**文件**：`lib/client.js`

要求：

- 任务表显示 `risk_level` 徽标：low 灰、medium 黄、high 红。
- `pending_approval` 显示“待审批”状态，操作按钮为 **批准** / **取消**。
- 批准按钮调用 `approveTask`，成功后刷新；必须显示审批人/时间。
- 概览显示 `tasks_pending_approval`（可放在“任务”统计卡或待办区）。
- 不要在前端自己把 high 任务改成 queued；只调用 Host API。

**验收**：

- 控制台可看到 high/pending 任务；
- 点批准后任务变为 queued；
- 不出现“前端直接 dispatch”路径。

## 5. 白名单与文档

### T8 — 工具白名单与计数

**文件**：

- `lib/playbooks.js`
- `presets/blue/agent.cordis.yml`
- `presets/blue/worker.cordis.yml`
- `README.md`
- `scripts/test-tools.mjs`

要求：

- 把 `blue_task_approve` 加入指挥官/控制台可用工具；不要把审批权限下放给普通 worker。
- 工具数从 28 改成 29（或实际数），同步 README。
- `test-tools.mjs` 更新预期工具数，并加入 P0 回归用例。

**验收**：

- 工具列表包含审批工具；
- 非指挥官角色不能审批；
- 文档不再写“自动派发一切任务”。

## 6. 必测回归（P0 完成门槛）

用一个临时数据库，不执行真实隔离/删除：

```text
1. 建 engagement
2. 建 ir 任务：title=隔离主机 10.0.0.5，risk_level=high
3. 断言：status=pending_approval，requires_approval=1
4. 调 blue_autopilot cycle
5. 断言：dispatch 列表中没有该任务
6. 调 blue_task_approve
7. 断言：status=queued，approved_by/at 存在，timeline 有 approval
8. 再 cycle
9. 断言：该任务只 dispatch 一次，dispatch.risk_level=high
10. 建 low 任务，cycle 仍可自动派发
11. 连续 cycle 第二次触发 cooldown
12. 设 max_rounds=1，再 cycle 触发 round_limit
```

必须同时跑：

```bash
node scripts/test-tools.mjs
node scripts/test-ui.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

## 7. 实施顺序（建议）

1. `store.js` schema/迁移 + `approveTask`；
2. `plan.js` 风险分类 + 初始状态；
3. `tools.js` task_create 保护 + autopilot 闸 + 新审批工具；
4. `playbooks.js` / presets 白名单；
5. `ui.js` / `client.js` 审批入口；
6. 测试、文档、计数；
7. 最后再考虑 P1/P2/P3。

## 8. 非目标（P0 不要做）

- 不接入真实 EDR/防火墙/SSH 执行器；
- 不做多级审批流/工单系统；
- 不重写任务书渲染（P3）；
- 不扩大自动派发权限；
- 不以“减少点击”为理由绕过审批。

## 9. 完成定义

- 高风险任务永远不会直接进入 `dispatched`；
- 审批路径唯一、可审计、可回滚到 `cancelled`；
- low/medium 的现有自主循环不被破坏；
- 控制台能看见并处理 `pending_approval`；
- 所有测试通过，文档/工具数与实现一致。
