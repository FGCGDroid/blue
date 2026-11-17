# v3 —— 3.0 骨架与 M3 内核

> 状态：M0 契约、M1 全目录骨架、M2 数据层基础、M3 路径阻断内核已完成
> 分支：`3.0-dev`
> 入口：`v3/index.js`
> 规模：104 个 JS；23 个工具组；计划 73 个工具（现有 66 + 新增 7）
> 说明：3.0 代码与 2.0 `lib/` 并行，暂不写入 npm `files`，也不改 `cordis.patch.yml`。

## 这是什么

这是 3.0 的完整目录骨架 + 可运行的路径阻断内核，不是完整的 3.0。

已经真实存在：

```text
v3/index.js              Cordis 入口（blueTeamModeV3）
v3/store.js              事实库入口（blueTeamV3），SQLite + 8 个 repo
v3/tools.js              工具入口（23 组串起来，0 个工具注册）
v3/ui.js                 Host API 入口（0 条路由）
v3/gateway.js            网关 CLI：--check / 启动独立网关
v3/bootstrap/            配置、依赖容器、生命周期
v3/ports/                9 个接口声明
v3/domain/task/          状态机、风险分级、模型常量、不变量
v3/domain/incident|decoy|response/  状态机
v3/domain/evidence/hash.js          timeline 哈希
v3/domain/shared/        errors、canonical JSON、时间
v3/domain/gateway/       规范化、策略、决策、走私头、内容检查
v3/infra/sqlite/         17 张表 schema + 2.0 迁移 + 备份
v3/infra/sqlite/repos/tasks.js     建任务/审批/状态迁移
v3/infra/sqlite/repos/timeline.js  追加/读取/验证哈希链
v3/infra/gateway/        server、read-body、forward、decision-log、canary
v3/infra/policy/         策略加载/保存/热加载
v3/infra/metrics/        计数器 + /metrics 渲染
v3/infra/fs/safe-path.js 路径闸
v3/tools/catalog.js      73 个工具名与分组
v3/tools/index.js        23 个工具组清单
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

还是占位：

```text
v3/app/*                 用例（tasks/create、tasks/approve 已有占位）
v3/infra/evidence/*      证据包、锚定、外锚 sink（M3.5）
v3/infra/telemetry/*     文件遥测、OTLP、检测（M4）
v3/infra/sqlite/repos/*  facts/incidents/decoys/responses/evidence/telemetry（M2 剩余）
v3/tools/*.js            23 个组的 register（M4）
v3/ui/*                  Host API 与 2.0 兼容视图（M4）
```

占位函数一律抛 `NOT_IMPLEMENTED`，不会静默返回假结果。
工具组现在不注册任何工具，避免出现“名字有了、实现是假的”。

## 检查

```bash
npm.cmd run check:v3
npm.cmd run test:v3
node scripts/parity.mjs --engine=2.0
node v3/gateway.js --check
```

当前结果：

```text
✓ v3 分层检查通过（104 个 JS）
✓ v3 骨架测试通过
✓ v3 数据层测试通过：新库/审批/时间线/重开/2.0 迁移
✓ v3 路径契约通过（40 条）
✓ v3 网关集成通过：阻断/放行/canary/body/内容/日志/metrics/热加载
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
M2  继续：facts/incidents/decoys/responses/evidence/telemetry repo、回滚脚本、fixture 扩展
M3.5 响应执行、外锚 sink
M4  工具迁移：73 个工具定义
```

## 不要做

```text
不要把 v3 接进 cordis.patch.yml
不要把 v3 加进 package.json files
不要让 v3 import ../lib
不要把 2.0 代码整段复制过来；纯逻辑只能按契约搬，并有向量
```

接入是 3.0 切换时的一次提交，不是现在。
