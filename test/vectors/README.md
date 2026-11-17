# test/vectors

3.0 M0 契约向量。说明见 `docs/3.0-contract.md`。

```text
state.json      2.0 状态迁移快照
timeline.json   2.0 timeline 哈希快照
risk.json       2.0 风险分级快照
tools.json      2.0 66 个工具契约
path.json       3.0 路径对抗契约
```

不要为了让测试通过而改 `expected`。  
重新生成：

```bash
node scripts/generate-vectors.mjs
```

校验：

```bash
node scripts/parity.mjs --engine=2.0
```
