# 本地靶场（零依赖）

> 只用于自己的机器/隔离环境，全部合成数据。  
> 不装 Docker，不需要公网服务器。

## 双击 CMD

不用记命令，直接双击：

```text
lab\start.cmd       启动靶场，Ctrl+C 停止
lab\test.cmd        验收 + 40 条路径契约
lab\vectors.cmd     只跑 40 条路径契约
lab\soak-60s.cmd    60 秒 soak
lab\soak-24h.cmd    24 小时 soak，日志写 .run\soak-24h.log
lab\status.cmd      查看 24h soak 的已跑时间、ETA、计数
lab\watch.cmd       实时刷新 24h soak 状态，Ctrl+C 只退出观察
```

CMD 会先检查 `node` 是否在 PATH；失败会停住让你看错误。

## 快速开始

一键模式（当前 Node 进程里起两个独立端口）：

```bash
npm.cmd run lab
```

或：

```bash
node lab/start.mjs
```

输出：

```text
upstream  http://127.0.0.1:18080
gateway   http://127.0.0.1:18787
health    http://127.0.0.1:18787/healthz
metrics   http://127.0.0.1:18787/metrics
```

Ctrl+C 同时停止。

## 分离进程模式

两个终端，更接近真实部署：

```bash
# 终端 1
node lab/upstream/server.js --port 18080

# 终端 2
node lab/gateway/start.js --port 18787 --upstream http://127.0.0.1:18080
```

## 自动验收

```bash
npm.cmd run test:lab
```

或：

```bash
node lab/scenarios/acceptance.mjs
```

验收内容：

```text
/public                 200，上游命中 1
/admin                  403，上游命中 0
/%61dmin                403，上游命中 0
/admin/login            200，放行
/admin%2f..%2fpublic    400
/public/%252e           400
x-original-url          400
/admin/canary           403，canary 上游命中 0
80KB body               413，不转发
jwt-none                403
/public/x?y=1           上游收到 canonical + query
/public//x              上游收到 /public/x
/healthz                200
/metrics                requests/blocked
```

## 手动 curl

```bash
curl -i http://127.0.0.1:18787/public
curl -i http://127.0.0.1:18787/admin
curl -i http://127.0.0.1:18787/admin/login
curl --path-as-is -i http://127.0.0.1:18787/admin%2f..%2fpublic
curl -i http://127.0.0.1:18787/admin -H "x-original-url: /public"
curl -i http://127.0.0.1:18787/public -H "Authorization: Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0."
```

看上游实际命中：

```bash
curl -s http://127.0.0.1:18080/health
```

期望：

```text
admin=0
canary=0
login=1
public 只在正常路径增长
```

## 覆盖

```text
路径规范化
策略阻断/放行
canonical 转发
query 保留
JWT none
大 body
canary
/healthz
/metrics
决策日志
```

## 不覆盖

```text
真实 TLS / 域名
真实反向代理头
真实网络延迟
真实 WAF/CDN
真实命令执行
```

这些等 3.0-rc 前用独立香港服务器补。

## 40 条路径契约

```bash
npm.cmd run test:lab:vectors
```

实现方式：

```text
原始 TCP 写请求行，避免 fetch/URL 先规范化 ..、%2e、//
从网关决策日志断言 decision / canonical / reason
不只看 HTTP 状态
```

预期：

```text
✓ 本地靶场 40 条路径契约通过（决策日志 38 条）
```

其中空 request-target 和相对路径 `admin` 会被 Node HTTP parser 直接拒绝，没有决策日志，只断言 400/连接关闭。

## Soak

默认 60 秒、40 rps：

```bash
npm.cmd run soak:lab
```

24 小时：

```bash
npm.cmd run soak:lab:24h
```

自定义：

```bash
node lab/scenarios/soak.mjs --duration 600 --concurrency 4 --rate 40
```

Soak 断言：

```text
safe 200
attack 400/403
upstream admin = 0
upstream canary = 0
errors = 0
```

输出包含：

```text
requests / blocked / allowed
upstream 命中
heap_delta_mb
决策日志路径
```

本地 smoke 结果：

```text
60s / 4 并发 / 40 rps
safe=1298 attack=650 blocked=650 errors=0
upstream admin=0 canary=0
```

24h 建议在独立机器或空闲时跑，别在 DSH 所在进程里加压。

## 实时看进度

双击：

```text
lab\watch.cmd
```

每 2 秒刷新一次：

```text
已跑多久
开始时间
预计完成时间
剩余小时
safe / attack / blocked / errors
实际速率
日志多久没更新
```

`Ctrl+C` 只退出观察，不会停止 soak。

也可以单次看：

```text
lab\status.cmd
```

## 安全边界

```text
只监听 127.0.0.1
不要改成 0.0.0.0 暴露公网
不要接真实数据
不要在这里执行 iptables/nft
日志在 lab/.run/（已 gitignore）
```

## 文件

```text
lab/start.mjs                 一键启动
lab/upstream/server.js        受保护上游
lab/gateway/start.js          3.0 网关
lab/policy.json               保护 /admin，允许 /admin/login
lab/scenarios/acceptance.mjs  自动验收
lab/scenarios/vectors.mjs     40 条路径契约
lab/scenarios/soak.mjs        限速 soak
lab/status.cmd                24h soak 状态/ETA
lab/watch.cmd                 实时刷新状态
lab/watch.ps1                 实时观察实现
lab/.run/                     日志，已 gitignore
```
