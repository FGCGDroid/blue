# 文档索引

> 当前版本：**3.0.7**（2026-11-26）
> 3.0 已正式发布，`docs/3.0/` 下的立项、路线图属于历史记录，保留作决策依据。

## 先读

```text
README.md                 安装、升级、功能总览
MAINTAINERS.md            维护入口、发版、权限
docs/architecture.md      整体结构、数据流、扩展点
docs/tool-map.md          工具分组与拆分规则
docs/state-machines.md    任务/案件/诱饵/响应/告警状态迁移
docs/development.md       开发环境、目录、测试
docs/known-issues.md      已知坑与结构债（当前）
docs/release.md           3.0 发版流程（npm 已停用）
```

## 3.0 相关

```text
docs/3.0-contract.md      3.0 行为契约与向量
docs/3.0/design.md        3.0 详细设计
docs/3.0/backlog.md       3.0 需求分层（部分已完成）
docs/3.0/decisions.md     架构决策记录
docs/3.0/README.md        历史立项文档（3.0 已发布）
```

## 4.0（未立项，仅概念稿）

> 3.0 已收尾，作者进入休息期；4.0 不立项、不排期，以下文档只作构思保留。

```text
docs/4.0/README.md        4.0 评估（未立项）
docs/4.0/concept.md       多主机协同防御概念稿
docs/4.0/sequencing.md    3.0/4.0 发布与测试顺序
```

## 按任务查

| 你要做什么 | 先看 |
|---|---|
| 安装 / 升级 2.0 → 3.0 | `README.md`「安装」「从 2.0 升级」 |
| 新增 `blue_*` 工具 | `docs/tool-map.md` |
| 改任务审批/状态机 | `docs/state-machines.md` |
| 改案件/诱饵/响应状态 | `docs/state-machines.md` |
| 加数据库表/迁移 | `docs/architecture.md`、`docs/state-machines.md` |
| 改控制台 UI | `docs/development.md`、`docs/architecture.md` |
| 改检测规则 | `docs/defense-regression.md`、`lib/playbooks.js` |
| 改内联网关 | `docs/inline-defense.md`、`docs/request-smuggling.md` |
| 接遥测 OTLP | `docs/otel.md`、`lib/telemetry.js`、`lib/otlp.js` |
| 跑 soak/回滚 | `docs/stabilization.md` |
| 发版 | `docs/release.md` |
| 看运行红线 | `docs/operational-red-lines.md` |
| 看维护机器人 | `docs/maintenance-bot.md`、`MAINTENANCE.md` |

## 不要先读

```text
lib/tools.js      体量大，按 tool-map 查分区
lib/client.js     控制台单文件，按页签查
lib/store.js      建表/迁移/状态机混在一起
```

## 文档维护规则

```text
1. 发版时必须同步 README 安装段、docs/release.md、docs/known-issues.md
2. 历史文档（docs/3.0/、docs/release-2.0.md）保留原文，只加「历史」标记
3. npm 已停用，任何文档不要再写 npm install dsh-blue-team-mode
```
