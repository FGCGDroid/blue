# Beta 复验修复记录（2026-11-19）

针对第二轮复验：7 条原判不成立、1 条成立、1 条无法端到端验证，另有 1 条新 P0 + 3 条新 P1。
本文件只记录已改代码并有回归的项。

## 新 P0：子智能体空转

根因：`parentSessionId` 在 DSH 子会话里可能为空，真实父链在 `session.header.parentSession`；3.0 只读前者，导致：

```text
is_subagent=false
父会话绑定没有继承
SELF_CHECK_REQUIRED 挡住全部 worker 工具
```

修复：

```text
parentIdOf 同时读 session.parentSessionId 和 session.header.parentSession
sessionKeysOf 用父 id 作为 root
hasSelfCheck 允许 root 会话的自检状态被子会话继承
绑定 Map 用 root key，子会话自动命中
```

测试：模拟 `header.parentSession` 子会话，`blue_session_info` 显示 is_subagent=true、bound_engagement 有值；`blue_asset_query` 不再 SELF_CHECK_REQUIRED。

## 新 P1：遥测登记/读取根不一致

根因：`telemetry_source_add` 允许 `DSH/blue`、`DSH/ctf-lab`、cwd、`BLUE_TELEMETRY_ROOT`；
`readJsonl` 只允许 `store.root`（通常 `DSH/blue`）。登记成功但 poll/scan/ingest 永远读不到。

修复：`readJsonl` 与 telemetry allowed roots 对齐：

```text
store.root
DSH_HOME/blue
DSH_HOME/ctf-lab
cwd
BLUE_TELEMETRY_ROOT
```

测试：在临时 `DSH_HOME/ctf-lab/access.jsonl` 登记并 poll，读取/命中成功。

## 新 P1：覆盖率与规则库脱节

修复：

```text
blue_attack_coverage 使用 rulesFor（内置 + 自定义）
内置 401/路径/Windows 规则映射到 T1110/T1078/T1190
自定义规则计入 active_rules；未映射的进 unmapped_rules
```

测试：covered >= 3，自定义 `admin-login-fail` 出现在 unmapped_rules。

## 新 P1：SQLi 明文/URL 编码漏检

修复：

```text
sqli 规则补充 ' OR '1'='1、OR 1=1、union select、sleep、benchmark、information_schema
对含 %xx 的行先 decodeURIComponent 再跑一次
```

测试：明文和 `%27%20OR%20...` 都命中 `sqli`。

## P2：CVE 良性 upload.php 误报

修复：`php-exec-upload` 只匹配上传目录里的 PHP 文件：

```text
/uploads/... .php
/tmp/... .php
\Temp\... .php
```

不再因为 `/upload.php` 这个端点名就报 PHP RCE。

测试：`POST /upload.php 200 user=alice file=avatar.png` -> matched=false。

## 原判 4.4 CVE 误报

低置信特征继续单独放 `weakHits`，默认不计入 `matched`。

## 范围语义缺口

修复：`scope_check` 支持目标本身是 CIDR/范围时做“子集包含”判断：

```text
10.1.2.0/25 在 10.1.2.0/24 内 -> in
10.0.0.12/30 在 10.0.0.10-10.0.0.20 内 -> in
10.0.0.11-10.0.0.12 在范围内 -> in
```

## 仍未解

- 遥测链路的真实规则命中需要重启后在新会话复跑；测试已用临时 ctf-lab JSONL 覆盖读取路径。
- `attempts` 不是 3.0 字段；没有伪造。
- `ENG-50CCFFED` 先不 close，保留给复验。
