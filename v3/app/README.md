# v3/app

用例层。规则：

```text
只依赖 domain 与 ports
不直接 import node:sqlite / node:http / node:fs
不写 SQL
```

骨架阶段 29 个文件，M4.0/M4.1/M4.2 已接：

```text
session/service.js     目标建立/预检
assets/service.js      资产登记/查询
alerts/ingest.js       告警入库
alerts/list.js         告警列示
alerts/triage.js       告警研判/转任务
findings/service.js    发现登记/更新/列示
iocs/service.js        IOC 登记/列示/文本检查
tasks/service.js       任务建立/更新/审批/列示
tasks/autopilot.js     计划/领取/完成
incidents/service.js   案件建立/列示/更新/挂接
decisions/service.js   决策记录
timeline/service.js    时间线追加/列示
reports/service.js     Markdown 报告
decoys/service.js      欺骗规划/登记/命中/同步/蜜罐/访问日志
```

其余仍是占位；M4.3+ 逐个接 repo 与网关。
