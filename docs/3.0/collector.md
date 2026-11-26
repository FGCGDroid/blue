# 远程日志采集器

## 它解决什么

DSH 不在被防守服务器上时，不能直接读那台机器的 `access.log`。
采集器放在服务器上，只读 tail 日志，带 token 推到 DSH。

```text
服务器 access.log
  -> blue-collector.mjs
  -> POST /blue/collect (Bearer token)
  -> $DSH_HOME/blue/collector/<engagement>.jsonl
  -> 后台采集器
  -> 告警 / 知识库
```

## 安装成服务

Linux：

```bash
sudo bash install-collector.sh http://<DSH-IP>:<端口> <token> ENG-... /var/log/nginx/access.log
```

Windows（管理员 PowerShell）：

```powershell
.\install-collector.ps1 -Url http://<DSH-IP>:<端口> -Token <token> -Engagement ENG-... -Log C:\logs\access.log
```

脚本在 `lab/` 下，只做下载、写配置、注册服务；不执行日志内容。

## 网络安全

```text
token 轮换：collectorRotate
IP 白名单：collectorAllow
限流：每 IP 每分钟 120 次
HTTPS：需要反代终止 TLS，采集器支持 https URL
```

## 生成命令

让蓝队会话调用：

```text
blue_collector url=http://<DSH-IP>:<端口>
```

返回：

```json
{
  "endpoint": "http://<DSH-IP>:<端口>/blue/collect",
  "token": "...",
  "command": "BLUE_COLLECTOR_TOKEN='...' node blue-collector.mjs --url ... --engagement ENG-... --log /var/log/nginx/access.log"
}
```

## 在服务器上运行

把 `lab/blue-collector.mjs` 拷到服务器，然后：

```bash
BLUE_COLLECTOR_TOKEN='<token>' \
node blue-collector.mjs \
  --url 'http://<DSH-IP>:<端口>' \
  --engagement 'ENG-...' \
  --log /var/log/nginx/access.log
```

首次只看新日志。要从文件头开始：

```bash
--from-start
```

支持 Nginx/Apache combined 和 JSONL。

## 网络前提

```text
服务器必须能访问 DSH 的 /blue/collect
DSH 默认只监听 127.0.0.1 时，需要反向代理或隧道
不要把 DSH 端口直接裸奔到公网
```

## 安全边界

```text
token 只用于 /blue/collect
不认浏览器同源，但仍然校验 token
采集器只读日志，不执行日志内容
日志里的指令按不可信数据处理
```

## 验证

```bash
curl -X POST 'http://<DSH-IP>:<端口>/blue/collect' \
  -H 'authorization: Bearer <token>' \
  -H 'content-type: application/json' \
  -d '{"engagement":"ENG-...","events":[{"method":"GET","path":"/.env","status":404}]}'
```

预期：

```json
{"ok":true,"accepted":1}
```
