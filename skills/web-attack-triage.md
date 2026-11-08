---
name: web-attack-triage
description: 【Web】Web 攻击快速研判：SQLi/XSS/SSRF/上传/反序列化/路径穿越的日志特征与成功判定
whenToUse: WAF/IDS 告警、访问日志异常、需要判断 Web 攻击是否成功时
role: hunt
category: Web
tags: [web, sqli, xss, ssrf, upload]
enabled: true
---

# Web 攻击快速研判

## 通用方法
1. 找到请求：时间、源 IP、方法、URI、参数、body、UA。
2. 看响应：状态码、长度、时间、是否回显、是否写入/执行。
3. 看后续：同一 IP 是否继续访问、是否上传新文件、是否访问内网。
4. 判定：成功 / 失败 / 待验证；不要只看 WAF 命中。

## SQLi
- 特征：`union select`、`sleep(`、`benchmark(`、`information_schema`、引号闭合。
- 成功：响应出现库名/表名/数据、时间延迟稳定、错误页暴露 SQL。
- 后续：拖库、写文件、`into outfile`、提权。

## XSS
- 特征：`<script>`、`onerror=`、`javascript:`、编码变体。
- 成功：payload 出现在响应且未被转义；有受害者访问。
- 蓝队重点：存储型 XSS 可能偷管理员会话；检查 Cookie HttpOnly。

## SSRF
- 特征：URL 参数指向内网/云元数据（`169.254.169.254`、`127.0.0.1`、`file://`）。
- 成功：响应包含内网服务 banner/云凭据；出站连接记录。
- 处置：封目的地址、限制协议/端口、加白名单。

## 文件上传
- 特征：multipart、文件名双扩展、Content-Type 伪造、图片马。
- 成功：上传目录出现新文件、可访问、可执行、连接外连。
- 处置：隔离目录、删文件、修校验、查同时间窗其它文件。

## 反序列化
- 特征：`rO0AB`（Java）、`O:`（PHP）、`__type`（ASP.NET）、base64 大 body。
- 成功：DNS/HTTP 外连、命令执行、内存马。
- 处置：升级组件、白名单、WAF 规则、查外连。

## 路径穿越 / 文件包含
- 特征：`../`、`%2e%2e`、`/etc/passwd`、`php://filter`、`data://`。
- 成功：响应包含文件内容、日志出现敏感路径。
- 处置：规范化路径、白名单、禁用危险 wrapper。

## 落库
`blue_log_scan` 初筛 → `blue_finding_add` 记录（含原始请求/响应）→ 需要处置建 `ir` 任务。
