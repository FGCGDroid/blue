# v3 —— 3.0 骨架

> 状态：M1 骨架，未实现业务  
> 分支：`3.0-dev`  
> 入口：`v3/index.js`  
> 说明：3.0 代码与 2.0 `lib/` 并行，暂不写入 npm `files`，也不改 `cordis.patch.yml`。

## 这是什么

这是 3.0 的目录与分层骨架，不是可用的 3.0。

已经真实存在：

```text
v3/index.js              Cordis 入口（blueTeamModeV3）
v3/store.js              Cordis 事实库入口（blueTeamV3）
v3/tools.js              工具入口（0 个工具）
v3/ui.js                 Host API 入口（0 条路由）
v3/gateway.js            网关 CLI，只支持 --check
v3/bootstrap/config.js   环境变量解析与校验
v3/domain/task/states.js 任务状态机（从 2.0 原样搬）
v3/domain/task/risk.js   风险分级（从 2.0 原样搬）
v3/domain/evidence/hash.js  timeline 哈希（从 2.0 原样搬）
```

还是占位：

```text
v3/domain/gateway/*      路径规范化、策略、决策
v3/app/*                 用例
v3/infra/*               SQLite、网关、指标、外锚
v3/tools/*               66 + 7 个工具
v3/ui/*                  Host API
```

占位函数一律抛 `NOT_IMPLEMENTED`，不会静默返回假结果。

## 检查

```bash
node scripts/check-v3-layers.mjs
node scripts/test-v3-skeleton.mjs
node v3/gateway.js --check
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
M2  数据层：sqlite db + migrations + repos
M3  路径阻断：normalize + policy + gateway + metrics
M3.5 响应执行、外锚 sink
M4  工具迁移
```

## 不要做

```text
不要把 v3 接进 cordis.patch.yml
不要把 v3 加进 package.json files
不要让 v3 import ../lib
不要在 v3 里写 2.0 的业务副本
```

接入是 3.0 切换时的一次提交，不是现在。
