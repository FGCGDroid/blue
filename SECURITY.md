# Security Policy

## 支持范围

当前维护版本：

```text
1.3.x
```

更早版本只保留升级建议，不保证修复。

## 报告安全问题

请使用 GitHub 的 **Private vulnerability reporting**：

```text
https://github.com/FGCGDroid/blue/security/advisories/new
```

不要在公开 issue 里贴：

- 真实 token、Cookie、Authorization
- 客户/比赛敏感日志
- 可复现的真实主机地址
- 未授权的目标信息

如果私密报告入口不可用，请开一个**不含敏感信息**的 issue，只写“需要私密渠道”，维护者会跟进。

## 安全边界

- 本项目是蓝队编排、记录和辅助研判工具，不是 EDR/IPS/WAF/防火墙/备份系统。
- 不承诺拦截、阻断或恢复攻击；生产使用前请自行评估、备份和回滚演练。
- 高风险动作（隔离、封禁、删除、改防火墙等）必须人工审批；插件不直接调用 root 防火墙。
- 诱饵程序默认只监听 `127.0.0.1`；公开监听必须显式 `--allow-public`。
- 诱饵日志不记录 Cookie/Authorization；body/query 中的 password/token/secret/cookie/session 会脱敏。
- 不收集 WebRTC 真实 IP、Canvas/硬件指纹。

## 不在范围内

- 用户对未授权目标的使用
- 用户自行修改代码、删除审批闸或接入 root 执行器导致的问题
- 第三方工具（Endlessh/Nginx/fail2ban/EDR 等）的配置错误
- 真实生产环境的网络、主机和凭据管理

## 隐私

插件默认不主动上传数据；事实库和诱饵日志保存在本机。外部情报查询由用户显式调用，并自行承担合规责任。
