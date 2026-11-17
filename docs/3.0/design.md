# 3.0 详细设计

> 状态：M1 骨架已建立，未实现业务
> 基线：2.0.0（`646a8ea`）  
> 适用：3.0.0（内核）与 3.1.0（控制台）  
> 本文是实现依据；与 `docs/3.0/README.md`、`backlog.md`、`decisions.md` 一起读。

## 0. 本文怎么用

```text
M0  用第 11 节定测试向量
M1  用第 2、3 节搭骨架
M2  用第 5 节做数据层
M3  用第 6 节做路径阻断与策略引擎
M3.5 用第 4.3.1、6.11、9.3 做响应、指标、外锚
M4  用第 7、13 节迁工具
M4.5 用第 8、11 节做兼容与影子双跑
M5  用第 8 节接控制台
```

文中“必须”是 3.0.0 的验收项；“可以”是允许的实现选择；“不做”是明确排除。

## 1. 3.0 的完成定义

3.0.0 必须同时过两门。

### 1.1 兼容门

```text
1. 现有 66 个 blue_* 工具名称、参数、返回结构、错误结构不变
2. 任务状态机、审批语义、高风险拦截不变
3. 17 张表的名字与列名不变，2.0 库可迁移、可回滚
4. 路径阻断先于 body 读取，40 条对抗向量全绿
5. canary 保护路径上游命中数为 0
6. timeline 哈希、证据包签名与验签与 2.0 固定向量一致
7. 2.0 控制台可直接连 3.0 Host API
8. 全量测试、迁移演练、影子双跑通过
```

### 1.2 跨越门

```text
K1 真阻断：策略判定在 body 之前，block 立即返回
K2 策略可测试：版本化、validate / test / diff / reload
K3 受控响应：dry-run、审批、适配器、执行后验证、可回滚
K4 运营可见：/metrics、/healthz、每规则计数
K5 证据外锚：file / HTTPS webhook，可验证
```

兼容门决定 3.0 是升级；跨越门决定 3.0 是 3.0。  
只过兼容门，版本号只能叫 2.5。

## 2. 架构总览

### 2.1 分层

```text
┌──────────────────────────────────────────────┐
│ v3/tools      工具适配器：现有 66 + 新增     │
├──────────────────────────────────────────────┤
│ v3/app        用例：建任务、审批、派发、取证  │
├──────────────────────────────────────────────┤
│ v3/domain     纯逻辑：状态机、风险、路径策略  │
├──────────────────────────────────────────────┤
│ v3/infra      SQLite、HTTP、OTLP、Ed25519、metrics │
└──────────────────────────────────────────────┘
```

依赖方向：

```text
domain    不 import 任何上层
app       可以 import domain、ports
infra     可以 import domain、ports
tools     可以 import app
bootstrap 可以 import 全部
```

必须能用一个脚本检查：

```text
v3/domain/**  出现 from '../infra' 或 from '../tools' → 失败
v3/app/**     出现 node:sqlite / node:http 直接调用 → 失败
v3/tools/**   出现 INSERT/UPDATE/SELECT 字符串 → 失败
```

### 2.2 运行时组件

3.0 保持 2.0 的 Cordis 服务名与加载方式：

| 组件 | 服务 | 职责 |
| --- | --- | --- |
| `v3/index.js` | `blueTeamMode` | 资源路径、技能同步、版本 |
| `v3/store.js` | `blueTeam` | SQLite 句柄、迁移、仓储装配 |
| `v3/tools.js` | `blue-tools` | 注册 66 个工具 |
| `v3/ui.js` | `blue-ui` | `/blue/api` Host API |
| `v3/gateway.js` | 独立进程 | 网关、策略加载、决策日志、/metrics、/healthz |
| `v3/otlp.js` | 复用 `blue-ui` 路由 | OTLP 接收 |

3.0 的 `ctx.blueTeam` 不再直接暴露“万能 store”，而是暴露一个受控门面：

```js
ctx.blueTeam = {
  app: {               // 用例入口
    tasks, alerts, incidents, evidence,
    policy, response, anchor,
  },
  root,                // 数据目录
  close(),
  // 兼容层：只给 2.0 控制台与旧脚本用
  legacy: { ... },
}
```

`legacy` 只保留 2.0 控制台实际调用的方法，不允许新代码使用。

### 2.3 为什么不是微服务

```text
单机 CTF 防守，进程越少越可靠
SQLite 是单文件事实库，拆服务只会增加一致性问题
网关是唯一需要独立进程的组件，因为它要监听端口并隔离崩溃
```

## 3. 目录与启动

### 3.1 目录

```text
v3/
  index.js
  store.js
  tools.js
  ui.js
  gateway.js
  bootstrap/
    config.js
    container.js
    lifecycle.js
  ports/
    task-repo.js
    fact-repo.js
    timeline-repo.js
    evidence-repo.js
    telemetry-repo.js
    policy-repo.js
    anchor-sink.js
    clock.js
    ids.js
  domain/
    task/
      states.js
      risk.js
      model.js
      invariants.js
    incident/states.js
    decoy/states.js
    response/states.js
    evidence/hash.js
    gateway/
      normalize.js
      policy.js
      decision.js
    shared/
      json.js
      time.js
      errors.js
  app/
    tasks/create.js
    tasks/update.js
    tasks/approve.js
    tasks/dispatch.js
    tasks/autopilot.js
    alerts/ingest.js
    alerts/triage.js
    incidents/open.js
    evidence/export.js
    evidence/verify.js
    gateway/evaluate.js
    policy/validate.js
    policy/test.js
    policy/diff.js
    policy/reload.js
    response/execute.js
    response/verify.js
  infra/
    sqlite/
      db.js
      migrations/
        001-base.js
        002-from-2.0.js
      repos/
        tasks.js
        facts.js
        timeline.js
        evidence.js
        telemetry.js
    gateway/
      server.js
      read-body.js
      forward.js
      decision-log.js
      canary.js
    metrics/
      server.js
      counters.js
    evidence/
      bundle.js
      anchor.js
      anchor-sink.js
    policy/
      store.js
      reload.js
    telemetry/
      file.js
      otlp.js
      detection.js
    fs/safe-path.js
  tools/
    session.js
    asset.js
    alert.js
    finding.js
    ioc.js
    task.js
    incident.js
    decision.js
    timeline.js
    report.js
    decoy.js
    detection.js
    telemetry.js
    control.js
    cve.js
    risk.js
    evidence.js
    audit.js
    response.js
    response-exec.js
    policy.js
    gateway.js
    hunt.js
    catalog.js
  ui/
    host-api.js
    legacy-view.js
```

### 3.2 启动顺序

```text
1. 解析 BLUE_HOME / DSH_HOME
2. 打开 SQLite（WAL、busy_timeout、foreign_keys）
3. 读 meta.schema_version
4. 需要时执行迁移（先备份）
5. 装配仓储与 app
6. 发布 ctx.blueTeam
7. 注册工具
8. 挂 Host API
9. 网关单独启动（不由 Host 自动监听）
```

任何一步失败：

```text
数据层失败 → 不发布服务，插件挂载失败
Host API 失败 → 记录错误，不影响工具
网关失败 → 独立进程退出，不影响 Host
```

### 3.3 配置

```text
BLUE_HOME                 数据目录，默认 $DSH_HOME/blue
BLUE_DB                   数据库路径，默认 <BLUE_HOME>/blue.db
BLUE_GATEWAY_MODE         off | observe | enforce，默认 enforce
BLUE_GATEWAY_HOST         监听地址，默认 127.0.0.1
BLUE_GATEWAY_PORT         监听端口，默认 8787
BLUE_GATEWAY_POLICY       策略文件路径，默认 <BLUE_HOME>/path-policy.json
BLUE_GATEWAY_LOG          决策日志路径，默认 <BLUE_HOME>/gateway-decisions.jsonl
BLUE_GATEWAY_UPSTREAM     上游，默认 http://127.0.0.1:8080
BLUE_ANCHOR_SINKS       外锚 sink 配置，默认 <BLUE_HOME>/anchor-sinks.json
BLUE_TELEMETRY_ROOT       遥测允许的额外根目录
```

配置错误处理：

```text
模式非法 → 拒绝启动
策略文件不存在 → 使用内置最小策略
策略 JSON 非法 → 拒绝启动（fail-closed）
上游非回环且未 allowPublicUpstream → 拒绝启动
端口被占用 → 拒绝启动，不自动换端口
```

## 4. 领域模型

### 4.1 实体

| 实体 | 表 | 关键字段 |
| --- | --- | --- |
| Engagement | `engagements` | id, name, scope, status |
| Asset | `assets` | engagement_id, dedupe, kind, address, criticality |
| Alert | `alerts` | fingerprint, severity, status, raw, event_time |
| Finding | `findings` | severity, category, status, cve, evidence |
| Incident | `incidents` | severity, status, owner, summary |
| Task | `tasks` | role, priority, status, risk_level, approval 字段 |
| Decision | `decisions` | decision, rationale, confidence, evidence |
| Decoy | `decoys` | kind, token, status, hit_count, expires_at |
| DecoyHit | `decoy_hits` | decoy_id, source, severity, event_key |
| IOC | `iocs` | type, value, confidence, first_seen |
| TimelineEvent | `timeline` | actor, action, target, detail, prev_hash, hash |
| TelemetrySource | `telemetry_sources` | path, status, cursor, counters |
| Control | `controls` | control_key, status, evidence |
| AuditAnchor | `audit_anchors` | head_hash, signature, public_key |
| ResponseAction | `response_actions` | action, target, rollback, status |
| DetectionRule | `detection_rules` | rule_key, selection, condition, enabled |
| Meta | `meta` | key, value |

3.0.0 不改变表的数量、名字、列名、id 前缀。

### 4.2 任务状态机

状态：

```text
queued
pending_approval
dispatched
running
done
blocked
cancelled
```

合法迁移：

| from | to | 触发 |
| --- | --- | --- |
| queued | dispatched | 派发 |
| queued | cancelled | 取消 |
| pending_approval | queued | **仅审批** |
| pending_approval | cancelled | 取消 |
| dispatched | running | 领取 |
| dispatched | done / blocked / cancelled | 回收或完成 |
| running | done / blocked / cancelled | 完成或失败 |
| done / blocked / cancelled | — | 终态 |

不变量：

```text
risk_level=high  => requires_approval=1 且初始 pending_approval
pending_approval 不能直接到 dispatched/running
没有 approved_at 的 high 任务不能被派发
每次状态变化必须写 timeline
终态不能再迁移
```

审批事务：

```text
BEGIN
  UPDATE tasks SET status='queued', approved_by=?, approved_at=?, approval_note=?
  WHERE id=? AND status='pending_approval'
  if changes != 1 -> ROLLBACK
  INSERT timeline(action='approval')
COMMIT
```

### 4.3 案件、诱饵、响应

案件：

```text
open -> investigating | contained | closed
investigating -> open | contained | closed
contained -> investigating | closed
closed -> open
```

诱饵：

```text
planned -> active | retired
active -> retired
retired -> 终态
```

响应动作：

```text
planned -> applied | cancelled
applied -> rolled_back
rolled_back / cancelled -> 终态
```

响应约束：

```text
只有审批过的任务才能 applied
applied 必须写执行证据
只有 applied 才能 rolled_back
```

### 4.3.1 受控响应执行（K3）

2.0 只到 `planned`；3.0 增加执行适配器，但默认不执行命令。

```text
response_plan
  -> response_execute(mode=dry-run)     只返回命令，不产生副作用
  -> 人工审批
  -> response_execute(mode=apply)       执行适配器，写证据
  -> response_verify                    检查目标状态
  -> response_execute(mode=rollback)    失败或回滚
```

适配器：

```text
manual   默认，只生成命令文本，不执行
command  可选，执行配置的命令模板；必须显式启用，仍走审批
```

安全约束：

```text
没有 approved_at 不能 apply / rollback
dry-run 不写库、不执行
apply 必须写执行证据
rollback 必须写回滚证据
执行失败保持 planned，不伪造 applied
```

真实 `iptables` / `nft` / `fail2ban` / 删除 / 杀进程在 3.0.0 不自动执行；`command` 适配器只做受控封装，默认关闭。

### 4.4 风险分级

3.0.0 保留 2.0 的判定行为，不“顺手优化”：

```text
1. 显式 risk_level=high 直接 high
2. ir/hardening + 破坏性动作 + 敏感面 => high
3. 其余 ir => medium
4. hardening 含敏感面 => medium，否则 low
5. monitor/intel/hunt => low
```

破坏性动作与敏感面的正则必须从 2.0 原样搬过来，并加固定向量。  
任何调整都放到 3.2，不在 3.0.0 做。

## 5. 数据层

### 5.1 表清单

17 张表，顺序与 2.0 一致：

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

3.0.0 只允许两种变更：

```text
1. meta 增加 schema_version 键
2. 增加必要索引（不改列语义）
```

不允许：

```text
改表名
改列名
改列类型
删列
把 JSON 列拆成多表
```

理由：2.0 控制台、证据包、旧脚本都按这些列读；拆表会把 3.0 变成不兼容升级。

### 5.2 仓储端口

`ports/` 只定义接口，不实现：

```text
TaskRepo        create get update list approve
FactRepo        asset alert finding ioc incident decoy
TimelineRepo    append list verify
EvidenceRepo    anchor list
TelemetryRepo   source cursor
MetaRepo        get set
Clock           now
Ids             next(prefix)
```

规则：

```text
 app 只依赖端口
 infra 实现端口
 domain 不知道端口存在
 测试可以注入内存实现
```

### 5.3 事务边界

必须在一个事务里的操作：

```text
审批：任务状态 + timeline
派发：任务状态 + timeline
告警转任务：alert 状态 + task + timeline
响应计划：task + response_action + timeline
证据导出：bundle 写入 + timeline
迁移：全部 DDL + schema_version
```

`node:sqlite` 的同步 API 可以直接用 `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`。  
不要用嵌套事务；需要时用保存点。

### 5.4 迁移

2.0 没有 `schema_version`。3.0 启动时：

```text
1. 读 meta.schema_version
2. 没有：按 2.0 处理，执行 002-from-2.0
3. 有且为 3.0：只跑幂等检查
4. 有但不是 3.0：拒绝启动并提示
```

迁移步骤：

```text
1. 关闭写入入口
2. VACUUM INTO <BLUE_HOME>/backups/blue-pre-3.0-<ts>.db
3. BEGIN IMMEDIATE
4. 幂等补列/补索引
5. 设置 meta.schema_version='3.0'
6. COMMIT
7. PRAGMA integrity_check
8. 每个 engagement 跑 verifyTimeline
9. 失败：关闭库，恢复备份，重新打开
```

备份要求：

```text
迁移前必须有备份
备份文件不能覆盖
备份路径写进日志
```

回滚：

```text
1. 停止 Host 与网关
2. 用备份替换 blue.db
3. 删除 blue.db-wal / blue.db-shm
4. 重启
5. 跑一次 verifyTimeline
```

M2 用至少 3 个合成 2.0 库样本演练（没有真实数据），包括：

```text
空库
有任务/告警/时间线的库
有时间线缺 hash 的旧库
```

迁移代码仍然保留：本项目没有真实数据，但 npm 上的 2.0 用户可能升级。

### 5.5 时间线哈希

必须与 2.0 完全一致：

```js
sha256(JSON.stringify([
  prevHash || '',
  engagement_id,
  at,
  actor,
  action,
  target,
  detail,
]))
```

注意：

```text
JSON.stringify 的数组格式不能改
null 和 '' 不能混
字段顺序不能改
UTF-8 原样
```

固定向量：

```json
{
  "engagement_id": "ENG-TEST",
  "at": "2026-01-01T00:00:00.000Z",
  "actor": "tester",
  "action": "note",
  "target": "x",
  "detail": "y",
  "prev_hash": ""
}
```

期望 hash 由 2.0 生成后写入 `test/vectors/timeline.json`，3.0 必须逐字节一致。

## 6. 路径阻断内核

这是 3.0 的核心。其他模块可以晚，这个不能错。

### 6.0 部署边界

3.0 网关必须：

```text
独立进程运行，不嵌入 DSH
独立端口监听，默认 127.0.0.1:8787
端口被占用时拒绝启动，不自动换端口
不由 DSH Host 自动拉起
不读取 DSH 进程内存或句柄
不直接写 blue.db；决策日志写 JSONL，避免与 Host 争锁
```

原因：

```text
2.0 曾对与 DSH 同进程的目标做 2MB 压测，把 DSH 打崩
网关是唯一直接面对不可信请求的组件，必须能单独崩溃、单独重启
```

允许的部署：

```text
浏览器 -> 网关 127.0.0.1:8787 -> 上游 127.0.0.1:8080
```

不允许：

```text
把网关挂进 DSH Web 进程
网关和 DSH 共用端口
网关崩溃导致 DSH 退出
网关与 DSH 同进程做压力测试
```

### 6.1 威胁模型

```text
攻击者能控制：请求方法、原始 URL、查询串、请求头、body
攻击者不能控制：网关策略文件、上游服务代码
目标：不让请求以任何编码形式到达受保护的上游路径
```

攻击面：

```text
路径编码：%2e、%2f、%5c、%00、双重编码、超长 UTF-8
路径结构：..、.、//、尾随点/空格、分号参数
代理头：X-Original-URL、X-Rewrite-URL、X-Forwarded-Prefix
请求形式：absolute-form、authority-form、asterisk-form
大小写：/ADMIN vs /admin
上游差异：网关规范化与上游规范化不一致
```

### 6.2 管线

固定顺序，不能调换：

```text
1. 方法/请求行合法性
2. 请求头走私检查（CL/TE）
3. 绕过头上限检查
4. 原始 URL 规范化
5. 策略判定
6. block → 立即响应，不读 body
7. allow → 读 body（带上限）
8. body 内容检查（JWT、原型污染、权限字段）
9. 转发（规范化路径 + 原查询串）
```

关键点：

```text
路径阻断必须发生在 readBody 之前
CL/TE 是头检查，可以发生在 body 之前
body 内容检查发生在路径放行之后
```

### 6.3 规范化算法

入口：

```js
normalizeRequestPath(rawUrl, policy) -> {
  ok: boolean,
  canonical: string,
  query: string,
  reason: string,
  detail: string,
}
```

步骤：

```text
1. rawUrl 必须是字符串，长度 <= max_path_length（默认 4096）
2. 空串拒绝 EMPTY
3. 以 http:// 或 https:// 开头：按 absolute-form 解析，取 pathname + search
4. 以 * 开头：拒绝 ASTERISK_FORM
5. 不含 / 开头：拒绝 NOT_ORIGIN_FORM
6. 按第一个 ? 切分 path 与 query
6.1 path 含 # → 拒绝 FRAGMENT
7. path 中不允许控制字符（0x00-0x1f、0x7f）
8. path 中不允许反斜杠
8.1 原始 path 含 %2f 或 %5c（大小写不敏感）→ 拒绝 ENCODED_SEPARATOR
9. 百分号解码一次：
   - 非法 % 序列 → 拒绝 BAD_PERCENT
   - 解码结果仍是合法 %XX → 拒绝 DOUBLE_ENCODED
10. 解码后再查控制字符、反斜杠、NUL
11. 按 / 切段：
    - 空段丢弃（折叠 //）
    - "." 或 ".."：默认拒绝 DOT_SEGMENT
    - 只有 allow_dot_segments=true 才按 RFC 3986 解析；逃逸拒绝 TRAVERSAL
    - 段内含 ";"：默认拒绝 MATRIX_PARAM
    - 段尾是 "." 或空格：拒绝 SUSPICIOUS_SEGMENT
12. 重新拼成 "/" + segments.join("/")
13. 根路径归一为 "/"
14. 去尾斜杠，根除外
15. Unicode NFC 归一
16. 返回 canonical
```

边界匹配：

```text
保护前缀 /admin 匹配 /admin 和 /admin/...
不匹配 /administrator、/admin2
比较默认大小写不敏感
```

大小写策略：

```text
canonical 保留原始大小写
比较时统一 lower()
转发时用 canonical 原文
```

### 6.4 策略模型

```json
{
  "version": 1,
  "default_action": "allow",
  "case_insensitive": true,
  "max_path_length": 4096,
  "reject_semicolon": true,
  "protected": [
    {
      "id": "admin",
      "prefix": "/admin",
      "action": "block",
      "allow": ["/admin/login"]
    }
  ],
  "deny": [
    { "id": "dotfiles", "prefix": "/.git", "action": "block" }
  ]
}
```

判定顺序：

```text
1. deny 命中 → block
2. protected 命中：
   a. allow 精确/前缀命中 → allow
   b. 否则 block
3. 其他 → default_action
```

内置不可关闭的拒绝项：

```text
/.git
/.svn
/.env
/server-status
/actuator/env
/actuator/heapdump
/debug/pprof
```

这些即使策略文件写 allow 也拒绝。  
理由：这些路径没有“业务上必须经网关访问”的正当理由。

策略校验：

```text
version 必须为 1
prefix 必须以 / 开头
prefix 不能只是 /
allow 必须是被保护前缀下的路径
重复 id 拒绝
非法 JSON 拒绝启动
```

### 6.4.1 策略生命周期（K2）

2.0 的路径规则写死在 `inline-guard.js`；3.0 必须做到改策略不改代码。

文件：

```text
<BLUE_HOME>/path-policy.json
<BLUE_HOME>/path-policy.history/<sha256>.json
```

能力：

```text
validate  解析 + 校验，不启动网关
test      对 test/vectors/path.json 跑策略，输出 allow/block
diff      比较两个策略文件的规则差异
reload    校验后原子替换；非法保留旧策略并告警
```

热加载：

```text
网关启动时加载策略
文件 mtime 变化时重新读取
新策略非法：保留旧策略，写错误日志，/metrics 计数
新策略合法：切换，决策日志记录 policy_hash
```

策略摘要：

```text
sha256(canonical JSON).slice(0, 16)
```

决策日志、/metrics、`blue_gateway_status` 都必须带这个摘要。  
没有摘要，就无法证明“当时用的是哪版策略”。

### 6.5 绕过头

出现即拒绝，返回 400：

```text
x-original-url
x-rewrite-url
x-forwarded-prefix
x-forwarded-uri
x-forwarded-path
x-envoy-original-path
```

理由：这些头会让上游按另一个路径路由，网关看到的路径就不是实际路径。  
不做“删掉再转发”，直接拒绝，避免上游有其它解释。

### 6.6 决策对象

```js
{
  request_id: "GW-...",
  at: "2026-11-17T...",
  remote: "127.0.0.1",
  method: "GET",
  raw_path: "/%61dmin",
  canonical_path: "/admin",
  query: "",
  decision: "block",
  rule_id: "admin",
  reason: "PROTECTED_PREFIX",
  policy_version: 1,
  upstream_status: 0,
  duration_ms: 0
}
```

日志：

```text
block 全量记录
allow 默认不记录，可配置
日志文件按 10 MiB 轮转一次
日志不记录 cookie、authorization、body
```

### 6.7 fail-closed

| 情况 | 行为 |
| --- | --- |
| 策略文件非法 | 网关拒绝启动 |
| 策略缺失 | 用内置最小策略启动 |
| 规范化异常 | 400，不转发 |
| 未知异常 | 500，不转发 |
| 上游超时 | 502 |
| 日志写失败 | 请求继续，计数器加一 |
| body 超限 | 413，不转发 |

原则：**不能确定安全时，不转发。**

### 6.8 canary

测试用上游：

```text
GET /__canary__/admin   -> 200，hit_count++
GET /admin             -> 200，hit_count++
```

验收：

```text
1. 直接请求 canary，上游 hit_count 必须为 0
2. 所有编码变体请求 canary，hit_count 必须为 0
3. 放行 /public，hit_count 正常增加
4. 失败时打印最后一次决策对象
```

canary 只在测试 harness 使用，不自动部署到生产。

### 6.9 转发规则

```text
路径：canonical + 原 query
Host：上游 host:port
删除 hop-by-hop 头
删除绕过头（如果没提前拒绝）
content-length 按实际 body 重算
不添加 x-forwarded-*，避免上游误信
```

行为变化：

```text
2.0 只检查 %2e/%2f、点段、//、NUL
2.0 转发 req.url 原文
2.0 默认监听随机端口
3.0 额外拒绝：
  - %5c 与编码分隔符
  - absolute-form 中的保护路径
  - 绕过头
  - 分号参数
  - 尾随点/空格
  - 解码后的控制字符
3.0 转发 canonical 路径，不转发原始编码
3.0 默认固定 127.0.0.1:8787，端口占用拒绝启动
```

这是有意的安全变化。  
依赖原始编码的上游可能受影响，M4.5 必须用真实上游回归。

### 6.10 对抗向量

至少 40 条，下面列 24 条核心：

| 输入 | 期望 | 原因 |
| --- | --- | --- |
| `/admin` | block | PROTECTED_PREFIX |
| `/admin/` | block | PROTECTED_PREFIX |
| `//admin` | block | PROTECTED_PREFIX |
| `/./admin` | block | DOT_SEGMENT |
| `/foo/../admin` | block | DOT_SEGMENT |
| `/%61dmin` | block | PROTECTED_PREFIX |
| `/%2e%2e/admin` | block | DOT_SEGMENT |
| `/%252e%252e/admin` | block | DOUBLE_ENCODED |
| `/admin%2f..%2fpublic` | block | ENCODED_SEPARATOR |
| `/ADMIN` | block | PROTECTED_PREFIX |
| `/admin;foo` | block | MATRIX_PARAM |
| `/admin%00` | block | CONTROL_CHAR |
| `/admin%09` | block | CONTROL_CHAR |
| `/admin%0d%0a` | block | CONTROL_CHAR |
| `/admin\..\public` | block | BACKSLASH |
| `http://host/admin` | block | PROTECTED_PREFIX |
| `/../admin` | block | DOT_SEGMENT |
| `/%c0%ae%c0%ae/admin` | block | BAD_UTF8 |
| `/admin.` | block | SUSPICIOUS_SEGMENT |
| `/admin%20` | block | SUSPICIOUS_SEGMENT |
| `/public` | allow | DEFAULT_ALLOW |
| `/public/%2e` | block | DOT_SEGMENT |
| `/administrator` | allow | 不匹配前缀边界 |
| `/admin/login` | allow | ALLOW_RULE |

完整 40 条放 `test/vectors/path.json`，每条带 `input`、`policy`、`expected`、`reason`。

### 6.11 运营接口（K4）

网关提供两个只读端点：

```text
GET /healthz   -> { ok, mode, policy_hash, uptime_sec }
GET /metrics   -> Prometheus 文本
```

这两个是网关保留路径，不转发；上游同名路径不可达。

指标：

```text
blue_gateway_requests_total
blue_gateway_blocked_total{rule}
blue_gateway_allowed_total
blue_gateway_upstream_errors_total
blue_gateway_policy_reload_total{result}
blue_gateway_policy_hash_info{hash}
blue_gateway_canary_hits_total
```

约束：

```text
只绑回环地址
不暴露请求头、body、query
不使用高基数标签（URL、IP 不进标签）
/healthz 不查 SQLite
```

## 7. 工具层

### 7.1 适配器模板

```js
register(defineTool({
  name: 'blue_task_create',
  description: '...',
  parameters: {
    role: { type: 'string', required: true },
    title: { type: 'string', required: true },
  },
  output: STRING_OUTPUT,
  execute: safe(async (args, exec) => {
    const app = appOf(exec)
    return json(await app.tasks.create(args, actorOf(exec)))
  }),
}))
```

规则：

```text
tools 不写 SQL
tools 不做业务判断
tools 只做参数整形、权限、调用 app、json 化
所有工具必须经 safe 包装
错误返回 { ok:false, error }
```

### 7.2 工具分组

现有 66 个：

| 组 | 文件 | 数量 | 工具 |
| --- | --- | --- | --- |
| 会话与目标 | `session.js` | 6 | engagement_open, session_info, scope_check, preflight, defense_selfcheck, tool_catalog |
| 资产/告警/发现/IOC | `asset.js` `alert.js` `finding.js` `ioc.js` | 11 | asset_add/query, alert_ingest/list/triage, finding_add/update/list, ioc_add/list/check |
| 任务与自主 | `task.js` | 5 | task_create/update/approve/list, autopilot |
| 案件/决策/时间线/报告 | `incident.js` `decision.js` `timeline.js` `report.js` | 8 | incident_open/list/update/attach, decision_add/list, timeline, report |
| 欺骗 | `decoy.js` | 9 | deception_plan, decoy_create/hit/list/update/sync, tarpit_plan, honeypot_ingest, access_log_ingest |
| 检测/遥测/控制 | `detection.js` `telemetry.js` `control.js` | 8 | detection_rule_add/list, detection_scan, telemetry_source_add/poll/health, control_scan/list |
| CVE/攻击面/风险 | `cve.js` `risk.js` | 5 | cve_pack/scan/campaign, attack_coverage, risk_graph |
| 证据/审计/锚定 | `evidence.js` `audit.js` | 6 | evidence_export/verify, audit_verify, audit_anchor/verify, defense_status |
| 响应 | `response.js` | 3 | response_plan/update/list |
| 狩猎/取证/加固 | `hunt.js` | 5 | log_scan, artifact_triage, hardening_check, containment_plan, playbook_list |

合计 66。

3.0 新增（M1 定稿，预计 7 个）：

| 组 | 文件 | 数量 | 工具 |
| --- | --- | --- | --- |
| 策略 | `policy.js` | 3 | policy_validate, policy_test, policy_diff |
| 网关 | `gateway.js` | 1 | gateway_status |
| 响应执行 | `response-exec.js` | 2 | response_execute, response_verify |
| 外部锚定 | `audit.js` | 1 | anchor_push |

合计 66 + 7 = 73。  
新增工具数量 M1 可以微调，但 K2/K3/K4/K5 每项至少有一个工具入口。

### 7.3 权限

3.0 保留 2.0 的角色白名单，不重新设计现有 66 个工具：

```text
monitor 56
intel 49
hunt 59
ir 59
forensics 55
hardening 56
worker 60
```

白名单从 `playbooks.js` 移到 `v3/domain/playbooks.js`，现有 66 个逐字保留。  
新增工具的权限 M1 定稿；策略修改、响应执行、审批、外锚推送仍然只给主会话。

### 7.4 参数校验

```text
必填、类型、枚举、长度在 app 边界校验
未知参数拒绝（additionalProperties=false）
limit 统一夹在 1..1000
字符串 trim 后再判空
```

## 8. Host API 与 2.0 控制台兼容

### 8.1 必须保留的 op

```text
overview, clientGraph, openEngagement, bindEngagement,
report, plan, claim, updateTask, approveTask,
controlScan, telemetryPoll, updateDecoy, syncDecoys,
updateIncident, createTask, triageAlert, updateFinding,
addIoc, addAsset, addFinding, cveCampaign,
exportEvidence, setSlots
```

### 8.2 返回结构

```text
成功：{ ok:true, ... }
失败：{ ok:false, error:"..." }
```

不能把异常直接抛给浏览器。

### 8.3 兼容层

3.0 的 app 返回领域对象，`ui/legacy-view.js` 负责转成 2.0 控制台期望的字段：

```text
stats 字段名
tasks 行字段
alerts/findings 行字段
audit/controls/telemetry/responses
cve/graph
```

兼容层必须有快照测试：

```text
用同一份 fixture 库
2.0 overview 输出 vs 3.0 overview 输出
逐字段比较，忽略时间戳
```

### 8.4 同源与上限

```text
POST /blue/api
4 MiB body 上限
Origin 与 Host 同源，或回环
cache-control: no-store
```

### 8.5 3.0 新增 op

```text
gatewayStatus
policyValidate / policyTest / policyDiff
responseExecute / responseVerify
anchorPush
```

这些 op 只给 3.0 工具和 3.1 控制台用；2.0 控制台不认识，也不会调用。  
新增 op 不改变旧 op 的返回结构。

## 9. 证据与审计

### 9.1 证据包

保持 `schema: "dsh-blue-evidence/v1"`：

```text
canonical JSON：对象键排序
digest：sha256(canonical)
signature：Ed25519(digest)
public_key：PEM
key_id：sha256(public_key).slice(0,16)
```

3.0 可以增加字段，但不能改已有字段语义。  
新增字段必须参与 digest。  
旧包仍可验签。

### 9.2 锚定

```text
head_hash = timeline 链头
signature = Ed25519(head_hash)
```

3.0 保留“本机密钥”限制，并在证据包 limitations 里继续写明：

```text
签名只能证明包内容与签名时一致
不能证明采集过程未被操控
```

### 9.3 外锚 sink（K5）

2.0 的锚点只在本地 SQLite；3.0 增加外部 sink。

支持：

```text
file   追加 JSONL 到指定路径
https  POST JSON 到 webhook，只允许 https，不跟随重定向，5 秒超时
```

推送内容：

```json
{
  "engagement_id": "ENG-...",
  "head_hash": "...",
  "signature": "...",
  "key_id": "...",
  "public_key": "-----BEGIN PUBLIC KEY-----...",
  "created_at": "2026-11-17T..."
}
```

规则：

```text
sink 失败不阻塞主流程
失败写 last_error 和计数
file sink 可被 audit_anchor_verify 读取验证
https sink 只保证推送回执，不保证远端可查
https sink 只允许配置的白名单域名，不跟随重定向，拒绝 IP 直连
```

### 9.4 导出路径

```text
只允许 <BLUE_HOME>/evidence/
不允许 .. 逃逸
文件名冲突时拒绝，不覆盖
```

## 10. 遥测、OTLP、CVE、图谱

这些模块 3.0 只搬实现，不改行为：

```text
telemetry：文件 cursor、半行保留、规则匹配
otlp：/v1/logs 接收，token 校验
cve：内置包、扫描、campaign
graph：资产-CVE-告警-任务关系
```

迁移时先写契约测试，再搬代码。

## 11. 测试策略

### 11.1 分层

```text
unit        domain 纯函数
contract    每个工具的参数/返回/权限
parity      2.0 vs 3.0 固定向量
adversarial 路径 40 条
policy      validate / test / diff / reload
response    dry-run / apply / rollback / verify
metrics     /metrics /healthz / 计数
anchor      file / https sink
migration   旧库迁移/回滚
shadow      录制流量重放
e2e         控制台主流程
soak        长跑
```

### 11.2 parity 基线

`scripts/parity.mjs`：

```text
--engine=2.0|3.0
--vectors=test/vectors
```

比较：

```text
任务状态迁移矩阵
timeline 哈希
证据包 digest + 签名
工具 catalog 的名称/参数/输出
状态统计字段
```

### 11.3 影子双跑

```text
1. 2.0 网关录制请求：method、raw_url、关键头、body hash
2. 3.0 以 observe 模式重放
3. 比较 block/allow 与 canonical_path
4. 分歧必须为 0
```

注意：

```text
影子模式不转发、不读 body、不产生副作用
录制文件脱敏
```

### 11.4 验收命令

```bash
node scripts/test-tools.mjs
node scripts/test-ui.mjs
node scripts/test-inline-gateway.mjs
node scripts/test-migration.mjs
node scripts/parity.mjs --engine=3.0
node scripts/test-path-vectors.mjs
node scripts/test-policy.mjs
node scripts/test-response.mjs
node scripts/test-metrics.mjs
node scripts/test-anchor-sink.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

## 12. 里程碑详细分解

### M0 契约基线（2 周）

状态：已完成（2026-11-17，`docs/3.0-contract.md`）。

```text
docs/3.0-contract.md
test/vectors/state.json
test/vectors/timeline.json
test/vectors/evidence.json
test/vectors/path.json
test/fixtures/db-2.0-*.sqlite
scripts/parity.mjs
```

出口：

```text
2.0 上 parity 全绿
向量可由 3.0 复用
```

### M1 骨架（2 周）

状态：已完成（2026-11-17，`v3/`，102 个 JS；23 个工具组、73 个工具名已登记）。

```text
v3/ 目录
依赖检查脚本
CI 跑 3.0-dev
空实现能启动
```

出口：

```text
domain 导入 infra 时 CI 红
v3/index.js 能挂载
```

### M2 数据层（3–4 周）

状态：进行中（基础已完成：schema、2.0 迁移、备份、tasks/timeline repo）。

```text
sqlite db + migrations
repos
migration + rollback
3 个合成 2.0 fixture 演练
```

说明：没有真实 2.0 数据，M2 按 3–4 周排；迁移代码仍然保留，因为 npm 上的 2.0 用户可能升级。

出口：

```text
迁移往返成功
回滚成功
verifyTimeline 通过
```

### M3 路径阻断 + 策略（8 周）

状态：已完成（2026-11-17；40 条向量、独立网关、canary、metrics、热加载）。

```text
normalize
policy engine：validate / test / diff / reload
gateway server
decision log
/metrics、/healthz
canary harness
40 向量
```

出口：

```text
K1 全部向量通过，canary 命中 0，fail-closed 演练通过
K2 不改代码能改策略，错误策略拒绝加载
K4 指标可抓取，策略摘要可见
```

### M3.5 跨越能力（4 周）

```text
response_execute：dry-run / apply / rollback
response_verify
manual 适配器
anchor sink：file / https
新增工具骨架
```

出口：

```text
K3 无审批不能执行；dry-run 无副作用；回滚有证据
K5 file sink 可验证；https 推送失败不阻塞
```

### M4 工具迁移（14–16 周）

```text
现有 66 + 新增 7，分 14 组
contract tests
权限
legacy view
```

出口：

```text
现有 66 工具 catalog 一致
新增 7 工具都有正例/反例/权限
总数 73，README、测试、白名单同步
```

### M4.5 切换（2 周）

```text
影子双跑
2.0 控制台连 3.0
3.0.0 发布
```

出口：

```text
零决策分歧
2.0 控制台主流程通过
K1-K5 验收全部通过
```

### M5 控制台（8 周）

```text
12 页签
状态集中
审批入口
```

### M6 收尾（4 周）

```text
3.1.0
文档
回滚演练
```

## 13. 2.0 文件映射

| 2.0 | 3.0 |
| --- | --- |
| `lib/judge.js` | `v3/domain/task/states.js` |
| `lib/plan.js` | `v3/domain/task/risk.js` + `v3/app/tasks/autopilot.js` |
| `lib/store.js` | `v3/infra/sqlite/*` + `v3/domain/*/model.js` |
| `lib/tools.js` | `v3/tools/*.js` |
| `lib/ui.js` | `v3/ui/host-api.js` + `legacy-view.js` |
| `lib/client.js` | 3.0 保留，3.1 重写 |
| `lib/inline-guard.js` | `v3/domain/gateway/normalize.js` |
| `lib/gateway.js` | `v3/infra/gateway/server.js` |
| `lib/evidence.js` | `v3/infra/evidence/bundle.js` |
| `lib/anchor.js` | `v3/infra/evidence/anchor.js` |
| `lib/telemetry.js` | `v3/infra/telemetry/file.js` |
| `lib/otlp.js` | `v3/infra/telemetry/otlp.js` |
| `lib/detection.js` | `v3/infra/telemetry/detection.js` |
| `lib/controls.js` | `v3/app/controls.js` |
| `lib/response.js` | `v3/app/response.js` |
| `lib/decoy-sync.js` | `v3/app/decoy-sync.js` |
| `lib/cve-pack.js` | `v3/domain/cve/pack.js` |
| `lib/cve-campaign.js` | `v3/app/cve/campaign.js` |
| `lib/graph.js` | `v3/app/risk/graph.js` |
| `lib/attack.js` | `v3/domain/attack.js` |
| `lib/hunter.js` | `v3/app/hunt.js` |
| `lib/taskspec.js` | `v3/domain/taskspec.js` |
| `lib/playbooks.js` | `v3/domain/playbooks.js` |
| `lib/bindings.js` | `v3/infra/bindings.js` |
| `lib/compat.js` | `v3/infra/compat.js` |
| `lib/inventory.js` | `v3/app/inventory.js` |
| `lib/index.js` | `v3/index.js` |

## 14. 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 规范化与上游不一致 | 误阻断或绕过 | 转发 canonical；真实上游回归 |
| 40 向量不够 | 漏绕过 | 影子双跑 + 外部 payload 集 |
| 迁移失败 | 数据损坏 | 备份 + 回滚 + 3 个 fixture |
| 工具行为漂移 | 用户感知退化 | catalog parity + 逐工具契约测试 |
| 控制台不兼容 | 3.0 不可用 | legacy-view 快照测试 |
| 跨越门范围膨胀 | 3.0 拖成 4.0 | K1-K5 固定，新增需求进 3.2 |
| 单人疲劳 | 长期停更 | 每 8 周缓冲，里程碑可演示 |

## 15. 已定与未决

已定：

```text
1. 真实数据：没有。M2 用合成 fixture；迁移代码保留。
2. 网关：独立进程 + 独立端口，默认 127.0.0.1:8787；端口占用拒绝启动。
```

未决：

```text
3. TLS 由谁终止：网关、上游，还是不做？
4. 路径策略是全局一份，还是每场 engagement 一份？
5. canary 是否要在生产也保留一个计数端点？
```

M1 前必须定 3、4。

## 16. 决策索引

```text
ADR-001 全量重写实现，保留契约
ADR-002 同仓库双树
ADR-003 内核优先，控制台 3.1
ADR-004 先判定后读 body，fail-closed
ADR-005 3.0 开发期 2.0 冻结
ADR-006 不设硬期限，按出口条件
ADR-007 零新增运行时依赖
ADR-008 数据迁移可回滚
ADR-009 旧模块 parity 后再删
ADR-010 网关独立进程与独立端口
ADR-011 无真实数据仍保留迁移
ADR-012 3.0 是能力超集，不是等价重写
```

详见 `docs/3.0/decisions.md`。
