# v3 —— 3.0 内核与 M4.0

> 状态：M0 契约、M1 骨架、M2 数据层、M3 路径阻断、M3.5 响应执行/外锚、M4.0 session/asset/alert 11 个工具已完成
> 分支：`3.0-dev`
> 入口：`v3/index.js`
> 规模：114 个 JS；23 个工具组；已注册 11/73 个工具（现有 66 + 新增 7）
> 说明：3.0 代码与 2.0 `lib/` 并行，暂不写入 npm `files`，也不改 `cordis.patch.yml`。

## 这是什么

这是 3.0 的完整目录骨架 + 可运行的路径阻断内核 + M4.0 第一批工具，不是完整的 3.0。

已经真实存在：

```text
v3/index.js              Cordis 入口（blueTeamModeV3）
v3/store.js              事实库入口（blueTeamV3），SQLite + 8 个 repo
v3/tools.js              工具入口（23 组串起来；M4.0 已注册 11 个）
v3/ui.js                 Host API 入口（0 条路由）
v3/gateway.js            网关 CLI：--check / 启动独立网关
v3/bootstrap/            配置、依赖容器、生命周期
v3/ports/                9 个接口声明
v3/domain/task/          状态机、风险分级、模型常量、不变量
v3/domain/incident|decoy|response/  状态机
v3/domain/evidence/hash.js          timeline 哈希
v3/domain/shared/        errors、canonical JSON、时间
v3/domain/gateway/       规范化、策略、决策、走私头、内容检查
v3/domain/response/       manual/mock 执行适配器
v3/app/response/          dry-run/apply/rollback/verify
v3/app/evidence/anchor.js 锚定 + 注入式 sink 推送
v3/infra/sqlite/         17 张表 schema + 2.0 迁移 + 备份
v3/infra/sqlite/repos/tasks.js     建任务/审批/状态迁移
v3/infra/sqlite/repos/timeline.js  追加/读取/验证哈希链
v3/infra/sqlite/repos/facts.js     资产/告警/发现/IOC
v3/infra/sqlite/repos/incidents.js 案件/案件关联
v3/infra/sqlite/repos/decoys.js    诱饵/命中/自动 active/到期
v3/infra/sqlite/repos/responses.js 响应台账/审批后执行/回滚
v3/infra/sqlite/repos/evidence.js  Ed25519 时间线锚定/验证
v3/infra/sqlite/repos/telemetry.js 遥测源/cursor/错误
v3/infra/gateway/        server、read-body、forward、decision-log、canary
v3/infra/evidence/       anchor-sink（file / https 白名单）
v3/infra/policy/         策略加载/保存/热加载
v3/infra/metrics/        计数器 + /metrics 渲染
v3/infra/fs/safe-path.js 路径闸
v3/tools/catalog.js      73 个工具名与分组
v3/tools/index.js        23 个工具组清单
v3/tools/define.js       defineTool / safe / JSON 输出
v3/tools/guard.js        防御自检门禁
v3/tools/context.js      会话绑定、目标解析、scope
v3/tools/session.js      M4.0：6 个会话/目标工具
v3/tools/asset.js        M4.0：2 个资产工具
v3/tools/alert.js        M4.0：3 个告警工具
v3/infra/sqlite/repos/engagements.js  目标登记/复用/统计
```

M3 已实现：

```text
路径规范化：点段/编码分隔符/双编码/控制字符/分号/尾随点空格
策略判定：builtin deny -> deny -> protected allow -> protected block -> default
网关：独立进程、独立端口、默认 8787
顺序：走私头 -> 绕过头 -> 规范化 -> 策略 -> 读 body -> 内容检查 -> 转发
canary：保护路径变体全部 400/403，上游 0 命中
日志：block 全量 JSONL，allow 可选
指标：/metrics，health：/healthz
热加载：mtime 变化，非法策略保留旧策略
```

M3.5 已实现：

```text
响应执行：dry-run / apply / rollback / verify
适配器：manual（默认，只打印人工命令）+ mock（测试）
审批闸：未审批不能执行；执行/回滚必须有证据
外锚：file JSONL + https 白名单；不跟随重定向
sink 失败不阻塞本地锚点
```

M4.0 已实现：

```text
session 6：engagement_open / session_info / scope_check /
           preflight / defense_selfcheck / tool_catalog
asset 2：asset_add / asset_query
alert 3：alert_ingest / alert_list / alert_triage
统一 self-check 门禁；工具层不写 SQL
```

还是占位：

```text
v3/app/*                 其余用例（tasks/create、tasks/approve 已有占位）
v3/infra/evidence/bundle.js  证据包（M4）
v3/infra/telemetry/*     文件遥测、OTLP、检测（M4）
v3/tools/*.js            其余 20 个组的 register（M4.1+）
v3/ui/*                  Host API 与 2.0 兼容视图（M4.1+）
```

占位函数一律抛 `NOT_IMPLEMENTED`，不会静默返回假结果。
M4.0 只注册 11 个真实工具；其余组仍不注册假工具。

## 检查

```bash
npm.cmd run check:v3
npm.cmd run test:v3
npm.cmd run test:lab
node scripts/parity.mjs --engine=2.0
node v3/gateway.js --check
node scripts/rollback-v3.mjs --root <data-dir>
```

当前结果：

```text
✓ v3 分层检查通过（114 个 JS）
✓ v3 骨架测试通过
✓ v3 M4.0 工具契约通过：11 个
✓ v3 数据层测试通过：新库/审批/时间线/重开/2.0 迁移
✓ v3 加固回归通过：备份/审批/派生字段/配置/策略/query/遥测/锚点 key
✓ v3 事实/案件仓储通过
✓ v3 剩余仓储通过：诱饵/响应/锚定/遥测源
✓ v3 迁移回滚通过
✓ v3 路径契约通过（40 条）
✓ v3 网关集成通过：阻断/放行/canary/body/内容/日志/metrics/热加载
✓ v3 响应执行通过：dry-run/审批/人工回填/回滚/mock
✓ v3 外锚通过：file sink/白名单校验/混合失败不阻塞
✓ 2.0 parity 基线通过
```

分层检查规则：

```text
domain 不能 import app/infra/tools/ui/bootstrap，不能直接用 fs/http/sqlite
app    不能 import infra/tools/ui/bootstrap，不能直接用 sqlite/http
infra  不能 import tools/ui/bootstrap
tools  不能 import infra/ui/bootstrap
ui     不能 import infra/tools/bootstrap
bootstrap 可以 import 全部
tools 里不能出现 SQL 字符串
```

## 下一步

```text
2026-11-18  M4.0 完成：11/73
2026-11-19  M4.1 finding/ioc/task/incident
2026-12    M4.2 ~ M4.5
2027-01    影子双跑 / 3.0.0-rc
2027-02    3.0.0
2027-04    3.1.0
```

完整计划见 [`../docs/3.0/fast-track.md`](../docs/3.0/fast-track.md)。

## 不要做

```text
不要把 v3 接进 cordis.patch.yml
不要把 v3 加进 package.json files
不要让 v3 import ../lib
不要把 2.0 代码整段复制过来；纯逻辑只能按契约搬，并有向量
```

接入是 3.0 切换时的一次提交，不是现在。
