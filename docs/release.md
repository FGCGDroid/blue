# 发布流程

## 当前发布状态

```text
稳定版：1.5.4
npm latest：1.5.4
GitHub Release：v1.5.4
实验版：2.0.0-beta.32（本地，未发 npm）
市场 catalog：可能仍显示 1.5.2
```

## 分支

```text
main                默认分支，1.5.x 稳定线
release/1.5.4       1.5.4 稳定提交
2.0-dev             2.0 beta
automation/maintenance  巡检脚本
```

1.5.x 和 2.0 不要强行合并。  
它们的数据模型和工具数不同。

## 版本号

```text
稳定：1.5.x
测试：2.0.0-beta.x
```

规则：

```text
文档/元数据：patch
兼容性修复：patch
新功能：minor（稳定线）
破坏性变更：major（2.0）
```

## 发布前

```bash
npm test
node scripts/build.mjs
node scripts/validate.mjs
node scripts/check-compliance.mjs --selftest
npm pack --dry-run
```

稳定线还要：

```bash
node scripts/test-tools.mjs
node scripts/test-ui.mjs
```

## 稳定版发布

```bash
# 在稳定 worktree
npm pack --pack-destination dist
npm publish dist/dsh-blue-team-mode-<version>.tgz --tag latest --access public
```

然后：

```text
git tag v<version>
GitHub Release（非 prerelease）
上传 tarball
```

## beta 发布

```bash
npm publish dist/dsh-blue-team-mode-<beta>.tgz --tag beta --access public
```

要求：

```text
latest 不动
GitHub Release 标记 prerelease
说明里写清实验性
```

## GitHub Release

```text
tag: v1.5.4
name: v1.5.4 — ...
asset: dsh-blue-team-mode-1.5.4.tgz
prerelease: false
```

beta：

```text
tag: v2.0.0-beta.32
prerelease: true
```

## 市场 catalog

市场版本不是 `main` 的 YAML 直接给的。

链路：

```text
data/plugins/*.yml（描述）
→ npm 探测
→ data/npm-map.json
→ docs/index.json
→ dsh-plugin-catalog
→ 市场
```

所以：

```text
改 YAML ≠ 改版本
发 npm ≠ 市场立刻更新
```

更新需要：

```text
awesome-dsh-plugin 的 Build site from README
probe_all=true
skip_probes=false
```

没有 admin 权限时：

```text
等每日/每周 catalog 构建
```

## 回滚

### npm

```text
npm dist-tag add dsh-blue-team-mode@1.5.3 latest
```

### GitHub

```text
删除/标记 Release
回退 tag 指针
发布修复版
```

### 数据

发布前备份：

```text
$DSH_HOME/blue/blue.db
$DSH_HOME/blue/soak-*.json
```

迁移只加不删。  
回滚时恢复备份并重新打开旧版本。

## 凭据

需要：

```text
GitHub: maintain/admin
npm: qiuhe 的 maintainer 或 automation token
市场 catalog: awesome-dsh-plugin admin
```

不需要：

```text
把 token 写进仓库
把 token 写进 issue
把 token 写进聊天
```

## 发布检查表

```text
[ ] 版本号正确
[ ] CHANGELOG 有对应条目
[ ] README 链接指向新版本
[ ] npm test 全绿
[ ] build/validate 全绿
[ ] tarball 能安装
[ ] latest/beta tag 正确
[ ] GitHub Release 资产上传
[ ] 市场 catalog 已重建或已知滞后
[ ] 回滚版本可用
```

## 一句话

> 发布不是“推上去”，是“能装、能回滚、市场知道、用户不误解”。
