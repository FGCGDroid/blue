# 影子测试（CMD 可直接跑）

## 一条命令

```bat
shadow-test.cmd
```

或：

```bat
node scripts\shadow-test.mjs
```

## 它做什么

不启动 DSH，不连真实服务器，临时起：

```text
本地 upstream（真实 HTTP 服务）
3.0 网关（真实监听随机端口）
临时 SQLite
后台采集器
```

验证：

```text
1. 直连 /.env -> 200（确实暴露）
2. 经网关 /.env -> 403（确实阻断）
3. 经网关 / -> 200（没有误杀）
4. 后台采集网关日志 -> 生成告警
5. artifact 写入后 sha256 可校验
```

## 输出示例

```text
PASS  直连 /.env 暴露                     19.8 ms  HTTP 200
PASS  网关 /.env 阻断                      5.9 ms  HTTP 403
PASS  网关 / 放行                         10.3 ms  HTTP 200
PASS  后台采集生成告警                      4.6 ms  alerts=1
PASS  artifact 可校验                      0.0 ms  ART-...

总计 5 项，失败 0 项，累计 40.7 ms
SHADOW TEST PASS
```

## 要求

```text
Node.js >= 24（项目已有 node:sqlite / fetch）
Windows 直接双击 shadow-test.cmd
不需要管理员权限
不需要 DSH 正在运行
不读取真实日志
不改真实策略文件
临时目录跑完自动删除
```

## 判定

```text
退出码 0 = 全过
退出码 1 = 任一断言失败
耗时是单次观测，不是性能基准；只用来发现明显退化
```

## 边界

影子测试证明的是：

```text
这条链路能拦截、能告警、证据可校验
```

不证明：

```text
远程服务器网络可达
真实 Nginx 日志格式全覆盖
生产策略没有误杀
```
