# 2.0 / 3.0 对照跑

## 一条命令

```bat
compare-2.0-3.0.cmd
```

不需要 DSH、不需要服务器。

## 它做什么

同一个本地 upstream，同时起：

```text
2.0 lib/gateway.js  guard=strict
3.0 v3/infra/gateway 默认策略
```

发同一批请求，比较：

```text
正常首页
/.env
/admin
编码穿越
JWT alg=none
提权字段
```

## 当前结果

```text
case             2.0 3.0
正常首页          200 200
敏感文件          200 403
管理入口          200 200
编码穿越          403 400
JWT alg=none      403 403
提权字段          403 403
重复 Cookie       403 403
JWT Cookie        403 403
原型污染          403 403
表单提权          403 403
嵌套提权          403 403
```

结论：

```text
2.0 的内容/身份检查 3.0 已经覆盖
3.0 默认不再一刀切封 /admin
3.0 仍拦 /.env 等敏感文件
admin 的正常访问交还给应用鉴权
```

## 正常 admin 怎么不误杀

默认策略不封 `/admin`：

```text
/admin -> 放行给应用鉴权
/.env  -> 403
```

如果业务要求网关层再保护 admin，用**显式策略**：

```text
protected: /admin
allow: /admin/login
```

但这会挡住已登录的 `/admin/dashboard`，所以默认不启用。

更合理的三层：

```text
1. 应用自身鉴权
2. 网关检测 JWT/提权/暴力破解
3. 必要时按来源 IP/VPN 做 allowlist
```

## 只看状态码不够


还要看：

```text
误杀：正常 /admin 业务是否需要放行
证据：403 是否带原始请求
可回滚：策略是否可热更新
告警：阻断是否进入事实库
```

## 下一步

```text
把 2.0 的 content/jwt 检查接到 3.0
不要为了“3.0 更强”把 2.0 的直接请求检查丢掉
```
