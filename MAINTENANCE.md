# 维护手册

这个项目按“低频、可回滚、安全优先”的方式维护，不追求频繁发版。

## 维护原则

- 只做 patch / 小版本维护，不主动扩大攻击面。
- 不加入自动 root 防火墙、真实凭据收集、WebRTC/Canvas 指纹、心理恐吓、无限响应。
- 高风险动作继续走 `pending_approval`。
- 默认不部署诱饵；诱饵程序必须手动启动。
- 不加入隐蔽遥测。
- 每次发版必须有 CHANGELOG、测试和可回滚说明。

## 每次迭代流程

1. 检查仓库状态：

   ```powershell
   git status --short --branch
   git log --oneline -5
   ```

2. 跑测试：

   ```powershell
   node scripts/test-tools.mjs
   node scripts/test-ui.mjs
   node scripts/test-decoy-server.mjs
   node scripts/build.mjs
   node scripts/validate.mjs
   ```

3. 看 issue / 安全报告：

   ```text
   https://github.com/FGCGDroid/blue/issues
   https://github.com/FGCGDroid/blue/security/advisories
   ```

4. 只处理明确、可复现、低风险的问题。需求不明确时先不改。

5. 修改后更新：

   - `CHANGELOG.md`
   - 必要时 `README.md`
   - `package.json` 版本号

6. 发布前检查 npm 登录：

   ```powershell
   npm.cmd whoami
   npm.cmd view dsh-blue-team-mode version
   ```

7. 发布：

   ```powershell
   npm.cmd publish --access public
   ```

8. 创建 GitHub Release，tag 使用 `vX.Y.Z`。

9. 发布后清理：

   ```powershell
   del .npmrc
   ```

10. 确认：

   ```powershell
   npm.cmd view dsh-blue-team-mode version
   ```

## 版本策略

- 安全修复 / 小 bug：patch，例如 `1.3.2 → 1.3.3`
- 新工具 / 新能力：minor，例如 `1.3.x → 1.4.0`
- 破坏性变更：major，尽量不做

## 不自动做的事

- 不在无人确认时发布 major 版本
- 不自动合并市场 PR
- 不自动联系用户或警方
- 不自动执行封禁/隔离/删除
- 不在没有测试的情况下发布

## 给未来 Agent 的提示

用户说“继续迭代”时：

1. 先读 `AGENTS.md`、`SECURITY.md`、`CHANGELOG.md`。
2. 先跑全部测试。
3. 优先修安全和小 bug，不要主动加危险功能。
4. 没有 npm token 时，只做到 tarball 和 GitHub Release，不假装已发布。
5. 发布后报告：版本、测试、Release 链接、npm 最新版本。
