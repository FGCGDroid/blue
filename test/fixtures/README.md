# test/fixtures

这里放 3.0 的固定样本。

## evidence-bundle.json

由 2.0 `buildEvidenceBundle` 生成，用于验证：

```text
schema 仍是 dsh-blue-evidence/v1
digest / Ed25519 签名可验
timeline 完整性为 ok
```

它包含合成数据，不含真实资产、凭据或个人数据。  
`generated_at` 是生成时间，重新生成会改变 digest 和 signature。

重新生成：

```bash
node scripts/generate-vectors.mjs
```

只在有意更新证据契约时重生成，不要为了让测试通过而覆盖。
