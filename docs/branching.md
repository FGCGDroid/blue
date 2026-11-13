# 分支约定

## `main`

稳定线。

- 只放已验证的稳定版本
- 当前 npm `latest` 对应 `1.5.2`
- 不直接承载 2.0 开发提交

## `2.0-dev`

2.0 开发集成分支。

- 只接收**经过测试**的 2.0 提交
- 推送前至少跑：

```text
npm test
node scripts/validate.mjs
node scripts/check-compliance.mjs --selftest
```

- 手工冒烟：安装 tarball、重启 DSH、打开控制台、确认版本号
- 不从这里直接发 npm `latest`
- 不 force push
- 发 beta 前单独打 tag，并由人确认

## 发布线

```text
main          → 1.5.x stable
2.0-dev       → 2.0 beta 集成
v2.0.0-beta.* → 经过验证的 beta tag
```

稳定版仍然从 `main` 出；2.0 稳定前不合并回 `main`。
