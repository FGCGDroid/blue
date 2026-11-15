# 已知问题与欠债

> 最后更新：2026-11-15  
> 这些不是“以后再说”，是接盘者必须先知道的坑。

## 1. 市场 catalog 滞后

```text
npm latest：1.5.4
catalog：1.5.2
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

## 2. 24h soak 未完成

当前：

```text
约 9h / 24h
```

限制：

```text
soak 只在本机运行
关机就暂停
```

不是失败，是还没跑完。  
在 24h 完成前，2.0 不能叫正式稳定版。

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
lib/tools.js 很大
lib/client.js 很大
```

不要继续往单文件堆。  
新功能优先拆模块。

## 9. 没有正式浏览器 E2E

有 `test-ui.mjs`，但主要是 Host/客户端注册冒烟。  
没有完整浏览器交互回归。

## 10. Windows 路径/任务依赖本机

```text
soak 计划任务
维护计划任务
```

依赖：

```text
C:\Users\86186\Desktop\蓝队防御插件
```

换机器/换用户名要重配。

## 11. 安全边界仍靠人

```text
网关必须挂在必经路径
诱饵必须人工部署
封禁/隔离必须审批
```

插件不是 WAF，不是 EDR，不是自动处置平台。
