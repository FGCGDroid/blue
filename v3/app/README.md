# v3/app

用例层。规则：

```text
只依赖 domain 与 ports
不直接 import node:sqlite / node:http / node:fs
不写 SQL
```

骨架阶段 21 个文件，M4.0 已接：

```text
session/service.js   目标建立/预检
assets/service.js    资产登记/查询
alerts/ingest.js     告警入库
alerts/list.js       告警列示
alerts/triage.js     告警研判
```

其余仍是占位；M4.1+ 逐个接 repo 与网关。
