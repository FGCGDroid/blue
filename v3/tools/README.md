# v3/tools

工具适配层。规则：

```text
tools 只做参数整形、权限、调用 app、json 化
tools 不写 SQL
tools 不做业务判断
所有工具经 safe 包装，错误返回 { ok:false, error }
```

M4 全量状态：

```text
23 个工具组文件
73 个工具名（现有 66 + 新增 7）
73/73 个工具已注册
session 6 / asset 2 / alert 3 / finding 3 / ioc 3 / task 5 / incident 4
decision 2 / timeline 1 / report 1 / decoy 9
detection 3 / telemetry 3 / control 2 / cve 3 / risk 2
evidence 2 / audit 5 / response 3 / response-exec 2
policy 3 / gateway 1 / hunt 5
```

文件：

```text
catalog.js        名称与分组，73 个
index.js          23 个组的 register 清单
define.js         defineTool / safe / JSON 输出
guard.js          防御自检门禁
context.js        会话绑定、目标解析、scope
session.js        会话/目标 6 个
asset.js          资产 2 个
alert.js          告警 3 个
finding.js        发现 3 个
ioc.js            IOC 3 个
task.js           任务/自主 5 个
incident.js       案件 4 个
decision.js       决策 2 个
timeline.js       时间线 1 个
report.js         报告 1 个
decoy.js          欺骗 9 个
detection.js      检测规则 3 个
telemetry.js      遥测源 3 个
control.js        控制验证 2 个
cve.js            CVE 3 个
risk.js           攻击面/风险图 2 个
evidence.js       证据 2 个
audit.js          审计/锚定 5 个
response.js       响应计划/台账 3 个
response-exec.js  响应执行/验证 2 个
policy.js         策略 3 个
gateway.js        网关状态 1 个
hunt.js           狩猎/取证/加固 5 个
```

限制：

```text
telemetry 只做 JSONL 文件源；OTLP 未接
evidence 返回内存 bundle，不落盘
report 只返回 Markdown，不写文件
response 默认 manual 适配器，不自动执行破坏性命令
hunt/log_scan 与 artifact_triage 是只读正则/哈希初筛
```

73 个工具名全部注册；M5 前不接进 `cordis.patch.yml`。
