# v3/tools

工具适配层。规则：

```text
tools 只做参数整形、权限、调用 app、json 化
tools 不写 SQL
tools 不做业务判断
所有工具经 safe 包装，错误返回 { ok:false, error }
```

M4.1 状态：

```text
23 个工具组文件
73 个工具名（现有 66 + 新增 7）
26 个工具已注册
session 6 / asset 2 / alert 3 / finding 3 / ioc 3 / task 5 / incident 4
```

文件：

```text
catalog.js   名称与分组，73 个
index.js     23 个组的 register 清单
define.js    defineTool / safe / JSON 输出
guard.js     防御自检门禁
context.js   会话绑定、目标解析、scope
session.js   M4.0：会话/目标 6 个
asset.js     M4.0：资产 2 个
alert.js     M4.0：告警 3 个
finding.js   M4.1：发现 3 个
ioc.js       M4.1：IOC 3 个
task.js      M4.1：任务/自主 5 个
incident.js  M4.1：案件 4 个
```
finding.js   发现
ioc.js       IOC
task.js      任务/自主
incident.js  案件
decision.js  决策
timeline.js  时间线
report.js    报告
decoy.js     欺骗
detection.js 检测规则
telemetry.js 遥测
control.js   控制验证
cve.js       CVE
risk.js      攻击面/风险图
evidence.js  证据
audit.js     审计/锚定/外锚
response.js  响应计划
response-exec.js 响应执行
policy.js    策略
gateway.js   网关
hunt.js      狩猎/取证/加固
```

M4.0/M4.1 的 26 个工具已注册；其余组在 M4.2+ 按契约迁移，不注册假工具。
