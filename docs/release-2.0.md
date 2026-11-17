# 2.0 发布说明（草案）

> 状态：beta.32 已发布；24h soak 未完成前，**不要**把本文当正式稳定版公告。

## 一句话

2.0 把蓝队插件从“工具集合”推进到：

```text
风险闸
+ 事实库
+ 审计链
+ 证据包
+ 任务审批
+ 诱饵/遥测/OTLP
+ CVE 防御包
+ 资产—风险图谱
```

## 规模

```text
66 个工具
12 个页签
17 张表
6 个执行角色
```

## 主要变化

### 风险与审批

```text
high 风险任务强制 pending_approval
blue_task_approve 人工放行
审批写 timeline
不允许 pending_approval 直接 dispatched
```

### 事实库与审计

```text
SQLite WAL
timeline 哈希链
Ed25519 证据签名
幂等迁移
回滚演练脚本
```

### 检测与防御

```text
CL+TE / 重复长度 / 歧义 TE 直接拒绝
JWT none、路径、Cookie 规则
诱饵 planned/active 校准
假 flag 不按真泄露处理
```

### 遥测

```text
JSONL 增量轮询
OTLP/HTTP JSON 接收器
Bearer token
按 service/severity 落告警
```

### CVE 与资产

```text
CVE 防御包
CVE 任务生成
资产—CVE—发现风险图
scope 中具体 host/URL 自动登记资产
```

### 控制台

```text
12 个页签
任务审批
诱饵标记运行
证据导出
全面浏览
中英文本地化
```

## 从 1.5.4 升级

### 升级前

```text
备份 $DSH_HOME/blue/blue.db
记录当前版本
保留 1.5.4 tarball
```

### 安装 beta

```sh
dsh plugin --profile desktop add dsh-blue-team-mode@2.0.0-beta.32
```

或：

```sh
dsh plugin --profile desktop add \
  https://github.com/FGCGDroid/blue/releases/download/v2.0.0-beta.32/dsh-blue-team-mode-2.0.0-beta.32.tgz
```

### 升级后验证

```text
DSH 能启动
控制台能打开
engagement/资产/告警还在
timeline 连续
导出一次证据
跑一次 low 风险任务
```

### 回滚

```text
停止 DSH
恢复 blue.db 备份
装回 1.5.4
重启
```

## 已知问题

```text
24h soak 未完成
市场 catalog 曾因上游重名冻结，现已恢复
CVE 未外部核验
审计锚定仍偏本地
没有 RBAC / 静态加密
OTLP 没有持久队列
```

## 发布前必须

```text
[ ] 24h soak completed
[ ] integrity ok
[ ] timeline true
[ ] npm test 全绿
[ ] build/validate 全绿
[ ] 迁移/回滚演练通过
[ ] tarball 可安装
[ ] CHANGELOG 更新
[ ] README 版本号更新
[ ] 已知问题写清楚
```

## 发布命令（完成后再执行）

```sh
npm version 2.0.0 --no-git-tag-version
npm test
node scripts/validate.mjs
npm pack --pack-destination dist
npm publish dist/dsh-blue-team-mode-2.0.0.tgz --tag latest --access public
git tag v2.0.0
```

## 不要做的事

```text
soak 没完成就发 latest
把 beta 说成正式稳定版
为了赶时间跳过迁移/回滚
```
