# 对照《攻击方法全集》加固说明

> 来源：`攻击方法全集.md`（M01–M32，红队对 6 个本地靶标的实测）。
> 本文只讲“我们这一层怎么处理”，不保证站点绝对安全。
> 有测试证明的才写“拦”，没测过的写“提示/不适用”。

## 一句话结论

```text
32 种打法里：
  网关直接拦        11 种（M05 M06 M10 M11 M12 M13 M14 M15 M17 M28 M32）
  降低可利用面       6 种（M01 M04 M16 M25 M27 M31）
  规则能发现         1 种（M02）
  要站点自己改       4 种（M18 M20 M21 M22）
  网关管不了        10 种（侦察/离线/流程）
```

跑一遍看证据：

```bat
node scripts/test-v3-attack-methods.mjs
shadow-test.cmd
```

## 逐条对照

| 编号 | 打法 | 我们的处理 | 依据 |
|---|---|---|---|
| M01 | 根路径指纹 / 双层代理识别 | **降低**：不透传上游 `Server`/`X-Powered-By`/`Via`，`Date` 只发一层 | `server.js` 响应头剥离；测试「去指纹」3 项 |
| M02 | 定向路由枚举 | **发现**：`builtin-scanner` + 网关阻断告警 | 采集器规则 |
| M03 | 诱饵端点识别 | 不适用（攻击者侧判断） | — |
| M04 | 请求是否到后端判别 | **降低**：同上，层数信息被抹掉 | 同 M01 |
| M05 | JWT `alg=none` | **拦**：大小写、空白、`null`、缺 `alg`、重复 `alg` 全部拒 | `content.js` `inspectJwt`；8 个用例 |
| M06 | 重复 Cookie 解析差异 | **拦**：同名 `token/session/auth/access_token/jwt` 出现两次即拒，顺序无关 | `inspectCookies`；5 个用例 |
| M07 | 令牌通道枚举 | 不适用（探测动作本身无害） | — |
| M08 | 弱密钥离线对撞 | 不适用（离线计算） | — |
| M09 | 载荷篡改 + 旧签名 | 不适用（后端验签）；网关只挡 `none` | — |
| M10 | 路径变体绕过鉴权 | **拦**：规范化后按段边界匹配，大小写/尾斜杠/分号都处理 | `policy.js`；7 个用例 |
| M11 | JSON `\uXXXX` 转义 | **拦**：`JSON.parse` 完整解码后判断字段名，转义写 `admin`/`__proto__` 一样拦 | `content.js`；3 个用例 |
| M12 | 路径规范化绕过 | **拦**：先解码一次再判断，点段/双编码直接 400，转发的是规范化路径 | `normalize.js`；5 个用例 |
| M13 | 大小写/重复键/空白/null | **拦**：字段名归一化；同一对象内危险键重复直接拒；重复 `json` 参数拒 | `content.js` `findDuplicateKey` |
| M14 | 状态化首次放行窗口 | **拦**：网关无状态，同一请求连发三次结果一致 | 测试连发 3 次 |
| M15 | 填充/深嵌套/multipart/chunked | **拦**：体积上限、嵌套深度上限、multipart 里的 `json` 字段同样检查、chunked 同样检查 | 6 个用例 |
| M16 | 规则名泄露 | **降低**：403 只回 `request blocked`，不带规则 id | 测试断言 body 精确等于 `request blocked` |
| M17 | 原型链污染 | **拦**：`__proto__`/`constructor`/`prototype` 字面量与 `\u005f` 转义形式都拦 | 5 个用例 |
| M18 | Mass assignment | **要站点改**：网关只挡特权键，任意键写入要后端加字段白名单 | 文档提示 |
| M19 | 配置持久化判定 | 不适用 | — |
| M20 | SSTI 探测 | **要站点改**：模板引擎禁用危险表达式 | 文档提示 |
| M21 | 未授权配置接口泄露 | **要站点改**：`config.json` 等只做提示，不默认拦（拦错会打坏业务） | `ADVISORY_PATHS` |
| M22 | `/api/<任意>` 前缀漏判 | **要站点改**：后端要精确路由 + 鉴权 | 文档提示 |
| M23 | 诱饵端点无功能验证 | 不适用 | — |
| M24 | 先查库再手搓 | 不适用 | — |
| M25 | 对照组反向验证 | **降低**：我们自检也做对照（直连 vs 网关、明文 vs 变体） | `shadow-test.mjs` |
| M26 | OPSEC 限速 | 不适用（防御侧看不到自律） | — |
| M27 | 自适应伪造 flag | **降低**：没有 artifact 证据的“发现”不算事实，诱饵不进报告 | 证据闸 |
| M28 | 检查归一化 / 转发原始 | **拦**：检查和转发用同一个规范化结果 | `normalize.js` + `server.js` |
| M29 | 蜜罐页面识别 | 不适用 | — |
| M30 | 诱饵反向情报 | 不适用 | — |
| M31 | `Date` 计数法前提 | **降低**：自检先 `GET /` 校准层数，再判断响应是谁生成的 | `shadow-test.mjs` |
| M32 | 目录 403 后打子文件名 | **拦**：目录规则按段边界覆盖子资源，`/backup` 与 `/backup/flag.txt` 一起拦 | `policy.js` `boundaryMatch`；5 个用例 |

## 这次具体改了什么

### 1. 默认拦截清单补齐（M02/M12/M32）

以前默认只拦 `.git`、`.env` 这些；现在补上：

```text
.git .svn .hg .bzr .ssh .aws
.env .env.* .DS_Store .htaccess .htpasswd .npmrc
wp-config.php* phpinfo.php* server-status
actuator/env actuator/heapdump debug/pprof
backup/ backups/ （目录 + 子资源）
backup.sql dump.sql db.sql database.sql db.sqlite
www.zip site.zip web.zip backup.tar.gz
```

关键点：**目录规则按段边界匹配**，`/backup` 被拦时 `/backup/flag.txt` 也拦（M32 的洞）。
文件规则额外覆盖 `.bak`/`.old`/`~` 后缀，`/wp-config.php.bak` 不会漏。

万一你真有个页面叫 `/backup`，在策略里加逃生口（会记决策日志）：

```json
{ "builtin_allow": ["/backup"] }
```

### 2. 内容检查补齐（M05/M06/M11/M13/M15/M17）

- JWT：`alg` 先 trim + 小写再比对；`null`、缺 `alg`、同对象重复 `alg` 都拒。
- Cookie：同名 token 类 cookie 重复即拒，名字大小写不敏感，顺序无关。
- JSON：先检测**同一对象内**危险键重复（数组里每个对象单独算，不会误伤正常列表）。
- multipart：解析边界，只检查 `json`/`payload`/`data` 文本字段；带 `filename` 的文件部分跳过（避免拦坏上传源码）。
- 嵌套超过 8 层直接拒（正常业务用不到）。
- 无 `content-type` 但 body 以 `{`/`[` 开头，也按 JSON 检查。

### 3. 响应去指纹（M01/M04/M16）

- 不再透传上游 `Server`、`X-Powered-By`、`Via`、`X-AspNet-Version` 等。
- 上游 `Date` 丢掉，由我们发一层——响应里只有**一个** `Date`，不自己暴露“两层代理”。
- 403 文案统一 `request blocked`，不带规则名。

### 4. 覆盖表进产品（不用记编号）

- `blue_gateway_status` 返回 `techniques`：拦住几种、哪几种要用户自己改。
- `blue_protect action=status` 返回 `attack_coverage`，保护页建档后直接显示。
- 提示项 `ADVISORY_PATHS` 只提示不拦：`/config.json`、`/settings.json`、`/debug`、`/internal` 等。

## 进打法库（M01–M32 全部入库）

新建防守目标时，32 条打法会自动写进「打法库」页，不用再翻文档：

```text
【内置】M05 JWT alg=none 不验签
tech:M05 · M05 网关直接拦：alg 统一小写后比对 none/null/缺失 · 0 次
```

规则：

- 重复建档/重复点导入不会重复入库，也不累加命中数；
- **hits 只统计真实告警**，内置基线永远是 0 次，不会把“知道这种打法”当成“被打过”；
- 老目标在打法库页点「导入内置打法」，或让智能体执行 `blue_knowledge action=seed`；
- 点「生成防御建议」：`网关管不了` 的那 10 种不给任务，只回一句说明，避免造垃圾任务。

## 没做到的部分（避免误判）

- 网关只看 HTTP 请求内容，不看后端业务逻辑：M18/M20/M21/M22 得站点自己改。
- `?isAdmin=1` 这类 **query 参数提权** 没拦（可能误伤正常筛选），需要后端自己收紧。
- 不含 WAF 语义（SQLi/XSS 的完整规则库）；只做路径、头、JWT、JSON 合并这几类高置信判断。
- 远程服务器要先接上网关才有以上效果；没接网关时只有采集器告警，不阻断。

## 怎么自己复核

```bash
node scripts/test-v3-attack-methods.mjs   # 55 项，按文档 payload 打
node scripts/shadow-test.mjs              # 12 项，直连 vs 网关对照
node scripts/compare-2.0-3.0.mjs          # 2.0/3.0 同 payload 对照表
```
