---
name: decoy-server
description: 可选的本地/授权资产 HTTP 诱饵程序：静态假管理页、假 .git、假 phpMyAdmin、合成 SQL、假 shell 文本；只写本地 JSONL，不执行命令、不抓指纹。
---

# 可选诱饵程序

## 启动

在插件目录：

```bash
node scripts/decoy-server.mjs --host 127.0.0.1 --port 8080
```

安装为 npm 包后：

```bash
npx --yes --package dsh-blue-team-mode dsh-blue-decoy --host 127.0.0.1 --port 8080
```

默认只监听 `127.0.0.1`。对公网/内网资产监听必须显式：

```bash
node scripts/decoy-server.mjs --host 0.0.0.0 --port 8080 --allow-public
```

启动前确认：

- 目标在授权防守范围内
- 防火墙只放行需要暴露的端口
- 不要覆盖真实业务端口
- 公开前先看 `--help`

## 提供的假路径

- `/admin`、`/wp-login.php`：假管理页
- `/.git/config`：假 git 配置
- `/phpmyadmin`：假 phpMyAdmin
- `/backup.sql`：有界合成 SQL（约 48KB）
- `/shell.php`：静态假文本，不执行、不回连
- `/server-status`：假状态页
- 其他路径：404

## 日志

默认写入：

```text
$DSH_HOME/blue/decoy-events.jsonl
```

每条 JSON 包含时间、来源、方法、路径、UA、脱敏 body、状态码、耗时。不会记录 Cookie/Authorization；body 中的 password/token/secret/cookie 等字段会替换为 `[REDACTED]`，不抓 WebRTC/Canvas/硬件指纹。

把事件交给 Agent：

```text
读取 decoy-events.jsonl，把命中事件用 blue_honeypot_ingest 落库
```

`blue_honeypot_ingest` 会生成告警和 high 风险待审批封禁任务，不会自动改防火墙。

## 不做

- 不执行 PHP/Shell/命令
- 不返回无限/10GB 响应
- 不做真实反弹 Shell
- 不收集浏览器指纹或真实身份信息
- 不自动封禁
- 不主动外传日志
