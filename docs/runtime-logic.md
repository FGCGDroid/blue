# 插件运行逻辑（详细版）

> 对应版本：3.0.7
> 适用对象：维护者、想改代码的人、想知道“它到底怎么跑起来”的用户

---

## 1. 一句话

DSH 加载一个 **Host 插件包**，包里有数据库、工具、控制台和一组预设；指挥官会话通过门禁后，用 `blue_*` 工具读写 SQLite，用 subagent 派活，后台采集器把外部事件写进同一张库。

---

## 2. 进程拓扑

`cordis.patch.yml` 在 profile 里插入四类东西：

```text
1. blue-mode          lib/index.js      路径解析 + 技能同步 + ctx.blueTeamMode
2. blue-mode-store    store.js          SQLite 事实库 + ctx.blueTeamV3
3. blue-mode-ui       ui.js             /blue/api + 控制台资源
4. preset-blue        presets/blue/*    指挥官预设 + 六个执行角色预设
```

实际加载顺序由 DSH 决定，但逻辑依赖是：

```text
lib/index.js  ──►  store  ──►  tools  ──►  ui
                     │
                     └──► collector（等 store 就绪后启动）
```

---

## 3. Host 启动顺序

### 3.1 `lib/index.js`

```text
apply(ctx)
  ├─ packagePaths()          解析包内 presets/、skills/
  ├─ blueDataDir()           $DSH_HOME/blue（或 BLUE_HOME）
  ├─ installSkills(root)     把 skills/*.md 覆盖到 $DSH_HOME/blue/skills
  └─ ctx.provide('blueTeamMode', { version, paths, root, skillsDir, skills, compat })
```

技能每次启动都覆盖，保证升级后提示词跟着换。

### 3.2 `store.js`

```text
apply(ctx, { root })
  ├─ 确保 $DSH_HOME/blue 存在
  ├─ 打开 blue.db（sqlite）
  ├─ 跑迁移（001-base.js，含 technique/variant 等列）
  ├─ 构造 repos（engagements/assets/alerts/...）
  └─ ctx.provide('blueTeamV3', store)
```

### 3.3 `v3/index.js`

```text
apply(ctx, { root })
  ├─ provide('blueTeamModeV3', { version, root, skills })
  ├─ provide('blueGateway', gatewayManager)
  └─ 轮询等 store 就绪（最多 5 秒）
       ├─ createCollector(store)  → provide('blueCollector')
       ├─ createRemoteService(store) → provide('blueRemote')
       └─ collector.start()
```

### 3.4 工具层 `v3/tools.js`

```text
apply(ctx)
  ├─ 收集 66 个工具定义
  ├─ 每个工具包一层 guarded()
  │    └─ 写库/派发类工具先过门禁
  └─ ctx.tools.register(guarded)
```

### 3.5 UI 层 `v3/ui.js`

```text
inject: ['blueTeamV3', 'webServer']
apply(ctx)
  ├─ /blue/api        2.0 兼容 API
  ├─ /blue/v3/api     3.x API
  ├─ /blue/protect    保护向导页
  └─ /blue/console.css 控制台样式
```

---

## 4. 五个运行时服务

| 服务名 | 提供者 | 作用 |
|---|---|---|
| `blueTeamMode` | lib/index.js | 版本、路径、技能目录 |
| `blueTeamV3` | store.js | SQLite 事实库 + repos |
| `blueCollector` | v3/index.js | 后台采集循环 |
| `blueRemote` | v3/index.js | 远程 agent 接入 |
| `blueGateway` | v3/index.js | 内联网关/代理 |

工具和 UI 都通过 `ctx.get()` 拿这些服务，不直接碰数据库文件。

---

## 5. 门禁：`blue_defense_selfcheck`

这是唯一一个“读会话”的工具。

```text
调用 blue_defense_selfcheck(phrase="防御自检")
  ├─ 通过 DSH 会话读取最后一条 user/message
  ├─ 去掉首尾空白后必须等于「防御自检」
  ├─ 不等于 → 返回 SELF_CHECK_REQUIRED
  └─ 等于 → 放行，写 timeline
```

`guarded()` 在工具入口检查：

```text
如果工具属于写库/派发类，且会话未放行
  → 直接返回 SELF_CHECK_REQUIRED，不执行
```

只读工具（`blue_session_info`、`blue_preflight`）不受限。

---

## 6. 数据层

### 6.1 位置

```text
$DSH_HOME/blue/blue.db
同名目录还有：
  skills/            同步进来的技能
  backups/           迁移前自动备份
  collector/         远程事件 JSONL
  sessions.json      （网站）不在插件里
```

### 6.2 19 张表

```text
engagements       防守目标
assets            资产
alerts            告警
findings          发现
incidents         案件
iocs              IOC
tasks             任务
decoys            诱饵
decoy_hits        诱饵命中
telemetry_sources 采集源与游标
detection_rules   检测规则
knowledge_entries 打法知识库
timeline          时间线
controls          控制项
artifacts         证据 artifact
audit_anchors     审计锚点
decisions         决策记录
response_actions  响应动作
meta              杂项
```

### 6.3 迁移

```text
启动时检查 PRAGMA table_info
缺列就 ALTER TABLE 补
迁移前备份到 backups/
回滚：node scripts/rollback-v3.mjs
```

---

## 7. 采集链路

### 7.1 定时器

```text
collector.start()
  └─ setInterval(tick, 10000)   // 10 秒
```

### 7.2 一次 tick

```text
tick()
  ├─ 找出所有 enabled 的 telemetry_sources
  ├─ 读 source.path 的 JSONL 文件
  ├─ 按 cursor 取新增事件
  │    └─ 游标异常时回退最近 500 条（防止卡死）
  ├─ 每条事件：
  │    ├─ 解析 JSON
  │    ├─ 去重（5 分钟窗口）
  │    ├─ 匹配 detection_rules（路径/状态码/特征）
  │    ├─ 命中 → 写 alerts + timeline
  │    └─ 更新计数
  ├─ 推进 cursor
  └─ 超过 20000 条时裁剪内存窗口
```

### 7.3 远程采集

服务器上的 `blue-agent` 通过 SSH 隧道把事件 POST 到：

```text
http://127.0.0.1:9080/blue/collect
  ├─ Bearer token 校验
  ├─ 来源 IP 白名单
  ├─ 每分钟 120 条限速
  └─ 写入 collector/*.jsonl，等采集器读取
```

---

## 8. 控制台

### 8.1 Host API

```text
POST /blue/api
  { op: "overview" }        快照：统计、告警、任务、采集状态
  { op: "collectorStart" }  启动/重启采集
  { op: "approveTask" }     审批高风险任务
  { op: "checkUpdate" }     检查插件更新
  { op: "updateInstall" }   下载并安装更新
```

### 8.2 前端

```text
lib/client.js 注册右侧常驻面板
  ├─ 概览 / 资产 / 告警 / 发现 / IOC / 任务
  ├─ 知识库 / 覆盖度矩阵
  ├─ 蜜罐与响应
  └─ 顶栏「检查更新」按钮
```

---

## 9. 自主循环

### 9.1 指挥官每轮

```text
1. blue_defense_status / blue_autopilot status
2. blue_autopilot action=cycle
3. cycle 内部：
   ├─ plan：根据告警/资产生成候选任务
   ├─ inferRisk：low / medium / high
   ├─ high → pending_approval（不派发）
   ├─ 检查并发名额、冷却、轮次上限
   └─ 返回 dispatch（只含 low/medium）
4. 对每条 dispatch 调 subagent({ agent_preset, prompt })
5. 子代理完成后查库确认落库
6. blue_autopilot action=complete
7. 回到第 1 步
```

### 9.2 风险闸

```text
high 任务
  ├─ 初始状态 pending_approval
  ├─ blue_task_approve 才能变 queued
  ├─ 写 approved_by/at/note + timeline
  └─ 不允许直接 dispatched
```

### 9.3 并发与冷却

```text
默认 3 个并发（1–8 可调）
cycle 间隔默认 30 秒
单场默认 12 轮
超限返回 round_limit / cooldown
```

---

## 10. 执行角色

`presets/blue/` 下：

```text
blue                  指挥官
blue-worker           全工具执行角色
blue-worker-monitor   监控值守
blue-worker-intel     情报分析
blue-worker-hunt      威胁狩猎
blue-worker-ir        应急响应
blue-worker-forensics 取证分析
blue-worker-hardening 加固修复
```

指挥官只用 `subagent` 的 `agent_preset` 选择角色，不直接挂执行角色的工具。

---

## 11. 知识库与分类

```text
knowledge_entries
  ├─ technique  打法（sqli/xss/scanner/brute-force/sensitive-path/deception...）
  ├─ variant    变体（plain/encoded/...）
  └─ signature  原始签名

classify.js 用标题/路径/状态码推断 technique 与 variant
后台覆盖度矩阵按 ATT&CK 技术展示命中与缺口
```

---

## 12. 更新机制

```text
checkUpdate
  └─ GET api.github.com/repos/FGCGDroid/blue/releases/latest
       ├─ 取 tag
       ├─ 与当前版本比较
       └─ 60 秒缓存

updateInstall
  ├─ 下载 cdn.jsdelivr.net/gh/FGCGDroid/blue@v<tag>/releases/*.tgz
  ├─ 写入临时目录
  ├─ spawn dsh plugin add <file>
  └─ 返回结果，由用户重启 DSH
```

---

## 13. 完整运行时序

```text
DSH 启动
  → 加载 profile 里的 cordis.patch.yml
  → lib/index.js apply：技能同步，发布 blueTeamMode
  → store.js apply：打开 blue.db，迁移，发布 blueTeamV3
  → v3/index.js apply：等 store，启动 collector/remote
  → ui.js apply：注册 /blue/api、控制台样式
  → 用户选择「蓝队防御模式」预设
  → 用户发「防御自检」
  → blue_defense_selfcheck 放行
  → 用户发目标
  → blue_protect 建档 + 资产
  → blue_preflight 查工具链
  → 进入自主循环：status → cycle → subagent → 查库 → complete
  → 采集器每 10 秒把外部事件写进 alerts
  → 控制台实时显示
```

---

## 14. 失败模式

| 现象 | 原因 | 处理 |
|---|---|---|
| 工具全部返回 `SELF_CHECK_REQUIRED` | 没发「防御自检」 | 发四个字后重试 |
| 面板没数据 | store 未挂载或采集器没启动 | 看 `/blue/api` 的 collector 字段 |
| 告警不涨 | 采集游标卡住 / 隧道断 | 查 telemetry_sources.cursor、9080 |
| 更新按钮报超时 | GitHub 不可达 | 走 jsDelivr，检查网络 |
| 高风险任务不动 | 停在 pending_approval | 控制台点「批准」 |

---

*本文按 3.0.7 代码实际行为整理；改架构时请同步更新。*
