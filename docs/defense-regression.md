# 本地 ctf-lab 防守回归

这个脚本只验证**内联中间件是否真的挡住了指定攻击**，不是攻击器。

## 前置

1. 启动 ctf-lab 的 `jwt-none` 题目
2. 设置严格模式并重启 DSH：

   ```powershell
   $env:CTF_LAB_GUARD = "strict"
   ```

3. 确认服务端口，例如 `63488`

## 运行

```powershell
node scripts/test-ctf-defense.mjs --base http://127.0.0.1:63488
```

或：

```powershell
npm run test:ctf-defense -- --base http://127.0.0.1:63488
```

JSON 输出：

```powershell
node scripts/test-ctf-defense.mjs --base http://127.0.0.1:63488 --json
```

## 覆盖

| 编号 | 验证 |
| --- | --- |
| CONTROL | 正常 `GET /` 不被误杀 |
| M05 | `alg=none` 被 403 |
| M06 | 重复 `token` Cookie 被 403 |
| M12 | `/./config` 路径规范化被 403 |
| M12b | `/%2e/config` 编码路径被 403 |
| M16 | 403 不回显 `jwt-none` / `duplicate-cookie` / `path-normalization` 等规则名 |

## 安全边界

- 只允许 `127.0.0.1`、`::1`、`localhost`
- 只发 `GET`
- 不写配置、不删除数据、不跑字典
- 单请求 5 秒超时

## 不覆盖

- M11 JSON 转义绕过
- M13/M14 状态化规则测绘
- M17 原型链污染
- M18 mass assignment
- M21 未授权配置泄露
- M22 `/api/<任意>` 前缀漏判

这些是应用层问题，需要改应用，不是中间件回归脚本能证明的。

## 失败时

如果输出：

```text
FAIL M05 ... status=401
```

先检查：

```powershell
$env:CTF_LAB_GUARD
```

是否真的是 `strict`，以及 DSH 是否重启。
