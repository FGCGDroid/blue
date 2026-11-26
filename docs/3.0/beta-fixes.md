# Beta 反馈修复记录（2026-11-18）

对应试用反馈的 10 项。全部有回归测试；未把“不存在的问题”假装修掉。

## P0

### 1.1 alert_ingest 顶层字段失效

修复：顶层 `title/severity/source/confidence/task_id/external_id/note/event_time` 优先于 raw JSON 内字段；raw 只提供缺失值。

测试：raw 内标题/级别/来源与顶层冲突时，入库取顶层。

### 2.1 decoy_create 默认 planned

修复：`blue_decoy_create` 新增必填 `deployed`：

```text
deployed=true  -> status=active
deployed=false -> status=planned
缺省          -> DECOY_DEPLOYED，不再静默猜
```

测试：缺省被拒；显式 true 落 active；false 落 planned。

### 3.1 preflight 不列可用通道

修复：`blue_preflight` 返回 `channels[]`：

```text
tools / host_api / gateway / telemetry / evidence_anchor / subagent
```

并返回 `missing[]`。网关未启动、OTLP 未接会明确标为不可用/限制。

## P1

### 1.4 scope_check 只认 CIDR

修复：保留 CIDR，新增：

```text
IPv4/IPv6 CIDR
IPv4 范围 10.0.0.10-10.0.0.20
裸 IPv6
域名 / *.domain / .domain
```

工具层不再直接 import `node:net`；纯 JS 实现，分层检查通过。

### 4.1/4.2 内置规则不认自定义字段 / HTTP 401

修复：

```text
内置 3 条规则：HTTP 401/403、登录/管理路径失败、Windows 4625
支持 status / status_code / http.status / http.status_code /
     http.response.status_code / response.status / code
自定义规则继续支持点路径与 * 通配
log_scan 对 JSON 行的 401/403 也会命中 http-auth-fail
```

### 2.3 engagement 无关闭机制

修复：`blue_engagement_open` 支持 `action=close`：

```text
关闭 status=active -> closed
写 timeline engagement_close
解除当前会话绑定
历史数据保留
```

不新增第 74 个工具，避免破坏 73 工具契约。

## P2

### 4.4 CVE 启发式误报

修复：低置信特征不再计入 `matched`，单独放 `weakHits`；只有 `include_low=true` 才计入。避免 `content-encoding: br` 单独判成 CVE。

### 5.2 attempts 恒 0

3.0 Host API/工具返回里没有 `attempts` 字段（已用 overview 实测确认）。该字段来自旧 2.0/外部靶场页面，不在 3.0 契约中。没有为了“修好”而伪造一个恒 0 字段。

### 6.1 错误信息不带参数

修复：`safe` 统一附带脱敏后的 `params`：

```text
敏感键 -> [redacted]
字符串截断 120 字符
数组只显示长度
最多 20 个键
```

## 测试

```text
✓ 73/73 工具注册
✓ 顶层字段优先级
✓ decoy deployed 必填
✓ preflight channels
✓ IPv6 / IPv4 range / 404 越界
✓ 内置 401 规则与 log_scan
✓ engagement close
✓ CVE weakHits
✓ 错误 params
✓ v3 全套
```
