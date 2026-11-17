# 贡献指南

## 先读

```text
README.md
MAINTENANCE.md
HANDOFF.md
docs/architecture.md
docs/tool-map.md
docs/state-machines.md
docs/known-issues.md
```

## 开发

```bash
npm test
node scripts/build.mjs
node scripts/validate.mjs
node scripts/check-compliance.mjs --selftest
```

## 提交 PR

请包含：

```text
问题
复现方式
改动范围
测试结果
风险/回滚
```

不要：

```text
顺手重构整个 tools.js
改 timeline 哈希算法
改审批语义
把测试跳过
把“只告警”说成“已阻断”
```

## 新增工具

完整规则见 `docs/tool-map.md`。最少需要：

```text
名字 blue_<domain>_<verb>
参数 schema（required / 类型 / 描述）
错误处理和 safe()
engagementOf() 作用域
角色白名单 ALL_TOOLS / ROLE_TOOLS
写操作落 timeline
测试（成功/失败/越权）
README 工具数 + docs/tool-map.md
```

## 改状态机

完整规则见 `docs/state-machines.md`。最少需要：

```text
lib/judge.js 枚举/迁移
lib/store.js guard/时间戳
lib/plan.js 初始状态
lib/tools.js autopilot/审批
lib/ui.js + lib/client.js 文案/按钮
非法迁移测试
迁移/回滚测试
```

不要在 UI 或 tools 里复制迁移表。

## 新增数据表

需要：

```text
CREATE TABLE IF NOT EXISTS
索引
幂等迁移
CRUD
迁移测试
回滚测试
```

## 安全

不要公开贴利用细节。
使用 `SECURITY.md` 的方式报告。

## 许可

MIT。
提交即同意按 MIT 分发。
不要求 CLA。
