<p align="center">
  <img src="assets/icon.png" alt="Muteki 蜂群" width="140" style="border-radius:20px">
</p>

<h1 align="center">Muteki 蜂群 · DSH Agent 预设</h1>

<p align="center">
  把「多 agent 蜂群解 CTF / 授权渗透」的作战流程，做成 DeepSeek Harness 里一个可直接选用的预设。
</p>

<p align="center">
  <img alt="DSH" src="https://img.shields.io/badge/DSH-%E2%89%A50.2.2--rc.3-blue">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## 这是什么

**Muteki 蜂群**是一个运行在 [DeepSeek Harness](https://github.com/deepseek-ai) 里的 Agent 预设（agent preset）。
选中它之后，你会得到一个「主控 + 子代理」的作战模式：

- 所有结论写进一块**工作区级黑板**（SQLite 事实图），不是散落在聊天里；
- 每条事实必须带**真实工具输出的证据 id**，没有证据只能记为 observation；
- 主控先把题目拆成**有界任务**，再用程序化工具派给全新上下文的子代理；
- 自动循环派单、首解即停、其余子代理立刻中断；**连续多轮无进展也会停下来找人**，不空转烧额度；
- 支持用**本地 Claude Code CLI** 跑跨引擎异构；
- 派单次数与成本都**按题独立限额**，且分「人主导 / 无人值守」两套预设，另有**整题累计总闸**，一道题烧超了不会拖累下一道题。

> 思想来自开源项目 [FishCodeTech/muteki](https://github.com/FishCodeTech/muteki)（無敵 · Project Muteki）。
> 本仓库没有复制它的源码，而是用 DSH 原生的子代理、任务、工具与插件能力重新实现了一套轻量版。

---

## 用来打 CTF

这个预设不是通用聊天增强，它是按「一场 CTF 怎么打」设计的：主控只负责读题、拆任务、调度与复核，真正的分析/利用交给一个又一个**全新上下文**的子代理，所有结论都落在黑板上。

| 题型 | 怎么用 |
|---|---|
| **Web**（SQLi / XSS / SSRF / 文件上传 / 反序列化） | 拆「入口探测 → 认证绕过 → 注入验证 → 利用链」等 Step，子代理各自 curl/发包验证；fact 必须带真实响应 artifact，猜的不许升级成结论 |
| **Pwn**（栈 / 堆 / 格式化字符串） | 先派 recon 子代理跑 checksec/strings/IDA 导出，再派 exp 子代理写 pwntools；offset 与 leak 分开记，失败方向记 deadend |
| **Reverse** | 多子代理并行静态分析 / 动态调试 / 算法还原；每步结论带反汇编或运行输出 artifact |
| **Crypto / Misc / 取证** | 大附件拆成多个有界 Step（文件识别 → 解包 → 提取 → 验证），避免单会话被大文件拖爆上下文 |
| **AWDP / 授权渗透** | 用 lane 锁串行化共享容器（只读优先、写操作持锁），`muteki_run` 的 `limit` 设为 1 |

### 一场比赛的典型流程

1. **读题**：你贴题面 / 附件 / 靶机，主控先 `board.py use web-8080` 切到这道题；
2. **拆任务**：把题拆成至少 2 条有界 Step，每条写清「预期证据」和「停止边界」，进 `task` 队列；
3. **自动派单**：`muteki_run limit 2 max_minutes 15`，子代理各自新上下文，只拿到本题黑板摘要；
4. **写回**：子代理用 `fact --artifact` / `deadend` / `flag` 写回，不必等整批跑完；
5. **复核**：`muteki_review` 起只读 Reviewer，质疑无证据结论、找验证缺口；
6. **交 flag**：你手动复制到平台提交（刻意保留的人工确认）。

### 三个可直接抄的提示

```text
# Web
目标 http://1.2.3.4:8080，flag{...}。先 board.py use web-8080，
把它拆成入口探测 / 认证绕过 / 注入验证三条有界 Step，再 muteki_run limit 2 max_minutes 15。

# Pwn
附件 pwn1，远程 nc 1.2.3.4 9999。先派 recon（checksec/strings/IDA），
再派 exp 写 pwntools 脚本；offset 和 leak 分开记 fact，失败方向记 deadend。

# 大杂项
附件 2GB 镜像。先拆「文件识别 / 挂载 / 找关键文件」三步，单步 10 分钟上限，
超时就把范围记 deadend，不要反复重扫。
```

### 当前边界（未实现的三类场景）

- 需要人机验证 / 真人交互的题（验证码、支付、短信登录）；
- 不可信的恶意 challenge：本预设**不做沙箱隔离**，Worker 会真实执行命令、访问目标；
- 多 flag 平台的自动提交：没有平台提交闭环，flag 仍需人工确认。

---

## 如果要做：实现路线

下面三类是刻意留白的边界。它们的实现步骤、依赖与风险都不同，按「人机交互 → 沙箱 → 平台提交」的顺序做最省事。

### 1. 人机验证 / 真人交互

**现状**：子代理是无人值守的，遇到验证码只能把任务挂起或放弃。

**实现步骤**

1. **黑板加人工请求通道**：`board.py` 增加 `human` 表（或复用 `review` 的 `kind=human`），记录「哪个 task、缺什么、超时时间」；
2. **主控暴露 `muteki_ask` 工具**：内部调 DSH 的 `ask_user_question`（GUI 弹窗），把请求转给真人；子代理不直接阻塞，而是 `commit-step` 挂起、任务回到 `open`；
3. **人工结果写回**：用户在会话里回答 / 手动完成验证后，主控 `board.py human answer <id> "<结果>"`，再 `task reopen` 让 worker 继续；
4. **浏览器态复用**：验证码页面用 `agent-browser`/ego-browser 打开，由用户在同一 profile 里完成（Cookie 会保留），子代理后续直接复用登录态；
5. **超时熔断**：`human` 表带 TTL（例如 10 分钟），过期自动 `task drop`，不占派单额度。

**关键依赖**：DSH 的 `ask_user_question` / HITL 能力；ego-browser 的持久 profile。
**风险**：真人不在时整轮会空等；多个题同时要人时会互相打断，需要队列化提示。

### 2. 不可信恶意 challenge（沙箱）

**现状**：Worker 直接执行宿主命令，没有隔离。这是 DSH 插件的边界，不是能靠改 persona 解决的。

**实现步骤**

1. **选定隔离层**（三选一，按成本排序）：
   - Windows **Sandbox / 一次性 VM**（最贴近官方 muteki 的建议）；
   - **WSL2 + Docker 容器**跑 Worker（`muteki-worker` 镜像思路，容器内 `NOPASSWD sudo` 也不怕）；
   - 低配版：Windows 本地低权限用户 + 工作目录限定 + 禁用 `muteki_cli` 的宿主环境。
2. **派单时传隔离 cwd**：`muteki_dispatch/tick/run` 已有 `cwd` 参数，把它指向隔离目录；证据库与黑板也放在隔离目录下，避免宿主路径被写；
3. **工具白名单**：在容器镜像里只装必要工具（nmap/python/pwntools 等），不要把宿主 PATH 透传进去；
4. **入口校验**：对未知二进制先 `file`/`strings`/容器内 `strace`，禁止在宿主直接执行；
5. **回收**：每轮结束销毁容器或重置快照，不在容器里保留凭据。

**关键依赖**：Docker Desktop 或 WSL2；如果走容器，`muteki_cli` 与 `board.py` 的路径要改成容器内路径。
**风险**：容器网络与靶机连通性、文件挂载权限（Windows 路径 → 容器路径）是最容易踩的坑；本机沙箱只能降低风险，不能承诺安全。

### 3. 多 flag 收集 + 自动提交

**现状**：`board.py flag` 只记候选，`muteki_run` 见 flag 即停；提交靠人。

**实现步骤**

1. **黑板加平台与提交记录**：`platform` 表（base_url、账号、token 加密存储）、`submit` 表（flag、平台响应、时间、正确/错误）；
2. **多 flag 目标**：`muteki_run` 增加 `expected_flags` 参数；停止条件从「出现任意 flag」改为「本轮新增 flag 数 ≥ expected_flags」或队列空；
3. **首个平台适配 CTFd**：`muteki_submit` 工具用 HTTP 登录（cookie/token）→ `POST /api/v1/challenges/attempt` → 解析 `status: correct|incorrect`；
4. **结果回写**：correct → `flag` 标 verified、对应 task `done`、整轮收束；incorrect → flag 标 invalid，`task reopen` 该方向，记一条 deadend；
5. **先 dry-run**：默认只打印「将要提交什么」，加 `--yes` 或配置项才真提交；比赛规则明确禁止自动提交时不启用。

**关键依赖**：目标平台（CTFd / rCTF / GZCTF）的 API 与登录方式；账号 token 的安全存储。
**风险**：平台风控 / 封号、比赛规则禁止脚本提交、不同平台 API 差异大；建议只在自己有权限的 CTFd 实例上先测。

---

## 解决什么问题

长会话里让一个 agent 从头打到尾，几乎一定会遇到四个坑：

| 坑 | 表现 | 本预设的对策 |
|---|---|---|
| 上下文腐化 | 越聊越慢、越聊越忘、关键结论被淹没 | 每步一个**全新子会话**，只注入当前题的黑板摘要 |
| 幻觉级联 | A 猜的结论被 B 当成前提，整群跑偏 | **证据门**：fact 必须引用真实存在的 artifact id，否则 exit 2 |
| 重复踩坑 | 换个说法反复试同一条死路 | **dead-end 记账** + 按题隔离，重开需引用新证据 |
| 多 agent 撞车 | 两个子代理同时改同一个目标、互相干扰 | **任务原子认领** + 资源 lane 锁 + 按题隔离 |

---

## 核心机制

```
你（题目/靶机）
      │
      ▼
┌─────────────────────────────────────────────┐
│  主控 Agent（Muteki 预设）                    │
│  persona：七条铁律（一步一交付 / 证据 / 增量…）│
│                                             │
│  board.py task add  ──► 任务队列（有界 Step） │
│  muteki_run  ─────────► 自动循环派单          │
│        │                     │               │
│        │              ┌──────┴──────┐        │
│        │              ▼             ▼        │
│        │         Worker 子代理   Worker 子代理 │
│        │         （全新上下文）  （全新上下文）   │
│        │              │             │        │
│        └──────────────┴──────┬──────┘        │
│                              ▼               │
│                    board.py（事实图）          │
│        fact / deadend / flag / observation    │
│        + 证据 id（muteki-core 捕获）           │
│                              │               │
│              muteki_review ──► 只读 Reviewer   │
│              muteki_cli   ──► Claude Code CLI  │
└─────────────────────────────────────────────┘
```

### 1. 黑板：工作区级事实图

`board/board.py`，纯标准库、零依赖，数据落在 `<工作区>/.muteki-board/board.db`（WAL）。

| 记录 | 用途 |
|---|---|
| `fact` | 已被真实工具输出证明、可供下一步复用的结论 |
| `observation` | 只是看到、还不能当结论用的观察 |
| `deadend` | 被有界实验排除的方向（测了什么范围、看到什么） |
| `flag` | 候选 flag（按题隔离） |
| `task` | 有界 Step 队列（open / claimed / done / dropped） |
| `review` | Reviewer 的质疑 / 合并 / 缺口意见 |
| `claim` | 独占资源 lane 锁（带 TTL 与持有者） |

### 2. 证据门

`muteki-core` 插件监听 `tools/result`，把每次工具调用的结果落盘到证据库并写索引：

```
<storageDir>/artifacts/<id>.json
<storageDir>/index.jsonl
```

`board.py fact ... --artifact <id>` 会同时校验索引条目与 payload 文件；伪造 id 直接 `exit 2` 拒写。没有 `--artifact` 的结论自动降级为 `observation`。

### 3. 按题隔离

`board.py use <题名>` 切换当前题；所有读写命令默认只作用于当前题：

```bash
board.py use web-8080     # 切到这道题
board.py current           # 看当前题
board.py context --all     # 跨题审计
```

`muteki_run` 开工前会自动 `use` 到本轮题名；它只有在本轮**新出现**的 flag 才算首解，上一题的旧 flag 不会误停。

### 4. 程序化派单

| 工具 | 作用 |
|---|---|
| `muteki_dispatch` | 手动派一个 Step（可先 claim 资源 lane） |
| `muteki_tick` | 开工先回收卡住的 claimed 任务，再从任务队列取 1–3 条批量派一轮 |
| `muteki_run` | 自动循环：切题 → 回收卡住任务 → 取队列 → 派单 → 等结果 → 查 flag / 查进展 → 直到队列空 / 出现 flag / 超时 / 额度用尽 / 用户中断 / **连续多轮无进展**；`mode=bulk` 时改走完成驱动并发池（靶场批量） |
| `muteki_review` | 起一个**只读** Reviewer 审图，意见写回 `review`；不派单、不记账、**不计入额度** |
| `muteki_cli` | 把同类 Step 交给本地 Claude Code CLI（独立进程、异步、不占 DSH 子代理席位） |

`muteki_run` 结束（含异常/中断）时会用 `finally` 把本轮没做完的任务释放回 `open`，不会留下假 `claimed`。
返回值带 `stoppedReason`（`empty` / `flag` / `timeout` / `budget` / `interrupted` / `rounds` / `stagnation`）、`quota` 明细、
`resumeAt`（下一个令牌时刻）、`waitedMs`、`overridden`、`stagnantRounds`，停下来时能直接看出为什么停、什么时候能继续。

### 5. 首解硬 cancel

`muteki_run` 每 2 秒轮询 flag；一旦出现**本轮新增**的 flag，立即对同批其余子代理调用 `subagents.interrupt`（`kind: "ancestor"`），不再陪跑。可用 `hardCancelOnFlag: false` 关闭。

### 6. 额度按题独立，且分「人主导 / 无人值守 / 靶场批量」三套

额度由 `mode` 决定预设，每个字段都可以显式覆盖（显式值优先）：

| 上限 | attended（人主导，默认） | unattended（无人值守/定时） | 账本 | 恢复方式 |
|---|---|---|---|---|
| 令牌桶容量 `burstRuns`（开局可一次性派多少） | 60 | 12 | `buckets.json` | 按速率持续回填 |
| 令牌回填速率 `maxRunsPerHour`（次/小时） | 40 | 12 | `buckets.json` | 时间过去就回填 |
| 每题每小时成本 `maxCostUsdPerHour` | $15 | $5 | `costs.json`（滚动 1h） | 等窗口滚动 |
| **整题累计派单** `maxRunsPerChallenge` | 300 | 100 | `totals.json`（不清理） | 换题或调高配置 |
| **整题累计成本** `maxCostUsdPerChallenge` | $50 | $15 | `totals.json`（不清理） | 换题或调高配置 |
| 令牌不足时 `onQuota` / `maxWaitMinutes` | `wait` / 10 分钟 | `stop` / 0 | — | — |
| 连续无进展轮数 `stagnationLimit`（0=关闭） | 5 | 3 | — | 写一条 review gap 后停，等人换思路 |

- **为什么用令牌桶而不是滚动小时窗口**：滚动窗口是悬崖——打满上限后最坏要干等 60 分钟才腾出 1 个额度。令牌桶把速率限制变成「容量 + 回填」：开局能一口气派 60 个把 recon 与第一轮 exp 全铺出去，之后按 40 次/小时持续供给。硬题的派单本来就是前密后疏。
- **为什么要整题总闸**：每小时上限只防「短时间失控」，一道硬题连打八小时照样能烧穿预算；`totals.json` 按题累计、跨小时不清零。
- **`onQuota: wait` 只作用于 `muteki_run` 的循环**：令牌不足时等回填（最多 `maxWaitMinutes`），等不到就停并给 `resumeAt`（下一个令牌的时刻）。`dispatch` / `tick` / `cli` 立即返回，不阻塞界面。无人值守默认 `stop`，绝不自作主张等待。
- **`override_quota=true`（仅 attended）**：人显式授权越过本轮**速率**限制。**只要表了态就留痕**——不管令牌是否真的不足、授权是否被拒，都往黑板写一条 observation + `overrides.jsonl`（带 `allowed`/`needed`/`blockedBy`）。**成本上限与整题总闸越不过去**——那是钱的闸。
- **停滞熔断才是硬题该撞的闸**：每轮结束比较「最新带证据 fact 的 id + flag 条数」，连续 `stagnationLimit` 轮没有前进就停（`stoppedReason: "stagnation"`），并写一条 `review --kind gap` 提示人工换思路。**observation 与 deadend 不算进展**——排除方向有价值，但连续几轮只在排除方向说明该换入口了，而不是继续烧额度重试。前提是队列里有足够任务：每轮只取 `limit` 条，**队列先空会先以 `empty` 停止**，要实测熔断至少放 `stagnationLimit × limit` 条任务。
- 切到新题不继承旧题额度；切回旧题时额度继续累计。
- 四个入口共用同一套判定（`quotaState`），不会口径分叉；`muteki_run` 返回 `quota` 明细、`limitHit`、`resumeAt`、`waitedMs`、`overridden`、`overrideNote`。
- **成本账本现在两种引擎都记**：`muteki_cli` 记 Claude Code 上报的 `total_cost_usd`（`basis: estimate-anthropic`）；DSH 子代理在 `subagent/end` 时按墙钟时间 × `workerUsdPerMinute` 估算（`basis: estimate-time`）。已核对 DSH 0.2.2-rc.3 的 `subagent/end` payload **不带 token usage**，所以只能估，并如实标注；将来版本带上 usage/costUsd 会自动改用真实值（`basis: actual`）。
- 每条成本同时存 `usdEstimate`（Anthropic 标价口径）与 `usdActual`（× `estimateToActual`）。`costBasis` 决定闸门比哪一个，默认 `estimate`；接 DeepSeek 时 $15/h 估算 ≈ 实际 $1.5/h。
- 整题总闸打满就用 `board.py task drop <id>` 放弃该题，或换题。
- **`mode: bulk`（靶场批量）**：一次打几十上百道独立题时用。完成驱动并发池（tier `lite/standard/max` = 池 4/8/16，令牌与成本墙随档放宽），任一 worker 结束立刻补位；flag 按题归属、不做全局首解 cancel、无停滞熔断；没标 done 的任务重试一次后 drop。整批共用一个 challenge，一题一条 task。单题深度攻坚仍用 attended。档位表与用法见 `plugins/dsh-muteki-orchestrator/README.md`。

---

## 安装

### 前置条件

- DeepSeek Harness **≥ 0.2.2-rc.3**（使用 `@deepseek-ai/dsh-agent-preset` 与 `@deepseek-ai/dsh-tools`）；
- Python **3.10+**（`board.py` 只用标准库）；
- 可选：[Claude Code CLI](https://code.claude.com/docs)（只有想用 `muteki_cli` 跨引擎异构时才需要）；
- 可选：`git`（从本仓库克隆）。

### 兼容性说明（重要）

- 本预设按 **DSH 0.2.2-rc.3** 编成：`tool-agent-team` 行**必须 `disabled: true`**（rc.3 未发布 `agent-team` 包，缺 `agentTeams` 服务会让整个 muteki 预设「加载失败」）。模板已默认禁用；升级到含 agent-team 的 DSH 版本后可删掉该行。
- `muteki-orchestrator` 用 **相对路径** `./muteki-orchestrator.mjs` 挂载，文件放 profile 根目录。**不要放 `node_modules`**：插件管理器会显示「已安装，未生效」，且 `pnpm install` 会把它移到 `node_modules\.ignored`。
- 如果插件页仍显示「已安装，未生效」：那是插件管理器对「未声明 `dsh.bundle` 的普通依赖」的分类提示；只要预设能加载、会话里有 `muteki_*` 工具，功能就是正常的。

### 方式一：一键脚本（Windows PowerShell）

```powershell
git clone https://github.com/liaty8/dsh-muteki-preset.git
cd dsh-muteki-preset
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本会：

1. 把 `board.py` + `SKILL.md`（替换成你的真实路径）装到 `$DSH_HOME\skills\muteki-board\`；
2. 把 `plugin-v13.mjs` 复制成 `<profile>\muteki-orchestrator.mjs`（**放 profile 根目录，不进 `node_modules`**，pnpm 不会移走它，插件页也不会误报「未生效」）；
3. 把 `muteki-core.mjs` 放到 `<profile>\`；
4. 装 `muteki-workbench` 工作台小包（`<profile>\muteki-workbench-pkg\` + junction + `file:` 依赖 + **进 `dsh.profile.bundles` 白名单**），重启后右侧栏出现「Muteki 工作台」页签；
5. 生成 `preset-muteki.patch.yml`（已替换路径），**默认只输出文件**，并提示你把它追加到 profile 的 `cordis.patch.yml`。

想让它自动追加：

```powershell
.\install.ps1 -Apply     # 会先备份 cordis.patch.yml
```

> 安装脚本不会碰你的 `node_modules` 依赖、不会跑 `pnpm install`。改完 patch 后**新开一个会话**才会加载新预设；
> 但**工作台客户端（`client.js`）改动必须完整重启 DSH**——client bundle 的 rev 在 DSH 启动时计算，Ctrl+R / 新会话都不刷新。

### 方式二：手动安装

```powershell
# 1) 黑板技能
New-Item -ItemType Directory -Force "$env:DSH_HOME\skills\muteki-board" | Out-Null
Copy-Item .\board\board.py       "$env:DSH_HOME\skills\muteki-board\"
Get-Content .\board\SKILL.md -Raw |
  ForEach-Object { $_ -replace '\{\{PYTHON\}\}', 'python' -replace '\{\{BOARD\}\}', "$env:DSH_HOME\skills\muteki-board\board.py" -replace '\{\{STORAGE\}\}', "$env:USERPROFILE\.dsh-muteki\artifacts" } |
  Set-Content "$env:DSH_HOME\skills\muteki-board\SKILL.md" -Encoding UTF8

# 2) 插件（放 profile 根目录，用相对路径挂载）
$p = "$env:DSH_HOME\profiles\desktop"
Copy-Item .\plugins\dsh-muteki-orchestrator\plugin-v13.mjs "$p\muteki-orchestrator.mjs" -Force
Copy-Item .\plugins\muteki-core\muteki-core.mjs "$p\muteki-core.mjs" -Force

# 3) 把 preset\preset-muteki.patch.yml 里的 {{...}} 换成你的真实路径，
#    然后追加到 $p\cordis.patch.yml 末尾；同时把 muteki-core 的 insert 也加上。
```

`preset\preset-muteki.patch.yml` 里的占位符：

| 占位符 | 填什么 |
|---|---|
| `{{PYTHON}}` | 你的 python 可执行文件，例如 `python` 或 `<Python 安装目录>\python.exe` |
| `{{BOARD_PY}}` | `board.py` 的绝对路径 |
| `{{STORAGE_DIR}}` | 证据库目录，例如 `%USERPROFILE%\.dsh-muteki\artifacts` |
| `{{CLAUDE_BIN}}` | `claude` 可执行文件（用不上 `muteki_cli` 可随便填） |
| `{{CLAUDE_CONFIG_DIR}}` | Claude Code 的独立配置目录（同上） |

这五个占位符由 `install.ps1` 在**安装时**替换，`preset-muteki.patch.yml` 与 `board/SKILL.md`
共用同一套命名（历史上 SKILL.md 曾用 `{{BOARD}}` / `{{STORAGE}}`，自 1.1.1 起统一）。

> **不要混淆**：`muteki-orchestrator` 内部 worker / reviewer prompt 里也有 `{{PYTHON}}` / `{{BOARD}}` / `{{STORAGE}}`，
> 那是**运行时**由插件的 `fillCmd()` 从配置（`python` / `boardPy` / `storageDir`）填充的，
> 与安装占位符是两套独立机制，**不需要手工替换**，也不会被 `install.ps1` 处理。

手动装工作台（可选，要右侧栏 UI 才装）等价于 `install.ps1` 的 `[2b/4]`，**四步缺一不可**：
包复制到 `<profile>\muteki-workbench-pkg\`、junction 到 `node_modules\muteki-workbench`、
profile `package.json` 声明 `file:./muteki-workbench-pkg` 依赖、把 `muteki-workbench` 加进
`dsh.profile.bundles` 白名单。详见 `plugins/muteki-workbench/README.md`「安装」。装完完整重启 DSH。

### 安装后自检（加载失败排查）

完整重启 DSH 后新开一个 Muteki 会话，逐项确认：

1. **预设能加载**：会话工具列表里有 `muteki_run` / `muteki_dispatch` / `muteki_tick` 等。若整个预设「加载失败」，先查 `tool-agent-team` 行是否 `disabled: true`（rc.3 必需，见兼容性说明）。
2. **黑板可用**：跑一条 `python <board.py 绝对路径> stats`，不报 command not found / 路径错。
3. **工作台页签**：右侧栏有「Muteki 工作台」、会话头部「Muteki 蜂群」旁有「工作台」胶囊。没有 → 查 `dsh.profile.bundles` 是否含 `muteki-workbench`（只加依赖不进名单 = 不加载）。
4. **设置路由不 404**：工作台能读出当前覆盖。404 → 服务端插件没挂载，同样查白名单与是否完整重启。
5. **客户端更新生效**：改过 `client.js` 后 Ctrl+R / 新会话**不生效**，必须完整重启 DSH（client bundle rev 启动时计算）。

### 安装配置（`config.json`）

`install.ps1` 会在 `-ConfigDir`（默认 `%USERPROFILE%\.dsh-muteki`）下生成 `config.json`：

```json
{
  "python": "python",
  "board_py": "<你的 DSH home>\\skills\\muteki-board\\board.py",
  "storage_dir": "<你的证据目录>",
  "config_dir": "<配置目录>",
  "version": "<安装时从插件 package.json 读取>"
}
```

`version` 由 `install.ps1` 从 `plugins/dsh-muteki-orchestrator/package.json` 读取后写入，跟着 release 走，不用手填。

`board.py` 按 **`MUTEKI_ARTIFACT_DIR` 环境变量 > `config.json` 的 `storage_dir` > 内置默认** 的顺序定位证据目录。
这解决了「安装时自定义 `-StorageDir`，插件写到自定义目录、`board.py` 却去内置默认找索引」的分叉问题
（此前表现为：所有 fact 退化成 observation，或带 `--artifact` 时 exit 2）。

- 配置文件用 UTF-8 **无 BOM** 写入（BOM 会让 JSON 解析失败）；`board.py` 读取时用 `utf-8-sig`，即使有 BOM 也容忍。
- 配置缺失或损坏时静默回退到内置默认，不会让黑板命令崩掉。
- 可用 `MUTEKI_CONFIG` 指向别的配置文件（多套安装 / 测试隔离时有用）。

### 工作台（右侧栏档位式，可选）

安装后重启 DSH，点会话头部「Muteki 蜂群」旁的「工作台」胶囊（或右侧栏页签）打开 `muteki-workbench` 工作台：

![Muteki 蜂群工作台](assets/workbench.png)

- **模式 × 档位两个维度**：运行模式（人主导 / 无人值守 / 靶场批量）决定派单形状；强度档位（稳妥 / 推荐 / 全力）决定并发与额度。**点档位即自动切到靶场批量**并套用该档推荐值（tier `lite/standard/max`），不会留下「选了档位却仍跑 attended」的错位；首开默认人主导 + 跟随预设，推荐档仅以 badge 标示。
- **档位按钮而非滑杆**：选中实心强调色、未选中暗底；悬浮白字提示解释每个按钮。非批量却带数字覆盖时显示琥珀提示（并发池不启用、数字仅作额度覆盖）。数字微调 / 口径 / 汇率在「高级」折叠里。
- **计价默认人民币**（DSH/DeepSeek 按 CNY 计费），可一键切 $；推荐档按 DeepSeek 实际口径标定，量级真实；旁常驻「价格预算仅为估算，不代表实际使用」。
- **保存即生效，不用重启**：覆盖写进 `storageDir/settings.json`，orchestrator 下一次额度判定读取（优先级高于 patch）；删文件即收回。渐变保存按钮有改动才亮、成功闪绿；保存栏固定底部、不遮挡内容。
- **派单自动打开子代理实时对话 pane**（默认开、可关、最多 8 个）。
- 账本快照：按题显示派单次数 / DeepSeek 估算成本 / 剩余令牌。

在 DSH 右侧栏中的实际样子（靶场批量 + 稳妥档）：

![工作台在 DSH 右侧栏](assets/workbench-dsh.png)

不想用 UI 时直接编辑 `settings.json` 或删除它即可，行为与无工作台时一致。细节见 `plugins/muteki-workbench/README.md`。

---

## 使用

1. 新开一个会话，在输入框下方把预设切到 **Muteki 蜂群**；
2. 发题目 / 靶机 / 目标，让它先拆任务：

```
目标：http://1.2.3.4:8080 格式 flag{...}
先 board.py use web-8080，把这道题拆成至少 2 条有界 Step，
再用 muteki_run 跑，limit 2，max_minutes 15。
```

3. 想手动看单步：`muteki_tick`（一轮）或 `muteki_dispatch`（单个 Step）；
4. 想审图：`muteki_review`；
5. 想跨引擎对照：`muteki_cli`（需要本机已装并登录 Claude Code CLI）；
6. 要离开电脑 / 挂定时任务：把插件配置的 `mode` 改成 `unattended`——额度自动收紧、令牌不足不再等待、连续 3 轮无进展就停。回到屏幕前改回 `attended`。

### 黑板常用命令

```bash
board.py context                 # 当前题全图（死路在前、事实新→旧）
board.py context --all           # 跨题审计
board.py context --budget 6000   # 限定字符预算（含提示行，保证不超），喂子代理用
board.py context --section deadends,facts,tasks   # 只看指定段落、自定义顺序
board.py task add "验证 SQL 注入" --detail "..." --priority 3
board.py task list --status open
board.py task reopen 3           # 中断后释放卡住的任务
board.py task reclaim --minutes 30
board.py claim web-login --ttl 900 --note "登录接口"
board.py fact "登录处存在注入" "..." --artifact aXXXX --quote "原文片段"
board.py deadend "排除 XSS" --tested "..." --observed "..." --artifact aXXXX
board.py flag "flag{...}" --source "响应体 /debug" --artifact aXXXX
board.py flagstatus 1 --set accepted --verified-by "平台回显 correct"
board.py adopt f1,d3,g1          # 把旧题/legacy 里属于本题的记录迁过来
board.py review list --status open
board.py artifact list --limit 20   # 查证据 id
board.py read f3                 # 细读一条（f/d/g/t/r/a 前缀）
board.py fact list               # 列出事实与观察（标 [事实]/[观察]；--level fact 只看事实）
board.py search "关键词"
board.py stats
board.py report                  # 收束复盘（Markdown，可直接贴 writeup）
board.py report --json           # 供插件/CI 消费
```

---

## 目录结构

```
dsh-muteki-preset/
├─ install.ps1                     # Windows 一键安装
├─ CHANGELOG.md                    # 变更记录（3–5 个问题一个 release）
├─ preset/
│  └─ preset-muteki.patch.yml      # 预设定义（含占位符）
├─ plugins/
│  ├─ dsh-muteki-orchestrator/     # 派单 / 自动循环 / 记账 / 额度
│  │  ├─ README.md                 # 插件独立安装说明
│  │  ├─ package.json
│  │  └─ plugin-v13.mjs
│  └─ muteki-core/                 # 证据捕获（tools/result → artifacts）
│     ├─ README.md                 # 插件独立安装说明
│     └─ muteki-core.mjs
├─ board/
│  ├─ board.py                     # 黑板（SQLite，标准库）
│  └─ SKILL.md                     # 给 agent 用的黑板操作手册
├─ scripts/
│  ├─ check_sensitive.py           # 发布前敏感信息门禁（标准库）
│  └─ sensitive.local.txt          # 本地黑名单（.gitignore 排除，不提交）
├─ tests/
│  ├─ test_board.py                # 黑板回归（子进程方式）
│  ├─ test_check_sensitive.py      # 门禁回归（含误报防护）
│  ├─ test_install.py              # 安装脚本冒烟（临时假 DSH_HOME）
│  ├─ orchestrator_harness.mjs     # 插件测试脚手架（mock ctx + 真实 board.py）
│  └─ test_orchestrator.mjs        # 插件回归（node:test，需 DSH 依赖，缺则 skip）
└─ assets/icon.png
```

---

## 插件独立使用

两个插件都不依赖 Muteki 预设的 persona，可以单独挂到其他预设或 profile 全局：

| 插件 | 单独用能做什么 | 依赖 |
|---|---|---|
| `muteki-core` | 任意会话里捕获工具结果、生成证据 id，配合 board.py 做证据门 | 无（只要 DSH） |
| `muteki-orchestrator` | 任意预设里获得 `muteki_dispatch/tick/run/review/cli` 五个工具 | board.py（任务队列、flag 与进展快照、review 写回） |

挂载时注意两条硬约束：**必须放在 preset 的 `plugins` 内**（agent scope，否则 `UNAUTHORIZED`），**用相对路径 `./muteki-orchestrator.mjs` 引用**（文件放 profile 根目录；这样不依赖 `node_modules`，pnpm 重装也不会把它移走）。各插件的详细安装步骤见它们目录下的 `README.md`。

> **为什么不用 `@local/...` 包名？** 把本地插件放进 `node_modules` 时，插件管理器会把它当「普通依赖（未声明 `dsh.bundle`）」，显示「已安装，未生效」；而 `pnpm install` 看到它不在依赖树里，会把它移到 `node_modules\.ignored`。放 profile 根目录 + 相对路径可以同时绕开这两个坑。

---

## 配置项（`muteki-orchestrator`）

| 配置 | 默认 | 说明 |
|---|---|---|
| `python` | `python` | 调 `board.py` 用的解释器 |
| `boardPy` | `~/.dsh-muteki/board.py` | `board.py` 路径 |
| `storageDir` | `~/.dsh-muteki/artifacts` | 证据与账本：`runs.json`、`costs.json`、`totals.json`、`buckets.json`、`overrides.jsonl`、`subagents.jsonl`、`cli.jsonl` |
| `mode` | `attended` | `attended`=人主导（额度宽）；`unattended`=无人值守/定时任务（额度紧） |
| `maxRunsPerHour` | 按 mode（40 / 12） | 派单令牌的每小时回填速率 |
| `burstRuns` | 按 mode（60 / 12） | 令牌桶容量=开局可一次性派多少单 |
| `onQuota` | 按 mode（wait / stop） | `muteki_run` 令牌不足时等回填还是立即停 |
| `maxWaitMinutes` | 按 mode（10 / 0） | `onQuota=wait` 时单次最长等待分钟数 |
| `stagnationLimit` | 按 mode（5 / 3） | 连续多少轮无新增带证据 fact/flag 就停并写复核意见；0=关闭 |
| `workerUsdPerMinute` | `0.1` | DSH 子代理每分钟估算成本（Anthropic 标价口径）；0=不估 |
| `estimateToActual` | `0.1` | 估算口径 → 真实账单口径的换算系数（接 DeepSeek 约 1/10） |
| `costBasis` | `estimate` | 成本闸门用哪个口径：`estimate` / `actual`（选 actual 时上限应调低约 10 倍） |
| `maxCostUsdPerHour` | 按 mode（$15 / $5） | 每题每小时成本上限（估算口径） |
| `maxRunsPerChallenge` | 按 mode（300 / 100） | 整题累计派单总闸，不随小时重置 |
| `maxCostUsdPerChallenge` | 按 mode（$50 / $15） | 整题累计成本总闸 |
| `hardCancelOnFlag` | `true` | 出现本轮 flag 后中断同批子代理 |
| `claudeBin` | `claude` | Claude Code CLI 路径 |
| `claudeConfigDir` | 空 | 独立配置目录（建议指向一个干净、无插件的 config） |
| `enabled` | `true` | 总开关 |

这些额度字段省略即用 `mode` 预设；**显式写出的值优先**，所以老配置里写死的 `12` / `3` 不会被预设悄悄改掉。

---

## 发布前检查（敏感信息门禁）

这是一个公开的 CTF 作战预设，**任何真实作战数据都不能进仓库**：本机绝对路径、靶机 IP、flag 值、
证据 id、会话 UUID、webhook 回连地址、cookie/token、个人邮箱。为此仓库自带一个标准库门禁脚本。

```bash
# 提交前：扫描全部已跟踪文件
python scripts/check_sensitive.py

# 只扫描本次要提交的内容（取 git 索引里的版本）
python scripts/check_sensitive.py --staged

# 最高卫生标准：连不可利用的技术痕迹也阻断
python scripts/check_sensitive.py --strict

# CI / 机器可读
python scripts/check_sensitive.py --json
```

**分级策略**——按「他人能否利用 / 是否个人信息 / 是否涉及金钱」判定，而不是一刀切：

| 分级 | 含义 | 覆盖 | 退出码 |
|---|---|---|---|
| `block` | 可被他人直接利用的凭据与身份数据 | token / API key / 密码 / cookie 字面值、私钥、JWT、webhook 回连地址（他人可读写其中数据）、长 base64 密钥串、个人邮箱 | `1`，**阻止发布** |
| `warn` | 不可利用的技术痕迹 | 本机目录路径、题名与端口、证据 id、本地会话 UUID、已解题目的 flag 值、公开靶机 IP、sha256 摘要、通用机器用户名 | `0`，只提示 |

`2` 表示用法/环境错误。加 `--strict` 后 warn 也按 `1` 处理。
输出只打印**掩码后**的片段（`abc***gh(len=8)`），不会把完整敏感值回显到终端或 CI 日志。

**本地黑名单**：把你自己的真实字面量写进 `scripts/sensitive.local.txt`（每行一个）。
行首加 `!` 表示 `block`，不加表示 `warn`。该文件已被 `.gitignore` 排除，**不会提交**，但门禁会用它扫描仓库内容。

**误报处理**：只豁免明显是合成示例的值（`127.0.0.1`、`1.2.3.4`、`flag{test}`、`a1x2y3z4-8f2a`、
`users.noreply.github.com` 等），真实凭据一律不豁免。代码里的 f-string 占位符（`NULL{cond}`、`task_{status}`）
与包名/URL 已做误报防护，见 `tests/test_check_sensitive.py`。

运行期数据（`*.db`、`*.jsonl`、`runs.json`、`costs.json`、`preset-muteki.generated.yml`）已在 `.gitignore` 中。
**不要把 `artifacts/` 目录或黑板库贴进 issue / discussion**——里面可能含 cookie、token、靶机 IP 与 flag。

### 测试

```bash
python -m unittest discover -s tests -v
```

全部用标准库 `unittest`，无需 pytest。黑板用例以**子进程**方式执行 `board.py`，
因为「写操作后未提交」这类缺陷只在进程退出时暴露。

插件侧另有一套 Node 测试（`node:test`，同样无需第三方框架），用 mock ctx + mock subagents
驱动**真实插件代码**、黑板侧调**真实 board.py**，因此额度闸门与 `muteki_run` 的停止条件不必进 DSH 就能回归：

```bash
DSH_NODE_MODULES=<你的 DSH home>/profiles/desktop/node_modules \
  node --test tests/test_orchestrator.mjs
```

找不到 DSH 依赖时这套用例全部 **skip**（不算失败）。细节见 `plugins/dsh-muteki-orchestrator/README.md`。

---

## 发布完整性校验

每个 release 附一份 `SHA256SUMS.txt`，记录 GitHub 源码 zip / tar.gz 两个压缩包的 SHA256。
本项目是纯源码预设，没有可编译产物，Source code 压缩包就是完整发行物。下载后核对：

```powershell
Get-FileHash .\v1.11.0.zip -Algorithm SHA256   # 与 SHA256SUMS.txt 对应行比对
```

---

## 边界与安全

- **不提供隔离**：Worker 会执行真实命令、访问目标服务。只在你拥有或明确获授权的题目与靶机上使用；不要跑不可信的恶意 challenge。
- **运行期数据含敏感信息**：证据文件与黑板库会记录真实目标、cookie、token 与 flag。它们已被 `.gitignore` 排除；发布前务必跑 `python scripts/check_sensitive.py`（见上一节）。
- **Reviewer 只读**：`muteki_review` 只读黑板、不碰目标。
- **没有平台提交闭环**：flag 仍需要你手动复制到 CTF 平台；这是刻意留给人确认的一步。
- **额度不是硬沙箱**：attended 默认 $15/h、整题 $50（unattended $5/h、整题 $15）都是**估算**上限，不是账单保证。CLI 按 Anthropic 标价估算，DSH 子代理按墙钟时间估算（`subagent/end` 不带 token usage），接 DeepSeek 后端时实际账单低一个数量级。
- **Windows 优先**：脚本与路径以 Windows 为主，Linux/macOS 需把 `install.ps1` 的路径替换成对应 shell 写法。

---

## 致谢

- 机制灵感：[FishCodeTech/muteki](https://github.com/FishCodeTech/muteki)（AGPL-3.0，本项目未复制其源码）；
- 运行平台：DeepSeek Harness；
- 图标：仓库作者提供。

## License

[MIT](LICENSE)
