# v3/ui

Host API 与 2.0 控制台兼容层（M5）。

```text
/blue/api       2.0 控制台兼容入口
/blue/v3/api    3.x 入口（同一 handler）
```

实现：

```text
host-api.js     路由、同源校验、body 限制、op 分发
legacy-view.js  3.0 领域对象 -> 2.0 控制台字段
```

兼容 op：

```text
overview, clientGraph, openEngagement, bindEngagement,
report, plan, claim, updateTask, approveTask, createTask,
triageAlert, updateFinding, addIoc, addAsset, addFinding,
queryAssets, controlScan, telemetryPoll, updateDecoy,
syncDecoys, updateIncident, cveCampaign, exportEvidence, setSlots
```

边界：

```text
不注册 /blue/otlp/v1/logs；OTLP 仍由 2.0 侧接收
2.0 控制台的 12 个页签直接复用；3.1 新前端未写
3.0 尚未接进 cordis.patch.yml，避免和 2.0 /blue/api 抢路由
```
