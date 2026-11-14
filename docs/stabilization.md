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

## 24 小时 soak（可暂停/恢复）

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

### 双击继续

直接双击：

```text
scripts/soak-24h.cmd
```

行为：

- 第一次运行从 0 开始。
- 中途关闭窗口、退出 DSH、关机都可以。
- 下次再双击，从上次完成时间继续。
- 已完成 24h 后再点只会显示“已完成”，不会重复跑。
- 查看进度双击：

```text
scripts/soak-24h-status.cmd
```

状态文件：

```text
$DSH_HOME/blue/soak-beta31.state.json
```

报告：

```text
$DSH_HOME/blue/soak-beta31.jsonl
```

控制台会显示：

```text
完成 Xh / 24h
剩余 Yh
进度 Z%
采样 N
状态 running/paused/completed
```

### 命令行

```bash
node scripts/soak.mjs --hours 24 --interval 60
node scripts/soak.mjs --status
node scripts/soak.mjs --reset
```

### 已完成进度

之前旧版脚本已累计约 3 分钟采样；新脚本会从报告尾部推断 `elapsed_sec`，不会把已有进度清零。

### 注意

- 进度按“实际跑过的采样时间”累计，不把关机时间算进去。
- 如果进程被强杀，最多丢失最后一个未落盘的采样周期。
- 24h 未跑完前，2.0 仍不能叫正式版。

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
