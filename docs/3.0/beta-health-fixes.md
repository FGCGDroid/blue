# Beta 健康体检修复（2026-11-19）

对应体检反馈：control 分数语义、证据落盘、批量研判、规则别名、覆盖 tags、报告落盘。

## 规则别名

`builtin-auth-path` 原来要求顶层 `status`，但真实访问日志常写 `http.status`。现在 selection 的字段名支持 `|` 别名：

```json
{
  "path": ["*admin*"],
  "status|http.status|http.status_code|response.status": [401, 403]
}
```

`all` 条件仍要求 `path` 和“任一状态字段”同时成立。

验证夹具：

```text
{"http":{"status":401},"path":"/admin/login"}
-> builtin-http-401-403 + builtin-auth-path = 2 hits
```

不再需要伪造第 3 条重叠规则。

## 覆盖 tags

`attackCoverage` 现在同时认：

```text
rule_key / RULE_ALIASES
ATT&CK tags: T1059 或 attack:T1059
```

自定义规则带 `tags:["T1059"]` 就计入 covered，不再进 unmapped。

## 批量研判

`blue_alert_triage` 新增 `ids`：

```text
blue_alert_triage ids=[ALT-1, ALT-2, ...] status=false_positive note=...
```

最多 200 条；逐条返回成功/失败，不因一条坏 id 中断。

## 证据与报告落盘

```text
blue_evidence_export write=true path=case.json
blue_evidence_verify path=<file> digest=<digest>
blue_report write=true path=report.md
```

限制在数据根 `evidence/`、`reports/` 下，路径越界拒绝。

## control 分数

```text
approval.pending=0 -> pass
telemetry=0 源 -> unknown
decoys=0 -> unknown
percent 只按 pass+fail
coverage 表示实际测到的比例
```

## 残留进程

`PID 26760` 已不存在，8787/8080 均关闭；`ENG-B3349DA3` 只是历史 timeline，不是仍在运行的网关。
