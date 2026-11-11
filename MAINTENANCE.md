# 维护笔记

这玩意儿本来就是我随手做着玩的，谁知道真有人下。那就别烂尾，但也没必要把自己搞成安全厂商，差不多就行。

平时不用天天盯着。没安全问题、没明确 bug，就别发版。小毛病先记着，攒一攒，哪天有空了打个补丁一起发。

真动手之前先看下工作区，再跑个测试：

```powershell
git status --short --branch
node scripts/test-tools.mjs
```

测试过了再改。改完把剩下的也跑一遍：

```powershell
node scripts/test-ui.mjs
node scripts/test-decoy-server.mjs
node scripts/build.mjs
node scripts/validate.mjs
```

发版也别整太复杂。改版本号，写 `CHANGELOG.md`，然后：

```powershell
npm.cmd whoami
npm.cmd publish --access public
```

发完去 GitHub 建个 `vX.Y.Z` 的 Release，把更新内容贴上去。最后把 `.npmrc` 删了：

```powershell
del .npmrc
```

没 token 就停在这，别假装已经发了。

几条东西别加，加了就是给自己找事：

- 自动 root 封禁
- 收集 Cookie、Authorization、WebRTC、Canvas、硬件指纹
- 全屏锁定、无限弹窗、心理恐吓
- 无限响应、10GB 垃圾数据
- 绕过人工审批的高危动作
- 偷偷上报的遥测

诱饵程序默认只能听本机，想公开就自己手动加参数。高风险动作还是得人点批准，别图省事。

有人提需求，先问一句：

> 这是通用需求，还是你那个环境特有的？

通用的可以看看，特殊的让他自己写脚本。遇到“自动封所有 IP”“记录指纹”“直接报警抓人”这种，直接拒绝，不用解释太多。

我要是没空，就先放着。项目又不会跑，没必要因为有人下载就把自己逼成 7×24 客服。

以后想继续弄，就跟我说“继续迭代”，我跑一遍测试，看看有没有该修的小问题，没事就不硬发版。
