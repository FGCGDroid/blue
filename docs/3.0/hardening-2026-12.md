# 2026-12 加固记录

> 范围：M0–M3.5 已完成代码，不加新功能  
> 原则：先修“会骗自己”的问题，再谈新能力

## 修了什么

| # | 问题 | 修复 | 回归 |
| --- | --- | --- | --- |
| 1 | 3.0 库每次重开都做一次迁移备份，备份目录膨胀 | 建表前先读 `schema_version`，只有非 3.0 库才备份 | `lastBackup=null` on reopen |
| 2 | low 任务可建 `pending_approval` 但 `requires_approval=0` | pending 状态强制 `requires_approval=1` | low pending 用例 |
| 3 | 两个审批并发时，第二个可能写空 timeline | `UPDATE ... WHERE status=pending` + `changes=1` 校验 | 二次 approve 抛 `TASK_NOT_PENDING` |
| 4 | patch 可伪造 `dispatched_at` / `completed_at` | 从可 patch 字段移除派生时间 | patch 伪造被忽略 |
| 5 | upstream 可带用户名/密码/path/query，易误配 | 只接受 origin；拒绝凭据、path、query、fragment | 配置负例 |
| 6 | 策略 `protected`/`deny` 非数组被静默当空；allow 未规范化 | 非数组报错；allow 走同一前缀校验 | 策略负例 |
| 7 | query 控制字符、absolute-form 凭据可进上游 | 拒绝 query 控制字符/`%0d%0a%00`；拒绝 absolute-form 凭据 | normalize 负例 |
| 8 | 遥测源路径可用符号链接逃出允许目录 | `realpathSync` 后再做目录包含检查 | outside 文件被拒 |
| 9 | 锚点验证只信 DB 里的 public_key，换 key 也能自签通过 | 验证绑定本机 key；缺失 key 报 `no_key`；key 文件必须是普通文件、权限 0600、`wx` 创建 | bad_key / no_key |
| 10 | 请求中途 abort 时 `readBody` 可能挂到超时 | 监听 `aborted` 立即 reject | 代码审查 |
| 11 | 上游 5xx 被计入 `blocked_total`，指标会骗人 | 只有 `decision=block` 才加 blocked | 网关 metrics 回归 |
| 12 | HTTPS 外锚回执无上限，恶意 sink 可打内存 | 回执最多读 4 KiB | 代码审查 |

## 24h soak 结果（2026-11-18）

```text
时间：2026-11-17 22:55 ~ 2026-11-18 22:55
时长：86400 秒
并发：8
速率：40 rps
safe：1,995,561
attack：997,781
blocked：997,781
allowed：1,995,561
errors：[]
upstream.admin：0
upstream.canary：0
heap_delta_mb：21.93
```

结论：

```text
24h 本地 soak 通过
高危 canary 未被上游命中
内存 24h 仅增长约 21.93 MB
```

### 覆盖缺口

这次 24h 使用的旧 soak 路径轮转有 bug：

```text
safePaths[index % 3]
```

导致 `/public/x?y=1` 从未被选中，`publicX=0`。
24h 数据对 `publicX` 的覆盖为零，不能声称“所有 safe path 都覆盖”。

已修：

```text
attackIndex / safeIndex 独立轮转
```

30 秒复测：

```text
safe=648
attack=324
blocked=324
public=216
publicX=216
login=216
errors=[]
```

没有重跑 24h；下一次 24h 应使用修复后的脚本。

## 新增测试

```text
scripts/test-v3-hardening.mjs
lab/scenarios/acceptance.mjs
```

本地靶场：

```text
lab/start.mjs                 一键起上游 + 网关
lab/upstream/server.js        受保护后台、JWT none、echo、canary
lab/gateway/start.js          3.0 网关
lab/scenarios/acceptance.mjs  路径/内容/canary 验收
```

覆盖：

```text
3.0 库重开不再备份
low pending 必须带审批
审批只能成功一次
派生时间字段不可伪造
upstream 凭据/path 拒绝
策略数组/allow 负例
query 控制字符 / absolute-form 凭据
遥测源目录逃逸
锚点 key 绑定 / no_key
```

## DSH 0.2.2 兼容：/list-agents 清理

红队插件 v0.16.0 的对比调查发现：DSH 0.2.2 移除了独立的
`@deepseek-ai/dsh-tool-subagent-control/list-agents` 导出，
`tool-subagent-control` 现在一起注册 `send_message / interrupt_agent / list_agents`。

蓝队此前也保留了旧行：

```text
presets/blue/agent.cordis.yml
cordis.patch.yml
```

已删除，并新增：

```text
scripts/check-dsh-retired-rows.mjs
npm.cmd run check:dsh
```

检查内容：

```text
扫描 cordis.patch.yml + presets/**/*.yml
发现 tool-subagent-list-agents 或 /list-agents 就失败
```

这属于 DSH 兼容 P0，不是 3.0 新功能。

## 没修 / 没验证

```text
没有内置命令型响应适配器（按红线，默认 manual/mock）
HTTPS 外锚没有做真实公网/自签证书联调
审计 key 没有轮换机制
DB 被整体替换时，只有外部锚能发现
24h soak 已跑通；但旧脚本未覆盖 `/public/x?y=1`，修复后没有重跑 24h
```

## 下一步

```text
2026-11-18：M4.0 完成（11/73）
2026-11-18：M4.2 完成（39/73）
2026-11-19：M4.3 detection/telemetry/control/cve/risk
2026-12：M4.3 ~ M4.5
2027-01：影子双跑 / 3.0.0-rc
```
