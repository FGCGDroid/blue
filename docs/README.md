# 文档索引

先读：

```text
README.md                 用户安装与功能
MAINTAINERS.md            维护入口、第一周、权限、发版
docs/architecture.md      整体结构、数据流、扩展点
docs/tool-map.md          66 个工具怎么分组、怎么拆、怎么加
docs/state-machines.md    任务/案件/诱饵/响应/告警状态怎么迁移
docs/development.md       开发环境、目录、测试
docs/known-issues.md      已知坑与结构债
docs/3.0/README.md        3.0 立项书、范围、里程碑
docs/3.0/design.md        3.0 详细设计
docs/3.0/backlog.md       3.0/3.1/3.2 需求分层
docs/3.0/decisions.md     3.0 架构决策记录
```

按任务查：

| 你要做什么 | 先看 |
|---|---|
| 新增 `blue_*` 工具 | `docs/tool-map.md` |
| 改任务审批/状态 | `docs/state-machines.md` |
| 改案件/诱饵/响应状态 | `docs/state-machines.md` |
| 加数据库表/迁移 | `docs/architecture.md`、`docs/state-machines.md` |
| 改控制台 UI | `docs/development.md`、`docs/architecture.md` |
| 改检测规则 | `docs/defense-regression.md`、`lib/playbooks.js` |
| 改内联网关 | `docs/inline-defense.md`、`docs/request-smuggling.md` |
| 接遥测/OTLP | `docs/otel.md`、`lib/telemetry.js`、`lib/otlp.js` |
| 跑 soak/回滚 | `docs/stabilization.md` |
| 发版 | `docs/release.md`、`docs/release-2.0.md` |
| 看运行红线 | `docs/operational-red-lines.md` |
| 看 3.0 计划 | `docs/3.0/README.md` |
| 看维护机器人 | `docs/maintenance-bot.md`、`MAINTENANCE.md` |

不要先读：

```text
lib/tools.js       2748 行，按 tool-map 查分区
lib/client.js      1848 行，按页签查
lib/store.js       1484 行，按表/状态机查
```

读代码的顺序：

```text
lib/judge.js        状态枚举/迁移
lib/plan.js         任务候选/风险
lib/store.js        表 + 迁移 + 状态执行
lib/tools.js        工具参数/作用域/落库
lib/ui.js           Host API
lib/client.js       控制台
```
