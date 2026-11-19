# 从 Muteki 吸收什么（蓝队版）

> 来源：`liaty8/dsh-muteki-preset`（MIT）。只吸收机制，不复制进攻代码。
> 目标不是把蓝队做成 CTF 蜂群，而是把它的“事实/证据/死路/复核/预算”用到防守上。

## 一、它真正值得学的五件事

### 1. 工作区级黑板，不是聊天记录

Muteki 的所有结论写入 SQLite 事实图：

```text
fact        真实工具输出证明、可复用
observation 只是看到，不能当结论
deadend     有界实验排除的方向
task        有界 Step
review      只读 Reviewer 的质疑/缺口
claim       资源 lane 锁
```

蓝队已有：

```text
engagements / assets / alerts / findings / tasks / timeline / evidence
```

缺的是 **fact / observation / deadend / review 的明确分层**。

### 2. 证据门

Muteki 的 `fact --artifact <id>` 会校验：

```text
artifact 索引里有这个 id
payload 文件真实存在
否则 exit 2，拒写
没有 --artifact 的结论自动降级为 observation
```

蓝队现在 finding 的 `evidence` 是文本，不能证明“这条结论真的来自原始响应”。

**要吸收**：

```text
finding 必须带 artifact_id / evidence_id
没有就只能是 observation，不能升级成 fact
伪造 id 直接拒绝
```

### 3. dead-end 记账

Muteki 把“试过但无效”的方向写成 `deadend`，重开必须引用新证据。

蓝队已经有知识库，但只记录“打法”，不记录“这条防守/排查方向已经排除”。

**已做第一版**：

```text
blue_knowledge action=deadend
```

后续 `match` 命中时提醒：

```text
这条打法已被标记死路，不要原样重试；有新材料再重开。
```

### 4. 只读 Reviewer

Muteki 的 `muteki_review`：

```text
只读
不派单
不记账
不计入额度
专门挑无证据结论、验证缺口、前后矛盾
```

蓝队没有独立复核角色。当前“智能体自己说完成了”仍然可能被采信。

**要吸收**：

```text
blue_review：
  只读 findings/alerts/tasks/timeline
  输出：无证据结论 / 重复告警 / 任务未回填 / 时间线断点
  不改库、不派单、不计额度
```

### 5. 预算 + 停滞熔断

Muteki 不是“无限循环”，而是：

```text
令牌桶：burst + refill
整题累计派单/成本总闸
连续 N 轮无新事实 -> stagnation 停止
队列空 -> empty 停止
超时 -> timeout 停止
```

蓝队已有：

```text
slots / max_rounds / cooldown
```

缺：

```text
按目标的累计预算
连续无进展熔断
停止原因可解释
```

**要吸收**：

```text
autopilot cycle 返回 stopped_reason：
empty / round_limit / cooldown / no_progress / budget / interrupted
连续无新告警/新发现/新任务进展 -> no_progress，不再空转
```

## 二、不要照搬的

```text
不要自动提交 flag / 自动打平台
不要为了“多 agent”而多 agent
不要让 worker 直接执行不可信 challenge（蓝队同样要隔离）
不要把进攻方的成功当防守方结论
```

## 三、蓝队版优先级

```text
P0 证据门：finding 无 artifact -> observation
P0 deadend：已做第一版，接入提醒
P1 blue_review：只读复核
P1 停滞熔断 + 停止原因
P2 资源 lane 锁（多目标共享主机时才需要）
```

## 四、落地判断

一个机制值不值得抄，只看一句：

```text
它能不能阻止“没证据的结论被当成事实”？
```

能，就吸收；不能，就只是多一层 agent 包装。
