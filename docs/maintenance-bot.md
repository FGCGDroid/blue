# 维护巡检机器人

## 它做什么

每天自动检查：

```text
npm test
build
validate
DSH 兼容测试
npm pack --dry-run
npm latest
catalog versions
本地 soak 进度（如果存在）
```

结果：

```text
maintenance-report.md
maintenance-report.json
```

如果配置了 `GITHUB_TOKEN`，会创建/更新固定 issue：

```text
[maintenance] 每日巡检
```

## 它不做什么

```text
不发布 npm
不合并 PR
不改依赖
不自动升级 DSH
不触发别人的 workflow
不删除数据
```

## 工作流

```text
.github/workflows/maintenance.yml
```

时间：

```text
每天 01:00 UTC
= 北京时间 09:00
```

也可以手动：

```text
Actions → maintenance → Run workflow
```

## 本地运行

```bash
node scripts/maintenance-check.mjs
node scripts/maintenance-check.mjs --full
node scripts/maintenance-check.mjs --full --report .tmp/report.md
```

双击 Windows 巡检：

```text
scripts\maintenance-daily.cmd
```

如果要做每日计划任务，可在本机管理员终端执行一次：

```powershell
schtasks /Create /SC DAILY /ST 09:00 /TN "DSH Blue Maintenance" `
  /TR "C:\Users\86186\Desktop\蓝队防御插件\scripts\maintenance-daily.cmd"
```

注意：计划任务只在本机开机时运行；关机不补跑。

本机已创建计划任务：

```text
名称：DSH Blue Maintenance
时间：每天 09:00
模式：Interactive only（登录后运行）
```

下次运行：

```text
2026-11-16 09:00
```

GitHub workflow 的 `schedule` **只会在默认分支上触发**。  
当前 workflow 在 `2.0-dev` 工作分支时，需要手动 `workflow_dispatch`；合并到默认分支后才会每天自动跑。

带 issue：

```powershell
$env:GITHUB_TOKEN="..."
$env:GITHUB_REPOSITORY="FGCGDroid/blue"
node scripts/maintenance-check.mjs --full --issue
```

## 状态含义

```text
ok       版本/检查一致
warn     测试没问题，但 npm/catalog/soak 有差异
unknown  网络或本地状态拿不到
fail     测试/构建/打包失败
```

`warn` 不会让 CI 变红；`fail` 会。

## 典型报告

```text
npm latest=1.5.4 package=2.0.0-beta.32   warn
catalog=1.5.2 package=2.0.0-beta.32     warn
soak=2.53h/24h running                  warn
```

这不是故障，是提醒：

```text
beta 和 stable 本来就不是同一个版本
catalog 可能还没重建
soak 还没跑完
```

## 权限

工作流只需要：

```yaml
contents: read
issues: write
```

不需要：

```text
npm token
admin
actions: write
```
