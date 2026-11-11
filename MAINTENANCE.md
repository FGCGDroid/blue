# 维护笔记

之前那份写得太像模板了，重写一版，按我自己的话来。

这项目一开始就是练手，后来真有人下载，那就别烂尾。但也没必要把自己搞成安全厂商，按下面的节奏来就行。

## 平时

不追版本号。没有安全问题、没有明确 bug，就不发版。小问题先记着，攒一攒，凑一个补丁版本再发。

每次动手前先看两样东西：

```powershell
git status --short --branch
node scripts/test-tools.mjs
```

测试过了再改。改完再跑：

```powershell
node scripts/test-ui.mjs
node scripts/test-decoy-server.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

## 发版

只发 patch 和小版本，不做大改。

改版本号，写 `CHANGELOG.md`，然后：

```powershell
npm.cmd whoami
npm.cmd publish --access public
```

发布后去 GitHub 建一个 `vX.Y.Z` 的 Release，把 CHANGELOG 里的内容贴过去。

最后把 `.npmrc` 删掉：

```powershell
del .npmrc
```

没有 token 就停在 tarball 和本地提交，别假装已经发了。

## 底线

这几条不改：

- 不做自动 root 封禁
- 不收集 Cookie、Authorization、WebRTC、Canvas、硬件指纹
- 不做全屏锁定、无限弹窗、心理恐吓
- 不做无限/10GB 响应
- 高风险动作继续人工审批
- 诱饵程序默认只监听本机，公开必须手动加参数
- 不加隐蔽遥测

## 有人提需求

先问一句：

> 这是通用防守需求，还是你那个环境特有的？

只做前者。后者让他自己写脚本，或者直接说不合适。

遇到“自动封禁所有 IP”“记录访问者指纹”“直接报警抓人”这种，直接拒绝，不用解释太多。

## 接手的人

先看 `AGENTS.md`、`SECURITY.md`、`CHANGELOG.md`，再跑测试。

优先修安全问题和小 bug，别主动加新能力。没有 token 就别碰发布。

用户说“继续迭代”的时候，做一轮检查就行，不用一次改太多。
