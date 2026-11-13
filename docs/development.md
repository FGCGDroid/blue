# 开发说明

这个插件不是从零写一个安全平台，而是把 DSH 已有的插件、工具、预设、客户端 UI 和 SQLite 拼成一个蓝队工作台。

## 基于什么开发

### 1. DSH 的 Cordis 插件体系

插件按 DSH 的 bundle / preset 方式挂载：

- `package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`
- `presets/blue/agent.cordis.yml` 是主指挥官预设
- `presets/blue/worker.cordis.yml` 是执行角色预设
- `scripts/build.mjs` 根据模板生成各角色变体

所以它不是独立应用，而是 DSH 的一个模式。安装后从预设里选择「蓝队防御模式」即可。

### 2. Node.js 22.13+

后端是普通 ESM 模块，没有 TypeScript 编译步骤，也没有打包器。

开发时用的是 Node 24，`package.json` 里要求 `>=22.13`。

### 3. Node 内置 `node:sqlite`

数据层直接用 `node:sqlite` 的 `DatabaseSync`，没有 better-sqlite3，也没有 SQLite 服务。

数据库在：

```text
$DSH_HOME/blue/blue.db
```

启用了 WAL、外键、busy_timeout，并用 `PRAGMA table_info` 做旧库补列迁移。

### 4. DSH 的工具 API

工具通过 `ctx.tools.register(defineTool(...))` 注册，模型看到的是普通工具调用，实际执行在 Host 进程。

主入口是 `lib/tools.js`，目前 57 个工具，覆盖：

- 目标与预检
- 资产、告警、发现、IOC
- 任务、审批、autopilot
- 日志扫描、样本初筛
- 加固检查、处置剧本、报告
- 欺骗诱饵、蜜罐/焦油坑

### 5. DSH 的客户端 UI

控制台是 DSH 的客户端插件，不是独立网页。

`lib/client.js` 通过 DSH 的模块加载器拿到 React，用 `React.createElement` 写界面，挂在右侧栏/浮层上。

Host 侧 `lib/ui.js` 提供同源 `POST /blue/api`，浏览器不直接打开 SQLite。

### 6. DSH 的 preset / subagent 机制

六个角色：

```text
monitor / intel / hunt / ir / forensics / hardening
```

每个角色有独立工具白名单和任务书。主会话通过 `subagent` 派发，worker 完成后回报，主会话核对数据库再回收。

### 7. 可选的系统工具

插件不捆绑 nmap、tshark、yara、volatility、fail2ban 等外部工具，只做检测和编排。

`blue_preflight` 会检查本机有没有这些命令；没有就返回替代方案，不假装可用。

## 目录结构

```text
lib/index.js       Host 入口，挂载工具、UI、服务和技能
lib/store.js       SQLite 事实库
lib/tools.js       57 个 blue_* 工具
lib/hunter.js      1 秒行为窗口（只标注，不封禁）
lib/ui.js          /blue/api 和控制台数据
lib/client.js      DSH 客户端控制台
lib/playbooks.js   角色、技能、处置剧本
lib/taskspec.js    任务书渲染
lib/plan.js        任务候选与风险分级
presets/blue/      主会话与 worker 预设
skills/            随包蓝队技能
scripts/           构建、测试、校验、可选诱饵服务
docs/              截图和说明
```

## 数据流

```text
日志 / 告警 / 样本
  → blue_* 工具
  → SQLite 事实库
  → 控制台 / 报告 / 任务
  → subagent 执行
  → 结果回写事实库
```

关键点是：**结论必须落库**。子智能体说“处理完了”不算，任务、时间线、告警状态里要有记录。

## 安全模型

- 主会话和 worker 都不挂 bash / pwsh / fs / fs-search / web
- 文件读取只走 `blue_*`，并有路径闸
- 外部日志、样本、网页按不可信数据处理
- 高风险动作进入 `pending_approval`
- 诱饵默认只登记，不自动部署
- 诱饵程序默认只监听本机
- 不做 Cookie/Authorization 收集，不做 WebRTC/Canvas/硬件指纹

它不能替代 Docker/VM、EDR、WAF 或备份，只是蓝队侧的编排和记录工具。

## 行为标注不是自动封禁

`lib/hunter.js` 是一个 1 秒滑动窗口，只按来源 IP 统计请求数、不同路径数和工具 UA，给诱饵日志打 `automation_burst` / `path_sweep` / `automation_tool` 标签。

它不判断“这是不是 AI”，也不自动封禁。封禁仍然由 fail2ban 或人工审批后的任务执行。

同样，诱饵页面是静态主题模板，不在请求时调用大模型生成“带假漏洞的页面”。那样会引入不可控代码、延迟和提示词注入，不适合直接部署在真实资产上。

## 不基于什么

- 不是 EDR/IPS/WAF
- 不依赖云端 SaaS 或向量数据库
- 不依赖大模型训练框架
- 不把外部工具打包进插件
- 不做自动攻击或漏洞利用

## 怎么跑测试

```powershell
node scripts/test-tools.mjs
node scripts/test-ui.mjs
node scripts/test-hunter.mjs
node scripts/test-decoy-server.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

测试用临时 SQLite 和假数据，不碰真实主机。
