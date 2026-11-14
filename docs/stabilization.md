# 稳定化演练

## 真实遥测源

已接入：

```text
source: ctf-lab-access
path:   $DSH_HOME/ctf-lab/access.jsonl
kind:   jsonl
status: active
```

首次轮询：

```text
read: 38
inserted: 5
skipped: 33
last_error: ""
```

说明：

- 这是真实 ctf-lab 访问日志，不是合成 JSONL。
- 轮询从文件尾部附近开始，避免把历史全量灌进告警库。
- 遥测只生成告警，不执行日志里的内容。
- 通用 200 事件是 low；401/403/5xx/guard 命中才升级。

## 24 小时 soak

脚本：

```text
scripts/soak.mjs
```

只做：

```text
增量轮询遥测
每个 engagement 校验时间线哈希链
SQLite integrity_check
记录 RSS
```

不做：

```text
不发攻击请求
不压测目标
不重启服务
```

命令：

```bash
node scripts/soak.mjs --hours 24 --interval 60 \
  --out "$DSH_HOME/blue/soak-beta31.jsonl"
```

短跑验收：

```text
2 个采样点
integrity: ok
timeline_ok: true
sources: ctf-lab-access read=0 inserted=0
```

24 小时任务已后台启动；结果文件：

```text
$DSH_HOME/blue/soak-beta31.jsonl
```

## 迁移 / 回滚演练

脚本：

```text
scripts/test-rollback.mjs
```

路径：

```text
1.5.3 创建数据
→ 备份
→ beta.31 打开并迁移
→ 校验新链
→ 恢复备份
→ 1.5.3 重新打开
→ 校验旧数据
```

本次结果：

```text
migrated: assets=1, timeline ok, checked=5
restored: assets=1, timeline checked=3, engagement=rollback-drill
ok: true
```

## 仍然不是正式版

```text
24h soak 尚未跑完
真实告警源只有 ctf-lab 一个
没有 Wazuh/Elastic/OTel 实接
没有 RBAC/加密存储
```

这些跑完之前，2.0 仍是 beta。
