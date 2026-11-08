---
name: hardening
description: 【加固】蓝队加固基线：暴露面收敛、SSH/远程、Web/中间件、数据库、容器与补丁，含回滚
whenToUse: 发现配置缺陷、暴露面过大、弱口令/未授权、或比赛间隙需要提升防守强度时
role: hardening
category: 加固
tags: [hardening, baseline, patch]
enabled: true
---

# 加固基线

## 原则
- 先修“能被再次利用”的入口，再谈合规项。
- 每次改动记录：现状、改什么、为什么、验证、回滚。
- 不影响业务可用性优先；必须重启的先确认窗口。

## 暴露面
- 关闭不必要端口/服务；管理端限制来源 IP。
- 数据库/缓存/对象存储不对公网开放；默认口令必须改。
- 调试接口、actuator、phpinfo、swagger、.git、备份文件下线。
- 云安全组/防火墙默认拒绝入站，只放行业务端口。

## SSH / 远程
```text
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
AllowUsers deploy
```
- 只开密钥登录；禁用空口令；限制来源；fail2ban。
- RDP：仅 VPN/堡垒机可达，启用 NLA、账户锁定、MFA。

## Web / 中间件
- 上传：白名单扩展名 + MIME + 内容校验 + 重命名 + 不可执行目录。
- 反序列化：升级组件、白名单类、禁用危险 gadget。
- 模板/表达式注入：升级、输入校验、沙箱。
- 关闭目录浏览、TRACE、不必要的 HTTP 方法；设置安全响应头。
- 及时更新 Nginx/Tomcat/Spring/WebLogic/Shiro 等。

## 数据库
- 最小权限账号；应用账号不允许 DDL/文件读写。
- 关闭 `xp_cmdshell`、`LOAD_FILE`、`INTO OUTFILE` 等危险能力（按业务评估）。
- 审计慢查询与异常登录；备份加密、离线保存。

## 容器 / K8s
- 非 root、只读根文件系统、禁用 privileged、限制 capabilities。
- NetworkPolicy 默认拒绝；Secret 不落镜像；镜像扫描。
- API Server 不暴露公网；RBAC 最小权限；审计日志开启。

## 检测补齐
- 为已发现攻击手法补日志字段与告警规则。
- 文件完整性监控（Web 根、配置、计划任务）。
- 出站监控（C2、DNS 隧道、云盘）。

## 验证
- `blue_hardening_check` 复查基线。
- 用原攻击请求复测入口是否关闭。
- 业务回归：登录、上传、支付/核心流程。
- 未修复项写 `blue_finding_add`，注明风险接受人。
