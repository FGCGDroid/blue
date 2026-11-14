# HTTP 请求走私（CL+TE）应对策略

## 结论

```text
不允许对 65288 直接做 CL+TE live 测试
先复制网关到隔离端口验证
没有副本就记录 blocked_by_availability
```

## 风险

```text
CL.TE
TE.CL
TE.TE
重复 Content-Length
重复/混淆 Transfer-Encoding
```

网关和后端只要对“长度”和“分块”的解析不一致，就可能出现：

- 网关挂起或 worker 卡死
- keep-alive 连接污染，后续正常请求串包
- 请求被前端放行、后端按另一段解析
- 一轮测试直接把靶场打掉

60857 已经出现过 `Transfer-Encoding: chunked` 挂起。65288 没有重启条件时，不能拿可用性做实验。

## 网关侧已加的硬规则

`inline-guard` / `gateway` 现在直接拒绝：

```text
Content-Length + Transfer-Encoding 同时出现
重复 Content-Length
重复 Transfer-Encoding
Content-Length 不是纯数字
Transfer-Encoding 不是精确的 chunked
```

同时网关设置：

```text
headersTimeout = 5s
requestTimeout = 10s
keepAliveTimeout = 5s
clientError -> 400 + Connection: close
```

目标不是“识别所有走私”，而是**消除歧义输入**：不猜，直接拒绝。

## 安全验证流程

有副本时：

```text
1. 复制 65288 的网关 + 应用到 65388
2. 确认副本可重启、可丢弃
3. 单连接、Connection: close
4. 每个变体只发一次
5. 2–3 秒超时
6. 超时或连接挂起立即停止，不重试
7. 测前/测后各做一次健康检查
8. 先看 400/关闭/正常响应，不直接上利用链
```

没有副本时：

```text
blocked_by_availability
```

并把“网关在 TE 上会挂起”作为 high 可用性发现记录，不要伪造成“已测试安全”。

## 不建议的做法

```text
对生产 65288 并发扫 CL+TE
用 fetch 自动跟随/重试
一次发几十种变体
测试前不确认重启能力
看到 200 就继续打利用链
```

`fetch` 会规范化请求，不适合测走私；必须用原始 TCP。

## 修复优先级

1. 网关拒绝 CL+TE / 重复长度头 / 歧义 TE。
2. 网关和后端使用同一套解析与规范化。
3. 每个请求有硬超时，worker 隔离。
4. keep-alive 不跨上游复用。
5. 记录被拒绝的原始头，做告警。
