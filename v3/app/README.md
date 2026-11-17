# v3/app

用例层。规则：

```text
只依赖 domain 与 ports
不直接 import node:sqlite / node:http / node:fs
不写 SQL
```

骨架阶段 17 个文件：

```text
tasks/create.js      建任务
tasks/update.js      更新任务
tasks/approve.js     审批
tasks/dispatch.js    派发
tasks/autopilot.js   自主循环
alerts/ingest.js     告警入库
alerts/triage.js     告警研判
incidents/open.js    开案件
evidence/export.js   证据导出
evidence/verify.js   证据验签
gateway/evaluate.js  请求判定
policy/validate.js   策略校验
policy/test.js       策略向量
policy/diff.js       策略差异
policy/reload.js     策略热加载
response/execute.js  响应执行
response/verify.js   执行后验证
```

现在全部是占位；M3/M3.5/M4 逐个接 repo 与网关。
