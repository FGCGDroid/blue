# 已知问题与欠债

> 最后更新：2026-11-17
> 这些不是“以后再说”，是维护者必须先知道的坑。

## 1. 市场 catalog 滞后

```text
npm latest：2.0.0
catalog：可能仍显示 1.5.4
```

原因：

```text
catalog 由 awesome-dsh-plugin 的 probe 生成
不是 npm 发布后立刻更新
```

解决：

```text
有 admin 权限的人触发 Build site from README
或等自动构建
```

注意：

```text
改 main 的 YAML 只改描述，不改 versions
```

## 2. soak 是“实际采样时间”，不是连续墙钟

2.0.0 的结果：

```text
elapsed_sec：86400（24h 实际采样）
samples：1442
integrity：ok
timeline：true
alerts：0
```

限制：

```text
墙钟跨度约 53h
中间有 3 段暂停（约 10h / 25h / 6.7h）
关机、休眠、退出都不计入进度
```

这是 `docs/stabilization.md` 的既定口径，不是失败；
但不要把“24h soak”理解成连续 24 小时墙钟。

## 3. CVE 数据未核验

CVE 防御包来自用户提供的描述。

```text
没有联网核验受影响版本
没有版本区间
没有厂商公告绑定
```

所以：

```text
扫描命中只是候选
不能直接判“已确认漏洞”
```

## 4. 审计锚定偏本地

```text
Ed25519 签名
公钥本地固定
没有外部时间戳/远端只追加
```

能证明“包没被改”，不能证明“采集时没被操控”。

## 5. 没有 RBAC / 静态加密

```text
单用户
SQLite 明文
没有角色分离
没有 SSO
```

适合个人/CTF，不适合直接做企业多用户。

## 6. OTLP 是接收器，不是 Collector

支持：

```text
OTLP/HTTP JSON
logs
```

不支持：

```text
protobuf
traces
metrics
gzip
持久队列
mTLS
```

DSH 重启期间推送会丢。
生产应让 Collector 缓冲。

## 7. 诱饵状态需要人工确认

已修：

```text
有命中自动 planned → active
列表自动校准
控制台可标记运行
```

但：

```text
真实部署但无命中、无事件
平台无法自动知道
```

必须人工 `blue_decoy_update status=active`。

## 8. 工具/前端文件过大

```text
lib/tools.js   约 2748 行
lib/client.js  约 1848 行
lib/store.js   约 1484 行
```

不要继续往单文件堆。
新功能优先拆模块。
新增工具前先看 `docs/tool-map.md` 的拆分规则。

## 9. 告警/发现状态机没有强制迁移

任务、案件、诱饵、响应有集中状态机；告警/发现目前只是语义状态：

```text
alert:   open / investigating / contained / closed / false_positive
finding: open / fixed / accepted / false_positive
```

`store.updateAlert()` / `store.updateFinding()` 目前：

```text
不校验状态枚举
不校验迁移
```

所以：

```text
UI 和工具必须自己传合法值
不要依赖 store 拦住非法状态
要收紧，先看 docs/state-machines.md 的“告警与发现”
```

## 10. 没有正式浏览器 E2E

有 `test-ui.mjs`，但主要是 Host/客户端注册冒烟。
没有完整浏览器交互回归。

## 11. Windows 路径/任务依赖本机

```text
soak 计划任务
维护计划任务
```

依赖：

```text
C:\Users\86186\Desktop\蓝队防御插件
```

换机器/换用户名要重配。

## 12. 安全边界仍靠人

```text
网关必须挂在必经路径
诱饵必须人工部署
封禁/隔离必须审批
```

插件不是 WAF，不是 EDR，不是自动处置平台。
