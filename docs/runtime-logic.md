# 这个插件是怎么跑起来的

写给想改代码或者想知道内部怎么走的人。版本 3.0.7。

## 加载

DSH 读完 profile 的 `cordis.patch.yml` 后，会按顺序把四个东西挂进来：

```text
dsh-blue-team-mode          lib/index.js
dsh-blue-team-mode/store    store.js
dsh-blue-team-mode/ui       ui.js
preset-blue                 presets/blue/*
```

`lib/index.js` 干的事很少。算一下包内路径，找到 `$DSH_HOME/blue`，把 `skills/*.md` 覆盖过去，然后把版本、路径这些塞进 `ctx.blueTeamMode`。技能每次都覆盖，是为了升级后提示词能跟着变。

`store.js` 负责数据库。打开 `$DSH_HOME/blue/blue.db`，跑迁移，把各个 repo 装好，最后发布成 `ctx.blueTeamV3`。工具和 UI 都从这里拿数据，没有谁直接读写 db 文件。

`v3/index.js` 自己不碰数据。它等 store 就绪，然后启动两个后台服务：采集器和远程接入。采集器就是每 10 秒跑一次的函数，后面单独说。

`ui.js` 注册 `/blue/api`、`/blue/v3/api`、`/blue/protect` 和样式表。控制台前端 `lib/client.js` 通过这几个接口拿快照。

## 门禁

`blue_defense_selfcheck` 是唯一会读会话的工具。它拿 DSH 里最后一条用户消息，去掉首尾空格，必须正好是「防御自检」四个字，否则返回 `SELF_CHECK_REQUIRED`。

写库和派发类工具在入口还有一个检查：没放行就直接拒绝，连数据库都不碰。只读的 `blue_session_info`、`blue_preflight` 不受影响。

这个设计挺烦人，但插件会真的封 IP、改配置，没有这一步等于谁拿到会话都能动手。

## 数据

数据库里 19 张表，常用的就几张：

```text
engagements   防守目标
assets        资产
alerts        告警
findings      发现
iocs          IOC
tasks         任务
telemetry_sources  采集源和游标
detection_rules    检测规则
knowledge_entries  打法库
timeline      时间线
```

迁移是启动时做的。用 `PRAGMA table_info` 看缺哪列就补哪列，不重建表。迁移前会备份到 `backups/`，回滚脚本是 `scripts/rollback-v3.mjs`。

## 采集器

`collector.start()` 里就一个 `setInterval(tick, 10000)`。

一次 tick 大概这样：

```text
找出 enabled 的 telemetry_sources
读各自的 JSONL 文件
从 cursor 开始取新增事件
没新增就结束
有新增就逐条解析、去重、匹配规则
命中规则写 alerts 和 timeline
推进 cursor
```

游标有个坑：如果 cursor 比文件实际行数还大，会回退到最近 500 条重扫。之前远程 agent 断了很久，恢复后游标卡在 20000，就是这么修好的。

远程采集是另一条路。服务器上的 `blue-agent` 通过 SSH 隧道把事件 POST 到 `127.0.0.1:9080/blue/collect`，那边校验 Bearer token、来源 IP、每分钟 120 条，然后写进 `collector/*.jsonl`，采集器再读。

## 控制台

`/blue/api` 是 POST，靠 `op` 区分动作：

```text
overview        快照
collectorStart  重启采集
approveTask     审批高风险任务
checkUpdate     查更新
updateInstall   下载安装
```

前端在 `lib/client.js`，右侧常驻面板，页签有概览、资产、告警、发现、IOC、任务、知识库、覆盖度。顶栏那个「检查更新」走的是 GitHub API 加 jsDelivr，因为 GitHub 的 Release 下载域名在国内经常超时。

## 自主循环

指挥官每轮大概这么走：

```text
看状态
调 blue_autopilot cycle
cycle 内部先 plan 生成任务，再做风险分级
high 的留在 pending_approval，不派发
low/medium 的返回 dispatch
指挥官按 dispatch 调 subagent
子代理跑完回来查库，确认真的落库
complete
```

风险分级在 `lib/plan.js`。隔离、杀进程、改防火墙、删文件这类直接判 high，进待审批。审批只能走 `blue_task_approve`，会写 `approved_by/at/note` 和一条 timeline，不允许直接改成 dispatched。

并发默认 3 个，可以调到 8。每次 cycle 间隔 30 秒，单场默认 12 轮，超了返回 `round_limit` 或 `cooldown`。

## 执行角色

预设放在 `presets/blue/`：

```text
blue                  指挥官
blue-worker           全工具
blue-worker-monitor   监控
blue-worker-intel     情报
blue-worker-hunt      狩猎
blue-worker-ir        应急
blue-worker-forensics 取证
blue-worker-hardening 加固
```

指挥官不挂执行角色的工具，只用 subagent 指定 `agent_preset`。

## 知识库

`knowledge_entries` 里每条规则有 `technique` 和 `variant` 两个字段。`classify.js` 根据标题、路径、状态码去猜打法分类，后台覆盖度矩阵按 ATT&CK 技术展示命中和缺口。

## 更新

`checkUpdate` 请求 `api.github.com/.../releases/latest`，拿 tag 和当前版本比，结果缓存 60 秒。`updateInstall` 从 `cdn.jsdelivr.net` 下载对应 tag 的 tgz，写到临时目录，然后 `dsh plugin add`。装完不自动重启，需要用户自己重启一次 DSH。

## 完整顺序

```text
DSH 启动
装四个插件
store 打开数据库
index 同步技能
collector 启动
用户选预设，发「防御自检」
放行
用户给目标
blue_protect 建档
blue_preflight 看工具
cycle 派活
子代理执行
采集器写告警
控制台刷新
```

## 常见故障

工具全返回 `SELF_CHECK_REQUIRED`，就是没发那四个字。

面板一直没数据，先看 `/blue/api` 里 collector 的 `last_run` 和 `last_error`。

告警不涨，查 `telemetry_sources.cursor` 和 9080 隧道。

更新报超时，基本是 GitHub 下载域名不通，走 jsDelivr 一般就没事。

高风险任务不动，是停在待审批，控制台点「批准」或者调 `blue_task_approve`。
