#!/usr/bin/env node
/**
 * 3.0 M3 路径契约测试。
 *
 * 直接跑 test/vectors/path.json 的 40 条：
 *   normalize -> evaluatePolicy
 * 不启动网关、不读 body。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeRequestPath } from '../v3/domain/gateway/normalize.js'
import { validatePolicy, evaluatePolicy, policyHash } from '../v3/domain/gateway/policy.js'
import { inspectSmuggling } from '../v3/domain/gateway/headers.js'
import { inspectContent } from '../v3/domain/gateway/content.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vector = JSON.parse(readFileSync(join(ROOT, 'test', 'vectors', 'path.json'), 'utf8'))
const policy = validatePolicy(vector.policy)

assert.equal(vector.vectors.length, 40)

for (const item of vector.vectors) {
  const normalized = normalizeRequestPath(item.input, policy)
  let actual
  if (!normalized.ok) {
    actual = { decision: 'block', canonical: null, reason: normalized.reason }
  } else {
    const verdict = evaluatePolicy(normalized.canonical, policy)
    actual = { decision: verdict.decision, canonical: normalized.canonical, reason: verdict.reason }
  }
  assert.deepEqual(actual, item.expect, `${item.id} input=${JSON.stringify(item.input)}`)
}

assert.equal(policyHash(policy), policyHash(validatePolicy(vector.policy)))
assert.throws(
  () => validatePolicy({ ...vector.policy, version: 2 }),
  (error) => error.code === 'POLICY_INVALID',
)
assert.throws(
  () => validatePolicy({ ...vector.policy, protected: [{ id: 'root', prefix: '/', action: 'block' }] }),
  (error) => error.code === 'POLICY_INVALID',
)
assert.throws(
  () => validatePolicy({
    ...vector.policy,
    protected: [
      { id: 'a', prefix: '/a', action: 'block', allow: ['/b/x'] },
    ],
  }),
  (error) => error.code === 'POLICY_INVALID',
)

assert.equal(inspectSmuggling(['content-length', '1', 'content-length', '2']).reason, 'SMUGGLING')
assert.equal(inspectSmuggling(['content-length', '1', 'transfer-encoding', 'chunked']).reason, 'SMUGGLING')
assert.equal(inspectSmuggling(['content-length', 'abc']).reason, 'SMUGGLING')
assert.equal(inspectSmuggling(['content-length', '1']), null)

assert.equal(
  inspectContent({ headers: { authorization: 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.' } }).reason,
  'jwt-none',
)
assert.equal(
  inspectContent({ headers: { 'content-type': 'application/json' }, body: '{"__proto__":{"admin":true}}' }).reason,
  'prototype-pollution',
)

console.log(`✓ v3 路径契约通过（${vector.vectors.length} 条；policy=${policyHash(policy)}）`)
