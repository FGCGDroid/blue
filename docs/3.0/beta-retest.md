# Beta 复验测试单

> 版本：`3.0.0-beta.1` + `2e3f05a` 之后的复验修复
> 前提：重启 DSH，新会话选「蓝队防御模式」，先发「防御自检」。
> 测试数据：`C:\Users\86186\.dsh\blue\reverify-401.jsonl`（已放好）
> 仓库副本：`test/fixtures/v3-reverify-401.jsonl`

## 0. 自动测试

```bash
npm.cmd run test:v3
node scripts/test-v3-tools.mjs
node scripts/test-v3-ui.mjs
node scripts/check-v3-layers.mjs
node scripts/validate.mjs
```

期望：

```text
132 个 JS
76/76 工具
M5 Host API 兼容
分层/校验全绿
```

## 1. 新 P0：子智能体继承

主会话先 `防御自检`，再让主智能体派两个子角色：

```text
用 subagent 启两个执行角色：
1) agent_preset=blue-worker-monitor
2) agent_preset=blue-worker
提示词只做只读：
  blue_session_info
  blue_asset_query
不要写库，回报 is_subagent/bound_engagement 和 asset_query 是否被门禁拒绝。
```

期望：

```text
两个子会话 is_subagent=true
bound_engagement=当前主会话目标
asset_query 不返回 SELF_CHECK_REQUIRED
```

## 2. 遥测读取 + 4.1/4.2 规则真实命中

在**同一目标**下：

```text
blue_telemetry_source_add
  name=reverify-401
  path=C:\Users\86186\.dsh\blue\reverify-401.jsonl

blue_detection_scan
  source=reverify-401

blue_telemetry_poll
  name=reverify-401
```

期望：

```text
source 登记成功
detection_scan: scanned=2, hits=2
  1) builtin-http-401-403
  2) builtin-auth-path（path + 别名 http.status 同时成立）
telemetry_poll: read=2, hits=2, alerts=2
第二条 200 事件不命中
```

不要再加 `reverify-custom-401` 凑第 3 条；它和 `builtin-http-401-403` 完全重叠，只增加噪声。

如果仍 `JSONL_PATH`：把 `telemetry_health` 和路径发我。

## 3. 覆盖率

```text
blue_attack_coverage
```

期望：

```text
covered >= 3
active_rules 包含 builtin-http-401-403 / builtin-auth-path
unmapped_rules 包含 reverify-custom-401
```

## 4. SQLi

```text
blue_log_scan text="id=1' OR '1'='1"
blue_log_scan text="id=1%27%20OR%20%271%27%3D%271"
```

期望：两条都命中 `pattern=sqli`。

## 5. CVE 良性样本

```text
blue_cve_scan text="POST /upload.php 200 user=alice file=avatar.png"
```

期望：

```text
matched=false
hits=[]
```

低置信测试：

```text
blue_cve_scan text="content-encoding: br"
```

期望 `matched=false`、`weakHits` 非空；加 `include_low=true` 才 matched=true。

## 6. scope 子集

新建临时目标：

```text
blue_engagement_open
  name=scope-retest
  scope=["10.1.2.0/24","10.0.0.10-10.0.0.20","2001:db8::/32"]
```

期望：

```text
blue_scope_check target=10.1.2.0/25        -> in
blue_scope_check target=10.1.2.128/25      -> in
blue_scope_check target=10.0.0.12/30       -> in
blue_scope_check target=10.0.0.11-10.0.0.12 -> in
blue_scope_check target=2001:db8::5        -> in
blue_scope_check target=10.1.3.1           -> out
```

测完：

```text
blue_engagement_open action=close
```

## 7. 其他原判

```text
alert_ingest：
  title/severity/source 顶层 + raw 内冲突 -> 取顶层

decoy_create：
  省略 deployed -> DECOY_DEPLOYED
  deployed=true -> active
  deployed=false -> planned

preflight：
  channels 6 条，missing=["gateway"]

错误参数：
  blue_alert_triage id=ALT-ZZZZZZZZ -> params.id 有值

engagement close：
  action=close -> status=closed、binding 移除
```

## 8. attempts

3.0 的 `overview`/工具没有 `attempts` 字段。若页面仍显示 `attempts=0`，那是旧 2.0 或 ctf-lab 页面字段，不是 3.0 Host API。
