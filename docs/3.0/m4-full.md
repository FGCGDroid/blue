# M4 全量工具迁移记录（2026-11-18）

> 结论：3.0 的 73 个工具名已全部注册并通过契约测试；这不是“3.0 已发布”。
> 分支：`3.0-dev`；代码：`v3/`；2.0 仍在 `lib/`。

## 数量

```text
session 6
asset 2
alert 3
finding 3
ioc 3
task 5
incident 4
decision 2
timeline 1
report 1
decoy 9
detection 3
telemetry 3
control 2
cve 3
risk 2
evidence 2
audit 5
response 3
response-exec 2
policy 3
gateway 1
hunt 5
```

合计 73。

## 新增基础设施

```text
infra/sqlite/repos/decisions.js    决策
infra/sqlite/repos/detection.js    检测规则
infra/sqlite/repos/controls.js     控制验证
infra/fs/jsonl.js                  JSONL 读取（数据根内）
infra/fs/artifact.js               文本/样本只读
domain/cve/pack.js                 2026 CVE 防御包
```

## 真实行为

```text
检测：规则 upsert/list；JSON selection + all/any；点路径 + * 通配
遥测：JSONL 源登记、cursor 轮询、命中落告警、health
控制：审计链/审批/遥测/诱饵/锚点检查，写 controls 分数
CVE：防御包查询、启发式文本扫描、按资产名/服务/tag 生成 hardening 核查任务
风险：ATT&CK 覆盖映射、资产-发现-告警图谱
证据：内存 bundle + digest + 锚点验证
审计：时间线哈希链、Ed25519 锚点、锚点验证、sink 推送、态势
响应：high 风险待审批任务、dry-run、审批后人工回填、回滚、验证
策略：文件校验、请求路径决策、两版策略 diff
网关：只读配置与策略 hash
狩猎：日志正则、样本哈希/字符串/URL/IP、加固清单、遏制方案、剧本
```

## 明确限制

```text
v3/ui/* 仍是占位，M5 才做控制台
报告的 write/证据落盘未接；evidence 返回内存 bundle
OTLP 未接；遥测只支持 JSONL
response 默认 manual 适配器，不自动执行隔离/封禁
hunt 是只读正则/哈希初筛，不是完整取证平台
检测规则只在本地匹配，不是 SIEM
CVE 包未联网核验版本/补丁
```

## 测试

```text
✓ v3 骨架 132 个 JS，8 个层
✓ 73/73 工具注册与契约
✓ 数据层/迁移/回滚/路径/网关/响应/外锚
✓ 2.0 66 个工具冒烟
✓ validate
```

## 未做

```text
3.0 接入 cordis.patch.yml
2.0/3.0 影子双跑
3.0.0 soak / 发布
3.1 新前端（12 页签）
```

## M5 Host API（2026-11-18）

```text
/blue/api、/blue/v3/api 两条路由
2.0 控制台 op 兼容：overview/openEngagement/bindEngagement/
report/plan/claim/updateTask/approveTask/createTask/triageAlert/
updateFinding/addIoc/addAsset/addFinding/queryAssets/
controlScan/telemetryPoll/updateDecoy/syncDecoys/
updateIncident/cveCampaign/exportEvidence/setSlots
同源校验、4 MiB body 限制
```

边界：3.0 尚未接进 `cordis.patch.yml`，避免和 2.0 `/blue/api` 抢路由；3.1 新前端未写。
