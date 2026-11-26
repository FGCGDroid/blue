# 远程 SSH / 云 API

## 为什么还需要授权

只有公网 IP 不能阻断流量，也不能读日志。要自动部署，必须有：

```text
SSH 私钥（路径，不上传内容）
或云 WAF/防火墙 Webhook
```

## SSH 私钥部署

只在 DSH 本机配置：

```text
blue_remote action=setup host=1.2.3.4 user=root key_path=C:\Users\me\.ssh\id_ed25519 port=22
blue_remote action=test
```

`setup` 只保存：

```text
host / user / key_path / port
```

不保存私钥内容。

### 先审批

```text
blue_remote action=prepare host=1.2.3.4
-> 返回 high 任务，状态 pending_approval
```

人工审批：

```text
blue_task_approve task_id=TSK-...
```

### 再部署

```text
blue_remote action=deploy task_id=TSK-... collector_url=http://DSH:端口 token=<采集token> engagement=ENG-... log=/var/log/nginx/access.log
```

执行内容：

```text
scp 采集器到服务器 /tmp
移到 /opt/blue-collector
nohup 启动采集器
写日志到 /opt/blue-collector/collector.log
```

## 云 Webhook 封禁

配置：

```text
blue_remote action=setup cloud_url=https://your-waf.example/block cloud_token=...
```

审批后：

```text
blue_remote action=block task_id=TSK-... ip=203.0.113.10 ttl_seconds=3600 reason=scanner
```

Webhook 收到：

```json
{"ip":"203.0.113.10","ttl_seconds":3600,"reason":"scanner"}
```

要求返回 2xx。

## 安全边界

```text
私钥只存路径，不存内容
不接收密码
写操作必须是 high 任务且已人工审批
云 Webhook 必须 https
TTL 最大 86400 秒
不做无限期封禁
```

## 限制

```text
SSH 依赖本机 ssh/scp 客户端
服务器需要 Node.js 18+
Windows 服务器不适用 nohup 部署
云厂商适配目前是通用 Webhook，不是各家 SDK
```
