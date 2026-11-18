# 维护者手册

> 这份文档给现在的维护者、协作者和未来的维护者共用。
> 作者还在维护；它不是退出声明，是一张让任何人（包括半年后的自己）**一周内能看懂、一个月内能发版**的地图。

## 当前定位

```text
项目：dsh-blue-team-mode
稳定版：2.0.0
beta：2.0.0-beta.32（历史）
3.0：已开工（M0–M3.5 完成，docs/3.0/README.md）
协议：MIT
```

它不是一个普通小插件，而是：

```text
蓝队防守工作台
风险闸 + 事实库 + 审计 + 证据 + 诱饵 + 遥测 + CVE + 图谱
```

## 先读什么

按顺序：

```text
1. README.md
2. MAINTENANCE.md
3. docs/architecture.md
4. docs/tool-map.md
5. docs/state-machines.md
6. docs/release.md
7. docs/known-issues.md
8. docs/3.0/README.md（3.0 计划，已开工）
```

不要一上来读 `lib/tools.js`。
那是最大的一坨，不是入口。

## 代码入口

```text
lib/index.js   Cordis 插件入口
lib/tools.js   blue_* 工具注册
lib/ui.js      /blue/api Host 路由和快照
lib/client.js  右侧栏控制台
lib/store.js   SQLite 事实库
presets/blue/  主预设和六个角色
cordis.patch.yml  生成的补丁层
```

数据流：

```text
DSH session
→ blue_* tool
→ BlueStore(SQLite)
→ snapshot
→ /blue/api
→ client.js
```

## 改动入口

| 要改什么 | 先看 | 主要文件 |
|---|---|---|
| 新增一个 `blue_*` 工具 | `docs/tool-map.md` | `lib/tools.js`、`lib/playbooks.js`、`scripts/test-tools.mjs` |
| 改任务/审批状态 | `docs/state-machines.md` | `lib/judge.js`、`lib/store.js`、`lib/plan.js`、`lib/tools.js` |
| 改案件/诱饵/响应状态 | `docs/state-machines.md` | `lib/store.js`、`lib/response.js` |
| 加一张表 | `docs/architecture.md` | `lib/store.js`、`scripts/test-migration.mjs` |
| 加控制台页签/按钮 | `docs/development.md` | `lib/ui.js`、`lib/client.js`、`locale/*.json` |
| 改检测规则 | `docs/defense-regression.md` | `lib/playbooks.js`、`lib/detection.js` |
| 发版 | `docs/release.md` | `package.json`、`CHANGELOG.md`、`README.md` |

## 第一周任务

```text
跑通测试
启动 DSH
打开控制台
建一个 engagement
加一个资产
建一个任务
看 timeline
导出证据
```

跑通这些，再改代码。

## 关键不变量

改代码前必须知道：

```text
1. high 风险任务必须 pending_approval
2. timeline 是哈希链，不能随手 UPDATE/DELETE
3. 审计链断裂比功能缺失严重
4. 证据包导出前要脱敏
5. 诱饵只登记，不自动部署
6. 不自动封禁、不自动删除、不自动隔离
7. schema 迁移必须幂等、只增不毁
8. 不把“只告警”写成“已阻断”
```

## 迁移

```text
lib/store.js
```

规则：

```text
CREATE TABLE IF NOT EXISTS
PRAGMA table_info 检查列
缺列就 ALTER TABLE ADD COLUMN
不要重建表
不要删旧列
```

参考：

```text
scripts/test-migration.mjs
scripts/test-rollback.mjs
```

## 测试

```text
npm test
node scripts/validate.mjs
node scripts/build.mjs
node scripts/check-compliance.mjs --selftest
node scripts/test-rollback.mjs
```

发布前必须全绿。

## 权限与账号

需要写清楚的不是 token，是**权限关系**：

```text
GitHub 仓库：maintain/admin
npm 包：qiuhe 账号的 maintainer 权限
DSH profile：本机安装目录
市场 catalog：awesome-dsh-plugin 的 admin 才能触发重建
```

不要把 token 写进仓库、issue、聊天记录。
正确做法：

```text
npm 加 maintainer
GitHub 加 collaborator/team
必要时转移仓库到组织
```

## 发布

详见 `docs/release.md`。

最短路径：

```text
改版本
写 CHANGELOG
npm test
npm pack
npm publish --tag latest 或 beta
GitHub tag/release
等 catalog 重建
```

## 已知风险

详见 `docs/known-issues.md`。

最重要的几条：

```text
市场 catalog 可能滞后
soak 按实际采样时间累计，墙钟中间可暂停
CVE 数据未外部核验
审计锚定仍偏本地
没有 RBAC / 静态加密
```

## 多人维护与权限分工

作者仍在维护。下面是“如果哪天需要多人协作”的几种方式，不是退出声明。

### 方式 A：co-maintainer

适合有人愿意长期参与：

```text
先给 triage
再给 PR 合并权
一起发一个版本
最后给 npm/GitHub 权限
```

### 方式 B：fork / 社区分支

适合作者暂时没空、但社区要继续推进：

```text
fork 仓库
改 package name 或 scope
保留 MIT 声明
明确说明是社区分支
```

### 方式 C：维护模式

适合作者还在、但只做有限维护：

```text
只修安全和兼容
功能 PR 降速
README 写清当前维护状态
npm 保留可装
```

## 维护者检查表

```text
[ ] 能跑 npm test
[ ] 能本地启动 DSH 并看到控制台
[ ] 能建 engagement / 资产 / 任务
[ ] 能导出并验证证据包
[ ] 能打 tarball
[ ] 能解释 latest 和 beta 的区别
[ ] 知道 catalog 为什么可能滞后
[ ] 知道哪些操作绝对不能自动化
```

全部打勾，才算能独立发版。

## 一句话

> 维护者不需要记住所有细节，只需要有一张不会走丢的地图。
