# 贡献指南

## 先读

```text
README.md
MAINTENANCE.md
HANDOFF.md
docs/architecture.md
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

需要：

```text
参数 schema
错误处理
角色白名单
测试
README/文档
工具数更新
```

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
