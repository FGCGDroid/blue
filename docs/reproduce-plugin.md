# 复刻插件：dsh-blue-team-mode 3.0.7

给要复刻 DSH 蓝队插件的人。不是网站，是插件本体。

## 1. 运行要求

```text
Node.js  >= 22.13
DSH      >= 0.2.1-rc.1
系统     Windows / macOS / Linux 都行
依赖     无（零运行时 npm 依赖）
```

`package.json` 里的 engines：

```json
"engines": { "node": ">=22.13", "dsh": ">=0.2.1-rc.1" }
```

## 2. 源码结构

```text
package.json            包信息、exports、engines
cordis.patch.yml        由 presets 生成，DSH 加载入口
lib/
  index.js              宿主自举：路径、技能同步、ctx.blueTeamMode
  store.js              SQLite 事实库（19 张表）
  tools.js              66 个 blue_* 工具
  ui.js                 /blue/api 与控制台资源
  client.js             右侧控制台前端
  plan.js               任务生成与风险分级
  judge.js              状态机
  detection.js          检测规则
  ...                   其余按能力拆分的模块
v3/
  index.js              3.0 骨架，发布 blueTeamModeV3
  store.js / tools.js / ui.js
  bootstrap/            采集器、网关
  remote.js             远程接入
presets/
  blue/                 指挥官 + 六个执行角色预设
skills/                 随包技能（markdown）
scripts/                build / validate / test
docs/                   文档
```

## 3. 安装

### 方式一：从源码目录

```bash
git clone https://github.com/FGCGDroid/blue.git
cd blue
npm install                 # 没有依赖，只是生成 lock
node scripts/build.mjs      # 重新生成 cordis.patch.yml
node scripts/validate.mjs
dsh plugin add .
```

### 方式二：从 tgz

```bash
npm pack
dsh plugin add dsh-blue-team-mode-3.0.7.tgz
```

### 方式三：从 Release

```text
GitHub Release 下载 dsh-blue-team-mode-3.0.7.tgz
dsh plugin add <tgz>
```

npm 上的 2.0.0 是旧的，不要从 npm 装。

## 4. 验证

```bash
node scripts/test-tools.mjs
node scripts/test-ui.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

跑通后重启 DSH：

```bash
dsh restart web
```

## 5. 数据

```text
$DSH_HOME/blue/blue.db          事实库（19 张表）
$DSH_HOME/blue/skills/          技能同步目录
$DSH_HOME/blue/backups/         迁移前备份
$DSH_HOME/blue/collector/       远程事件
```

迁移是启动时增量补列，回滚脚本：

```bash
node scripts/rollback-v3.mjs
```

## 6. 预设

```text
blue                  指挥官
blue-worker           全工具执行角色
blue-worker-monitor   监控
blue-worker-intel     情报
blue-worker-hunt      狩猎
blue-worker-ir        应急
blue-worker-forensics 取证
blue-worker-hardening 加固
```

## 7. 工具

```text
66 个 blue_* 工具
写库/派发类全部走「防御自检」门禁
高风险任务只能进 pending_approval，人工审批后派发
```

## 8. 复刻要点

```text
1. 先确认 DSH 版本 >= 0.2.1-rc.1，否则预设挂不上
2. presets 改完必须 node scripts/build.mjs，cordis.patch.yml 要一起提交
3. 不要跳过「防御自检」门禁，否则工具全返回 SELF_CHECK_REQUIRED
4. 数据目录可以用 BLUE_HOME 覆盖
5. 没有 npm 依赖，装不上多半是 Node 版本问题
```

## 9. 和网站的关系

```text
插件是 DSH 里的防守大脑
网站是它实际防守的靶标之一
两者独立，可分别复刻
```

网站和远程防控见：

```text
docs/reproduce-stack.md
remote/README.md
local/README.md
```
