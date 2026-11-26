# 本地靶场防守手册（3.0 beta）

> 原则：靶场必须是**独立进程、独立端口**，不能是 DSH 自己（例如 62571 链接预览）。
> 蓝队会话没有 shell/HTTP，探测和启动服务由宿主机终端做；蓝队负责接日志、规则、告警、审批、证据。

## 推荐拓扑

```text
本地靶场服务   127.0.0.1:18080   独立进程
防守网关       127.0.0.1:18787   -> 18080
访问日志       18080 自己写 JSONL
蓝队事实库     $DSH_HOME/blue
```

不要：

```text
不要把 DSH 的 62571 当靶场
不要让靶场和 DSH 同 PID
不要在同一 PID 上压测
不要把网关监听 0.0.0.0
```

## 1. 起靶场

本地测试可用：

```powershell
cd C:\Users\86186\Desktop\蓝队防御插件
python test\fixtures\mock-upstream.py
```

真实靶场换成它自己的启动命令，确认：

```text
只监听 127.0.0.1
独立 PID
有访问日志
```

## 2. 起网关

```powershell
cd C:\Users\86186\Desktop\蓝队防御插件
$env:BLUE_GATEWAY_PORT='18787'
$env:BLUE_GATEWAY_UPSTREAM='http://127.0.0.1:18080'
node v3\gateway.js
```

验证：

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:18787/public
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:18787/admin
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:18787/.env
```

预期：

```text
/public 200
/admin  403
/.env   403
```

网关日志默认落在：

```text
$DSH_HOME/blue/gateway-decisions.jsonl
```

## 3. 蓝队接目标

新蓝队会话：

```text
防御自检
blue_engagement_open
  name=local-range
  scope=["127.0.0.1","localhost","::1"]

blue_asset_add
  name=本地靶场
  address=http://127.0.0.1:18787/
  kind=web
  port=18787
  criticality=medium
  evidence=经网关访问；上游 18080；已确认独立进程
```

## 4. 接日志

把靶场访问日志放到允许目录：

```text
$DSH_HOME/blue/logs/range-access.jsonl
$DSH_HOME/ctf-lab/*.jsonl
当前工作区
或 BLUE_TELEMETRY_ROOT
```

然后：

```text
blue_telemetry_source_add
  name=range-access
  path=C:\Users\86186\.dsh\blue\logs\range-access.jsonl

blue_telemetry_poll name=range-access
blue_detection_scan source=range-access
```

日志至少要有：

```json
{"at":"...","method":"GET","path":"/admin","status":403,"remote":"127.0.0.1","user_agent":"..."}
```

否则 rules 无法命中。

## 5. 规则

内置：

```text
HTTP 401/403
登录/管理路径失败
Windows 4625
上传/临时目录 PHP
扫描器 UA/敏感路径
```

自定义：

```text
blue_detection_rule_add
  rule_key=range-admin-fail
  title=靶场管理入口失败
  severity=high
  selection={"path":["*admin*"],"status|[http.status]":[401,403]}
  condition=all
  tags=["T1190"]
```

## 6. 告警与响应

```text
blue_alert_list status=open
blue_alert_triage id=... status=contained note=...
```

高风险响应：

```text
blue_task_create role=ir risk_level=high
-> pending_approval
blue_task_approve
-> queued
```

## 7. 证据

```text
blue_report write=true path=local-range-report.md
blue_evidence_export write=true path=local-range-evidence.json
blue_evidence_verify path=<file> digest=<digest>
```

## 8. 每次演练的顺序

```text
1 靶场独立进程起来
2 网关起来
3 浏览器/curl 打靶场，产生日志
4 蓝队接日志、跑 poll/scan
5 研判告警
6 高风险任务走审批
7 导出报告/证据
8 关目标、停靶场、停网关
```

## 9. 不能做的事

```text
不要把网关指向 DSH 的 62571
不要在蓝队会话里假装有 shell
不要用别人的日志源冒充目标日志
不要把 403/404 一律当攻击
不要把“检测到”写成“已阻断”
```
