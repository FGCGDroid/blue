# 发布流程（3.0）

> 最后更新：2026-11-26，对应 3.0.7
> **npm 已停用**：作者 npm 账号被封，无法登录和发布；3.x 只走 GitHub Release + jsDelivr。

## 当前发布状态

```text
稳定版：3.0.7
npm latest：2.0.0（冻结，不再更新）
GitHub Release：v3.0.7
更新分发：cdn.jsdelivr.net/gh/FGCGDroid/blue@vX.Y.Z/releases/*.tgz
分支：3.0-dev
```

## 分发方式

```text
1. GitHub Release 附件（留档、给人手动下载）
2. 仓库 releases/ 目录（同样的 tgz，供 jsDelivr 直接读）
```

`objects.githubusercontent.com` 在部分网络不可达，所以**更新按钮不走 Release 下载域名**，只走 jsDelivr。

## 发版步骤

```bash
# 1. 改版本号（package.json）与 update.json
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='3.0.8';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"

# 2. 构建
BLUE_VERSION=3.0.8 node scripts/build-v3-beta.mjs

# 3. 放进仓库（jsDelivr 从这里读）
mkdir -p releases
cp dist/dsh-blue-team-mode-3.0.8.tgz releases/

# 4. 改 update.json（version / url / asset，asset 指向新 tag）
# 5. 提交、打 tag、推送
git add -A && git commit -m "release: 3.0.8"
git tag v3.0.8
git push && git push origin v3.0.8

# 6. GitHub Release（可选但建议留档）
gh release create v3.0.8 --title "v3.0.8" --notes "..." "dist/dsh-blue-team-mode-3.0.8.tgz"
```

## 更新按钮的工作方式

```text
检查：GET api.github.com/repos/FGCGDroid/blue/releases/latest（60 秒缓存）
比较：tag 与当前版本
下载：cdn.jsdelivr.net/gh/FGCGDroid/blue@v<tag>/releases/dsh-blue-team-mode-<tag>.tgz
安装：dsh plugin --profile desktop add <下载文件>
重启：由用户手动重启 DSH（不做自动重启，避免 Windows 文件占用导致崩溃）
```

## 发布前检查

```bash
node scripts/test-tools.mjs
node scripts/test-ui.mjs
node scripts/validate.mjs
node scripts/build.mjs
```

## 版本号规则

```text
文档/元数据：patch
兼容性修复：patch
新功能：minor
破坏性变更：major
```

## 回滚

```bash
# 安装上一个 tag 的 tgz
dsh plugin --profile desktop add \
  https://cdn.jsdelivr.net/gh/FGCGDroid/blue@v3.0.6/releases/dsh-blue-team-mode-3.0.6.tgz
```

数据回滚（2.0 → 3.0 迁移）：

```bash
node node_modules/dsh-blue-team-mode/scripts/rollback-v3.mjs
```

## 不要做的事

```text
不要 npm publish（账号不可用）
不要把 tgz 传到 GitHub Release 后只给 Release 链接（国内下载域名超时）
不要跳过 update.json 与 tag（更新按钮按 tag 拼地址）
```
