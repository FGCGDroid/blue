# DSH 兼容范围

## 结论

```text
推荐：DSH >= 0.2.1-rc.1
最低：DSH 0.2.1-rc.1
验证：0.2.2-rc.3
```

`package.json` 的 `engines.dsh` 是：

```text
>=0.2.1-rc.1
```

## 版本行为

### 0.2.1-rc.1 及以上

完整功能：

- 60 个工具
- 右侧控制台
- `subagent(agent_preset=...)` 自动派发
- 案件、决策、遥测、检测、审计链、受控响应

### 0.2.0 及以下

Host 工具和界面可能仍能加载，但：

```text
subagent 不支持 agent_preset
```

因此：

- `blue_autopilot action=status/plan` 可用
- `blue_autopilot action=next/cycle` 会返回：

```json
{
  "ok": false,
  "reason": "dsh_agent_preset_unsupported",
  "note": "当前 DSH 低于 0.2.1-rc.1..."
}
```

- 控制台「领取」也会拒绝
- 不会静默用错角色执行

### 0.1.x

不在支持范围。

## Node

```text
Node.js >= 22.13
```

原因：`node:sqlite` 的 `DatabaseSync` 需要 Node 22.13+。

DSH 0.2.1-rc.2 及以后自身可能要求 Node 24.9+；以 DSH 安装器要求为准。

## 检查方式

会话里调用：

```text
blue_session_info
```

返回：

```json
{
  "dsh": {
    "version": "0.2.2-rc.3",
    "agent_preset": true,
    "legacy_subagent": false,
    "known": true
  }
}
```

`agent_preset: false` 时不要用 `cycle` 自动派发。
