# 运行红线

这三条已经踩过，不再重复踩。

## 1. 诱饵部署后必须写回 active

```text
blue_decoy_create 默认 planned
planned 只代表“已登记”，不代表“没部署”
平台“运行中”只统计 active
```

规则：

- 人工确认部署后立刻 `blue_decoy_update status=active`。
- 有命中时系统会自动把 `planned` 升级为 `active`，并写 `decoy_auto_active`。
- 控制台诱饵表提供「标记运行」按钮。
- 不要用 `planned` 当“正在运行”的证据，也不要用“0 个运行”直接判断诱饵没部署。

## 2. `flag{decoy...}` 不是泄露

诱饵返回的 flag 是合成值，例如：

```text
flag{decoy_this_is_not_the_real_flag_...}
```

规则：

- 看到 `decoy`、`fake`、`synthetic` 标记，先按诱饵处理。
- G10 曾把假 flag 的显示误判为真泄露；该误报已修。
- 判定真泄露必须同时满足：真实 flag 来源、非诱饵路径、独立于诱饵响应的证据。
- 不能仅凭“页面出现 flag{...}”就报泄露。

## 3. 禁止对 DSH 同进程目标做 2MB 压测

之前把 2MB 压测打到与 DSH 同进程的目标，直接把 DSH 打崩。

规则：

- 压测/大 body 测试必须使用独立进程、独立端口、可丢弃副本。
- 3.0 网关必须独立进程、独立端口（默认 `127.0.0.1:8787`）；禁止嵌入 DSH 进程，禁止与 DSH 共用端口。
- 诱饵服务请求体上限 64 KiB；内联网关默认上限 1 MiB。
- 不对 `127.0.0.1` 上与 DSH 同进程的目标做压力测试。
- 先确认可重启、可回滚，再决定是否做 live 测试。
- 可用性优先于“多测一个 payload”。

## 4. 只检测不阻断，不算防守

jwt-none 那次不是“没发现”，是：

```text
R1/R2/R3 全部命中
告警已经产生
代理仍把请求原样送到上游
flag 被提交
```

规则：

- 高置信、零误报的规则（如 `alg=none`）必须有阻断路径；没有阻断就写“未防守”，不要写“已检测”。
- 部署说明里不允许用“只记录、不阻断”当免责声明；它是缺陷，不是边界。
- 如果为了可用性暂时只告警，必须记录为**已知暴露**，并给出阻断前置条件与期限。
- 报告里区分：`detected`、`blocked`、`not_defended`。

## 5. 证据必须独立

已踩过的误判：

- `attempts=0` 不是“没人尝试”，它对所有题都可能恒为 0；用 `solvedAt` + 成就双源。
- 自己加工过的日志不能当原始证据：`redact().replace()` 曾把双引号变成单引号，误导判断。
- 正则匹配原文里的 `INJECTED` 不代表实体被解析；测试用例自己写错也会“命中”。
- 403/200 必须用原始响应 + 多次复测核对，不能只看 PowerShell 格式化输出。
- CVE 扫描命中只是候选；必须核对资产、产品、版本，1/1 误报也要撤回。

规则：

```text
原始响应
独立第二来源
可复现命令
时间线记录
```

缺一项，就只能写“待验证”，不能写“已确认”。

## 6. 修改文件的工具边界

- 含中文的源码不要用 PowerShell `Set-Content -Encoding utf8` 改；PS 5.1 会破坏编码。
- 整文件重写用 `write`，定点修改用 `edit`，改完必须跑语法检查。
- 不要用模糊 `old_string` 做函数级替换；先读上下文，再改。

## 7. 开场先盘点资产

- 创建 engagement 后，scope 中的具体 host/URL 会自动登记为资产；CIDR/通配符不会冒充在线资产。
- 跑 `blue_risk_graph` 前确认 assets > 0；图谱空白先查资产盘点，不要先怀疑代码。
- 资产是“库存”，不是“在线证明”，也不是“有漏洞证明”。

## 8. 审批状态不能绕

已经修过的坑：

```text
pending_approval 被直接改成 dispatched
high 任务未审批 but 手工写成 queued
前端按钮直接改状态
```

规则：

- `pending_approval` 只能由 `blue_task_approve` / 控制台审批改成 `queued`。
- 没有 `approved_at` 的 high 任务，`updateTask` 拒绝 `dispatched`，`autopilot` 也不领取。
- 改角色导致风险升级时，任务退回 `pending_approval`，审批字段清空。
- 不要在 `client.js` 里改状态；只调用 Host API。
- 状态迁移表只允许在 `lib/judge.js` 维护。

详见 `docs/state-machines.md`。

## 记录方式

```text
发现：FND-...
证据：原始请求/响应、进程/端口、时间线
结论：真泄露 / 诱饵假阳性 / 未验证
```

不要把假阳性写成“已确认泄露”，也不要把未测试写成“安全”。
