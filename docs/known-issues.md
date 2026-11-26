# 已知问题与结构债

> 最后更新：2026-11-26（3.0.7）
> 这些不是“以后再说”，是维护者必须先知道的坑。

## 1. npm 已不可用

```text
作者 npm 账号被封，无法登录/发布
npm 上只有 2.0.0，且不再更新
```

处理：3.x 只走 GitHub Release + jsDelivr；不要尝试 `npm publish`，也不要在文档里写 npm 安装。

## 2. GitHub Release 下载域名在部分网络不可达

```text
github.com/.../releases/download → objects.githubusercontent.com
国内经常超时
```

处理：更新按钮下载走 `cdn.jsdelivr.net`，GitHub Release 只做留档。

## 3. jsDelivr 分支缓存会读到旧 update.json

```text
@3.0-dev 分支缓存约 12 小时
```

处理：update.json 只从 `raw.githubusercontent.com` 读，jsDelivr 只用于下载按 tag 固定的 tgz。

## 4. 隧道会断，agent 会卡

现象：

```text
服务器 /var/log/blue-agent.log 刷 post_failed: fetch failed
告警停止增长
```

原因与处理：

```text
1. DSH 重启换端口 → 本机 ssh -R 还指向旧端口
   杀掉 ssh -R 进程，watcher 会用新端口重建
2. 隧道恢复后 agent 仍不post → 重启 blue-agent
3. 采集游标卡在 20000 上限 → 3.0 起自动回退最近 500 条，
   仍卡住时手动把 telemetry_sources.cursor 回退
```

## 5. CrowdSec 与站点端口冲突

```text
CrowdSec 默认 LAPI 监听 8080
站点 Node 应用也监听 8080
```

处理：本机已停用 CrowdSec；如再启用，先把 LAPI 改到 8081 并同步 bouncer 配置。

## 6. Windows 下不能安全自更新

正在运行的插件替换自身 `node_modules` 会 EBUSY/EPERM，可能把 DSH 弄挂。

处理：更新按钮做“下载 + 安装 + 提示重启”，不做自动重启。

## 7. 主机层不可见

```text
只接 nginx 访问日志
没有 auditd / secure / 进程日志
提权、持久化、横向移动不可见
```

这是当前最大的检测缺口，不是 bug，是未接入数据源。

## 8. 单机无异地备份

```text
blue.db 和站点数据只在本机/本服务器
磁盘损坏即丢失
```

用户当前选择不做 OSS 备份；需要时再补。

## 9. 诱饵/焦油坑依赖安全组

```text
2222/2223/2224 需要阿里云安全组放行
不放行时只在本地监听，不起作用
```

## 10. 打法库“other”占比高

```text
老签名只有路径+状态码，没有 payload 特征
分类只能落到 other
```

新条目会按标题/攻击描述分得更细；历史条目需要增量回填。
