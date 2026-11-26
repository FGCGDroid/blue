#!/usr/bin/env node
/**
 * 3.0 M3.5 外锚 sink 测试。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStoreV3 } from '../v3/store.js'
import { anchorAndPush } from '../v3/app/evidence/anchor.js'
import { pushAnchor, pushToSinks } from '../v3/infra/evidence/anchor-sink.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-anchor-'))
let store

try {
  store = new BlueStoreV3(root)
  const engagementId = 'ENG-ANCHOR'
  store.facts.addAsset(engagementId, { kind: 'host', name: 'anchor-host', address: '10.0.0.9' })

  const filePath = join(root, 'anchors.jsonl')
  const anchored = await anchorAndPush(store, engagementId, [{ kind: 'file', path: filePath }], {
    actor: 'tester',
    push: pushToSinks,
  })
  assert.equal(anchored.ok, true)
  assert.equal(anchored.pushed, true)
  assert.equal(anchored.anchor.head.length, 64)
  assert.ok(anchored.anchor.signature)
  assert.ok(anchored.anchor.public_key)

  const lines = readFileSync(filePath, 'utf8').trim().split('\n')
  assert.equal(lines.length, 1)
  const pushed = JSON.parse(lines[0])
  assert.equal(pushed.head, anchored.anchor.head)
  assert.equal(pushed.key_id, anchored.anchor.key_id)
  assert.equal(store.evidenceRepo.verify(engagementId).ok, true)

  const httpSink = await pushAnchor({ kind: 'https', url: 'http://example.test/anchors', allow_hosts: ['example.test'] }, pushed)
  assert.equal(httpSink.ok, false)

  const ipSink = await pushAnchor({ kind: 'https', url: 'https://127.0.0.1/anchors', allow_hosts: ['127.0.0.1'] }, pushed)
  assert.equal(ipSink.ok, false)

  const noAllow = await pushAnchor({ kind: 'https', url: 'https://example.test/anchors' }, pushed)
  assert.equal(noAllow.ok, false)

  const mixed = await pushToSinks([
    { kind: 'file', path: join(root, 'anchors-2.jsonl') },
    { kind: 'https', url: 'http://example.test/x', allow_hosts: ['example.test'] },
  ], pushed)
  assert.equal(mixed.length, 2)
  assert.equal(mixed[0].ok, true)
  assert.equal(mixed[1].ok, false)

  const noSink = await anchorAndPush(store, engagementId, [])
  assert.equal(noSink.pushed, false)
  assert.ok(noSink.anchor.id)

  console.log('✓ v3 外锚通过：file sink/白名单校验/混合失败不阻塞')
} finally {
  if (store) store.close()
  rmSync(root, { recursive: true, force: true })
}
