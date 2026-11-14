# DSH 兼容范围（1.5.x）

```text
最低：DSH 0.2.1-rc.1
验证：0.2.1-rc.5 / 0.2.2-rc.3
Node.js >= 22.13
```

`engines.dsh` 从 `>=0.2.1-rc.5` 调整为 `>=0.2.1-rc.1`，覆盖 0.2.1 的早期 rc。

## 低于 0.2.1-rc.1

不保证 `subagent(agent_preset=...)` 可用；Host 工具可能仍能加载，但自动派发不应视为受支持。

0.1.x 不在支持范围。

## Node

`node:sqlite` 的 `DatabaseSync` 要求 Node 22.13+。DSH 0.2.1-rc.2 及以后自身可能要求更高 Node 版本，以 DSH 安装器为准。
