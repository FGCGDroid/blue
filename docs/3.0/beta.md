# 3.0 beta 试用手册

> 版本：`3.0.0-beta.1`
> 状态：已装入当前桌面 profile；Host API 已在线。
> 数据：与 2.0 共用 `$DSH_HOME/blue/blue.db`；beta 会做 3.0 迁移，先备份再试。

## 已装内容

```text
profile：desktop
bundle：dsh-blue-team-mode@3.0.0-beta.1
Host API：/blue/api、/blue/v3/api
工具：76/76
控制台：复用 2.0 右侧栏 12 页签（通过 Host API）
预设：蓝色防御模式 + 6 个执行角色
```

## 试用步骤

1. 刷新 DSH 页面（右侧栏客户端要重新加载）。
2. 新建会话，预选 **“蓝队防御模式”**（不是普通默认预设）。
3. 在第一条工作指令前，回复四个字：

```text
防御自检
```

4. 自检通过后，按提示建立目标：

```text
blue_engagement_open
blue_preflight
blue_asset_add
```

5. 右侧栏打开蓝队控制台；12 个页签走 3.0 Host API。

## 已验证

```text
GET/POST /blue/api -> 200
overview.version = 3.0.0-beta.1
skills = 19
report_markdown 可生成
当前事实库已有目标/资产/告警可读
```

## 注意

```text
未自检：除 blue_session_info / blue_preflight / blue_defense_selfcheck 外全部拒绝
高风险任务：pending_approval，人工批准后才 queued
response：默认 manual，不自动执行隔离/封禁
report.write / evidence 落盘还没接
decoy_create 必须显式 deployed=true/false，不再默认 planned
3.0 仍不接 cordis.patch.yml；beta 通过安装包挂载
```

反馈修复记录见 [`beta-fixes.md`](beta-fixes.md)。

## 回滚

先备份：

```text
$DSH_HOME/blue/blue.db
$DSH_HOME/blue/blue.db-wal
$DSH_HOME/blue/blue.db-shm
```

回滚到 2.0：

```text
plugin_manager remove_bundle dsh-blue-team-mode
安装 dist/dsh-blue-team-mode-2.0.0.tgz
重启 DSH
```

3.0 迁移可能新增表/列；回滚前必须保留备份，不要直接拿旧二进制开新库。

## 反馈重点

```text
右侧栏 12 页签有没有空页/报错
审批按钮是否能走通
告警转任务、任务完成回写告警
报告/证据导出
73 个工具里哪一个报错
```
