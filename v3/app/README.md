# v3/app

用例层。规则：

```text
只依赖 domain 与 ports
不直接 import node:sqlite / node:http / node:fs
不写 SQL
```

M4 已接 33 个文件：

```text
session/service.js      目标建立/预检
assets/service.js       资产登记/查询
alerts/ingest.js        告警入库
alerts/list.js          告警列示
alerts/triage.js        告警研判/转任务
findings/service.js     发现登记/更新/列示
iocs/service.js         IOC 登记/列示/文本检查
tasks/service.js        任务建立/更新/审批/列示
tasks/autopilot.js      计划/领取/完成
incidents/service.js    案件建立/列示/更新/挂接
decisions/service.js    决策记录
timeline/service.js     时间线追加/列示
reports/service.js      Markdown 报告
decoys/service.js       欺骗规划/登记/命中/同步/蜜罐/访问日志
detection/service.js    规则登记/匹配
controls/service.js     控制验证
cve/service.js          CVE 防御包/扫描/核查任务
risk/service.js         ATT&CK 覆盖/攻击面图谱
evidence/export.js      证据 bundle
evidence/verify.js      证据 digest/锚点验证
evidence/anchor.js      锚定 + 外推
response/execute.js     受控执行/回滚
response/verify.js      响应验证
```

未接：

```text
gateway/evaluate.js     业务判定仍走 domain + infra
policy/*                策略工具直接注入 infra loader
v3/ui/*                 M5
```

占位函数仍抛 `NOT_IMPLEMENTED`，不会静默返回假结果。
