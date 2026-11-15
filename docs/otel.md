# OTLP/HTTP 日志接收器

这是 2.0 的**真实推送源接入**，不是文件轮询。

## 启用

设置一个足够长的 token：

```powershell
$env:BLUE_OTLP_TOKEN = "请换成长随机字符串"
```

重启 DSH 后启用：

```text
POST http://127.0.0.1:<DSH_PORT>/blue/otlp/v1/logs?engagement=ENG-...
Authorization: Bearer <BLUE_OTLP_TOKEN>
Content-Type: application/json
```

也可以把目标放头里：

```text
x-blue-engagement: ENG-...
```

token 未配置时路由返回 `503`，不会开放匿名写入。

## 当前能力

```text
OTLP/HTTP JSON
resourceLogs
scopeLogs
logRecords
service.name
severityNumber / severityText
timeUnixNano
body.stringValue
attributes
```

限制：

```text
单请求最多 200 条
只接受 application/json
不支持 protobuf
不支持 gzip 请求体
不执行日志内容
```

## 落库

每条日志变成：

```text
alerts.source = otel:<service>
alerts.title  = OTel <service>: <body>
alerts.event_time = timeUnixNano
alerts.raw = 原始 resource/record
```

重复投递按 `external_id` 去重。

## Collector 示例

```yaml
exporters:
  otlphttp/blue:
    endpoint: http://127.0.0.1:<DSH_PORT>/blue/otlp/v1/logs?engagement=ENG-...
    headers:
      Authorization: "Bearer <BLUE_OTLP_TOKEN>"

service:
  pipelines:
    logs:
      receivers: [otlp]
      exporters: [otlphttp/blue]
```

## 测试

```bash
node scripts/test-otlp.mjs
```

覆盖：

```text
OTLP JSON 解析
severity 映射
去重
Bearer token
无 token 拒绝
```

## 边界

- 当前是接收器，不是完整 OTLP Collector。
- 不接收 traces/metrics。
- 没有持久队列，DSH 重启期间的推送会丢；生产应由 Collector 缓冲。
- 没有 mTLS；跨主机部署请放在反向代理后。
