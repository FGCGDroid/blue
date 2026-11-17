#!/usr/bin/env node
/**
 * 3.0 M0 parity 基线。
 *
 * 默认对 2.0 跑：
 *   node scripts/parity.mjs --engine=2.0
 *
 * 现在只校验 2.0 行为与向量一致。3.0 的路径/工具尚未实现，
 * --engine=3.0 会明确报告未实现，不会假装通过。
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BlueStore } from '../lib/store.js'
import { canTransitionTask } from '../lib/judge.js'
import { inferRisk, initialStatusForRisk } from '../lib/plan.js'
import { apply as applyTools } from '../lib/tools.js'
import { ROLE_TOOLS } from '../lib/playbooks.js'
import { verifyEvidenceBundle } from '../lib/evidence.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VECTORS = join(ROOT, 'test', 'vectors')
const FIXTURES = join(ROOT, 'test', 'fixtures')

const failures = []

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function fail(message) {
  failures.push(message)
}

function checkState() {
  const vector = readJson(join(VECTORS, 'state.json'))
  for (const item of vector.transitions) {
    const actual = canTransitionTask(item.from, item.to)
    if (actual !== item.allowed) {
      fail(`state: ${item.from} -> ${item.to} 期望 ${item.allowed}，实际 ${actual}`)
    }
  }
  return `state: ${vector.transitions.length} 条`
}

function checkTimeline() {
  const vector = readJson(join(VECTORS, 'timeline.json'))
  const dir = mkdtempSync(join(tmpdir(), 'blue-parity-timeline-'))
  const store = new BlueStore(dir)
  try {
    for (let index = 0; index < vector.chain.length; index += 1) {
      const item = vector.chain[index]
      const actual = store.timelineHash(item.row, item.prev_hash)
      if (actual !== item.expected_hash) {
        fail(`timeline[${index}]: 期望 ${item.expected_hash}，实际 ${actual}`)
      }
    }
  } finally {
    store.close()
    rmSync(dir, { recursive: true, force: true })
  }
  return `timeline: ${vector.chain.length} 条`
}

function checkRisk() {
  const vector = readJson(join(VECTORS, 'risk.json'))
  for (const item of vector.cases) {
    const risk = inferRisk(item.input)
    const status = initialStatusForRisk(risk)
    if (risk !== item.expected_risk) {
      fail(`risk ${item.id}: 期望 ${item.expected_risk}，实际 ${risk}`)
    }
    if (status !== item.expected_status) {
      fail(`risk ${item.id}: 状态期望 ${item.expected_status}，实际 ${status}`)
    }
  }
  return `risk: ${vector.cases.length} 条`
}

function captureTools() {
  const definitions = []
  const ctx = {
    blueTeam: {},
    tools: { register(definition) { definitions.push(definition) } },
    effect(fn) { fn() },
    get() { return null },
    logger: { info() {}, warn() {} },
  }
  applyTools(ctx, { profile: 'all', requireSelfCheck: false })
  return definitions
    .map((definition) => ({
      name: definition.name,
      parameters: definition.parameters,
      output_schema: definition.output && definition.output.schema ? definition.output.schema : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function checkTools() {
  const vector = readJson(join(VECTORS, 'tools.json'))
  const actual = captureTools()
  if (actual.length !== vector.count) {
    fail(`tools: 期望 ${vector.count} 个，实际 ${actual.length} 个`)
  }
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(vector.tools)
  if (actualJson !== expectedJson) {
    fail('tools: 工具 catalog 与向量不一致（名称/参数/输出 schema）')
  }
  for (const [role, count] of Object.entries(vector.roles)) {
    const actualCount = ROLE_TOOLS[role] ? ROLE_TOOLS[role].length : -1
    if (actualCount !== count) {
      fail(`tools role ${role}: 期望 ${count}，实际 ${actualCount}`)
    }
  }
  return `tools: ${actual.length} 个`
}

function checkPath() {
  const vector = readJson(join(VECTORS, 'path.json'))
  if (!Array.isArray(vector.vectors) || vector.vectors.length !== 40) {
    fail(`path: 期望 40 条，实际 ${vector.vectors ? vector.vectors.length : 0}`)
  }
  const ids = new Set()
  for (const item of vector.vectors || []) {
    if (!item.id || ids.has(item.id)) fail(`path: id 重复或缺失 ${item.id}`)
    ids.add(item.id)
    if (!item.expect || !item.expect.decision || !item.expect.reason) {
      fail(`path ${item.id}: 缺少 expect.decision / expect.reason`)
    }
    if (item.expect.decision === 'allow' && typeof item.expect.canonical !== 'string') {
      fail(`path ${item.id}: allow 必须有 canonical`)
    }
  }
  if (!vector.policy || !Array.isArray(vector.policy.protected)) {
    fail('path: 缺少 policy.protected')
  }
  return `path: ${vector.vectors ? vector.vectors.length : 0} 条（契约，不执行）`
}

function checkEvidence() {
  const bundle = readJson(join(FIXTURES, 'evidence-bundle.json'))
  const result = verifyEvidenceBundle(bundle)
  if (!result.ok) {
    fail(`evidence: 验签失败 ${result.reason || ''}`)
  }
  if (bundle.schema !== 'dsh-blue-evidence/v1') {
    fail(`evidence: schema 异常 ${bundle.schema}`)
  }
  if (typeof bundle.digest !== 'string' || bundle.digest.length !== 64) {
    fail('evidence: digest 不是 64 位十六进制')
  }
  if (!bundle.integrity || !bundle.integrity.timeline || bundle.integrity.timeline.ok !== true) {
    fail('evidence: timeline 完整性不是 ok')
  }
  return `evidence: ${bundle.digest.slice(0, 12)}…`
}

const engineArg = process.argv.find((arg) => arg.startsWith('--engine='))
const engine = engineArg ? engineArg.slice('--engine='.length) : '2.0'

if (engine === '3.0') {
  console.error('✗ 3.0 engine 尚未实现：路径/工具/证据生成在 M3/M4，当前只支持 --engine=2.0')
  process.exitCode = 2
} else if (engine !== '2.0') {
  console.error(`✗ 未知 engine：${engine}`)
  process.exitCode = 2
} else {
  const lines = [
    checkState(),
    checkTimeline(),
    checkRisk(),
    checkTools(),
    checkPath(),
    checkEvidence(),
  ]
  if (failures.length > 0) {
    for (const message of failures) console.error('✗ ' + message)
    console.error(`parity 失败：${failures.length} 项`)
    process.exitCode = 1
  } else {
    for (const line of lines) console.log('✓ ' + line)
    console.log('✓ 2.0 parity 基线通过')
  }
}
