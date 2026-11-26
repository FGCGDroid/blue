#!/usr/bin/env node
/**
 * 生成 3.0 M0 契约向量。
 *
 * 只从 2.0 读取行为，不修改 2.0：
 *   lib/judge.js      状态迁移
 *   lib/store.js      timeline 哈希
 *   lib/plan.js       风险分级
 *   lib/tools.js      66 个工具 catalog
 *   lib/evidence.js   证据包 fixture
 *
 * 生成后由 scripts/parity.mjs 校验。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BlueStore } from '../lib/store.js'
import { TASK_STATUSES, TASK_STATUS, TERMINAL_TASK_STATUSES, OPEN_TASK_STATUSES, ACTIVE_TASK_STATUSES, canTransitionTask } from '../lib/judge.js'
import { inferRisk, initialStatusForRisk } from '../lib/plan.js'
import { apply as applyTools } from '../lib/tools.js'
import { ROLE_TOOLS } from '../lib/playbooks.js'
import { buildEvidenceBundle } from '../lib/evidence.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VECTORS = join(ROOT, 'test', 'vectors')
const FIXTURES = join(ROOT, 'test', 'fixtures')

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function stateVector() {
  const transitions = []
  for (const from of TASK_STATUSES) {
    for (const to of TASK_STATUSES) {
      transitions.push({ from, to, allowed: canTransitionTask(from, to) })
    }
  }
  return {
    schema: 'dsh-blue-v3/state@1',
    note: '同状态迁移返回 true，是 2.0 的既有语义；不是新允许的边。',
    statuses: TASK_STATUSES,
    terminal: TERMINAL_TASK_STATUSES,
    open: OPEN_TASK_STATUSES,
    active: ACTIVE_TASK_STATUSES,
    transitions,
  }
}

function timelineVector() {
  const rows = [
    {
      engagement_id: 'ENG-TEST',
      at: '2026-01-01T00:00:00.000Z',
      actor: 'tester',
      action: 'engagement_open',
      target: 'example.test',
      detail: 'fixture',
    },
    {
      engagement_id: 'ENG-TEST',
      at: '2026-01-01T00:00:01.000Z',
      actor: 'tester',
      action: 'note',
      target: 'task-1',
      detail: 'chain step 2',
    },
    {
      engagement_id: 'ENG-TEST',
      at: '2026-01-01T00:00:02.000Z',
      actor: 'tester',
      action: 'approval',
      target: 'task-1',
      detail: 'decision=approved risk=high',
    },
  ]

  const dir = mkdtempSync(join(tmpdir(), 'blue-vec-timeline-'))
  const store = new BlueStore(dir)
  try {
    let prev = ''
    const chain = rows.map((row) => {
      const expected = store.timelineHash(row, prev)
      const item = { row, prev_hash: prev, expected_hash: expected }
      prev = expected
      return item
    })
    return {
      schema: 'dsh-blue-v3/timeline@1',
      note: 'prev_hash 为空串时按 "" 参与哈希；与 2.0 BlueStore.timelineHash 一致。',
      chain,
    }
  } finally {
    store.close()
    rmSync(dir, { recursive: true, force: true })
  }
}

function riskVector() {
  const cases = [
    { id: 'r01', input: { role: 'ir', title: '隔离主机 10.0.0.5' }, expected_risk: 'high', expected_status: TASK_STATUS.PENDING_APPROVAL },
    { id: 'r02', input: { role: 'ir', title: '查看告警日志' }, expected_risk: 'medium', expected_status: TASK_STATUS.QUEUED },
    { id: 'r03', input: { role: 'hardening', title: '修改防火墙规则' }, expected_risk: 'high', expected_status: TASK_STATUS.PENDING_APPROVAL },
    { id: 'r04', input: { role: 'hardening', title: '检查防火墙规则并给出建议' }, expected_risk: 'medium', expected_status: TASK_STATUS.QUEUED },
    { id: 'r05', input: { role: 'monitor', title: '确认日志接入' }, expected_risk: 'low', expected_status: TASK_STATUS.QUEUED },
    { id: 'r06', input: { role: 'hunt', title: '查找 WebShell 痕迹' }, expected_risk: 'low', expected_status: TASK_STATUS.QUEUED },
    { id: 'r07', input: { role: 'monitor', title: '例行检查', risk_level: 'high' }, expected_risk: 'high', expected_status: TASK_STATUS.PENDING_APPROVAL },
    { id: 'r08', input: { role: 'ir', title: '隔离主机', risk_level: 'low' }, expected_risk: 'high', expected_status: TASK_STATUS.PENDING_APPROVAL },
    { id: 'r09', input: { role: 'ir', title: '删除可疑文件' }, expected_risk: 'high', expected_status: TASK_STATUS.PENDING_APPROVAL },
    { id: 'r10', input: { role: 'intel', title: '整理 IOC 清单' }, expected_risk: 'low', expected_status: TASK_STATUS.QUEUED },
  ]
  return {
    schema: 'dsh-blue-v3/risk@1',
    note: '只用 2.0 inferRisk 计算；3.0.0 不允许改判定。',
    cases: cases.map((item) => ({
      ...item,
      actual_risk: inferRisk(item.input),
      actual_status: initialStatusForRisk(inferRisk(item.input)),
    })),
  }
}

function pathVector() {
  const policy = {
    id: 'default',
    version: 1,
    default_action: 'allow',
    case_insensitive: true,
    max_path_length: 4096,
    reject_semicolon: true,
    protected: [
      { id: 'admin', prefix: '/admin', action: 'block', allow: ['/admin/login'] },
    ],
    deny: [
      { id: 'git', prefix: '/.git', action: 'block' },
      { id: 'svn', prefix: '/.svn', action: 'block' },
      { id: 'env', prefix: '/.env', action: 'block' },
      { id: 'server-status', prefix: '/server-status', action: 'block' },
      { id: 'actuator-env', prefix: '/actuator/env', action: 'block' },
      { id: 'actuator-heapdump', prefix: '/actuator/heapdump', action: 'block' },
      { id: 'pprof', prefix: '/debug/pprof', action: 'block' },
    ],
  }

  const vectors = [
    ['p01', '/admin', 'block', '/admin', 'PROTECTED_PREFIX'],
    ['p02', '/admin/', 'block', '/admin', 'PROTECTED_PREFIX'],
    ['p03', '//admin', 'block', '/admin', 'PROTECTED_PREFIX'],
    ['p04', '/./admin', 'block', null, 'DOT_SEGMENT'],
    ['p05', '/foo/../admin', 'block', null, 'DOT_SEGMENT'],
    ['p06', '/%61dmin', 'block', '/admin', 'PROTECTED_PREFIX'],
    ['p07', '/%2e%2e/admin', 'block', null, 'DOT_SEGMENT'],
    ['p08', '/%252e%252e/admin', 'block', null, 'DOUBLE_ENCODED'],
    ['p09', '/admin%2f..%2fpublic', 'block', null, 'ENCODED_SEPARATOR'],
    ['p10', '/ADMIN', 'block', '/ADMIN', 'PROTECTED_PREFIX'],
    ['p11', '/admin;foo', 'block', null, 'MATRIX_PARAM'],
    ['p12', '/admin%00', 'block', null, 'CONTROL_CHAR'],
    ['p13', '/admin%09', 'block', null, 'CONTROL_CHAR'],
    ['p14', '/admin%0d%0a', 'block', null, 'CONTROL_CHAR'],
    ['p15', '/admin\\..\\public', 'block', null, 'BACKSLASH'],
    ['p16', 'http://host/admin', 'block', '/admin', 'PROTECTED_PREFIX'],
    ['p17', '/../admin', 'block', null, 'DOT_SEGMENT'],
    ['p18', '/%c0%ae%c0%ae/admin', 'block', null, 'BAD_UTF8'],
    ['p19', '/admin.', 'block', null, 'SUSPICIOUS_SEGMENT'],
    ['p20', '/admin%20', 'block', null, 'SUSPICIOUS_SEGMENT'],
    ['p21', '/public', 'allow', '/public', 'DEFAULT_ALLOW'],
    ['p22', '/public/%2e', 'block', null, 'DOT_SEGMENT'],
    ['p23', '/administrator', 'allow', '/administrator', 'DEFAULT_ALLOW'],
    ['p24', '/admin/login', 'allow', '/admin/login', 'ALLOW_RULE'],
    ['p25', '/.git/config', 'block', '/.git/config', 'DENY_RULE'],
    ['p26', '/.GIT/config', 'block', '/.GIT/config', 'DENY_RULE'],
    ['p27', '/server-status', 'block', '/server-status', 'DENY_RULE'],
    ['p28', '/actuator/env', 'block', '/actuator/env', 'DENY_RULE'],
    ['p29', '/debug/pprof/heap', 'block', '/debug/pprof/heap', 'DENY_RULE'],
    ['p30', '/admin%2Flogin', 'block', null, 'ENCODED_SEPARATOR'],
    ['p31', '/admin/login/../secret', 'block', null, 'DOT_SEGMENT'],
    ['p32', '/admin//login', 'allow', '/admin/login', 'ALLOW_RULE'],
    ['p33', '/%2e/admin', 'block', null, 'DOT_SEGMENT'],
    ['p34', '/admin/%2e%2e/public', 'block', null, 'DOT_SEGMENT'],
    ['p35', '/admin%5c..%5cpublic', 'block', null, 'ENCODED_SEPARATOR'],
    ['p36', '/admin?x=1', 'block', '/admin', 'PROTECTED_PREFIX'],
    ['p37', '/admin#frag', 'block', null, 'FRAGMENT'],
    ['p38', '/', 'allow', '/', 'DEFAULT_ALLOW'],
    ['p39', '', 'block', null, 'EMPTY'],
    ['p40', 'admin', 'block', null, 'NOT_ORIGIN_FORM'],
  ]

  return {
    schema: 'dsh-blue-v3/path@1',
    authority: '3.0-contract',
    note: '这是 3.0 的对抗契约，不是 2.0 行为快照；2.0 只检查 %2e/%2f、点段、//、NUL。',
    policy,
    vectors: vectors.map(([id, input, decision, canonical, reason]) => ({
      id,
      input,
      expect: { decision, canonical, reason },
    })),
  }
}

function toolsVector() {
  const definitions = []
  const ctx = {
    blueTeam: {},
    tools: { register(definition) { definitions.push(definition) } },
    effect(fn) { fn() },
    get() { return null },
    logger: { info() {}, warn() {} },
  }
  applyTools(ctx, { profile: 'all', requireSelfCheck: false })

  const tools = definitions
    .map((definition) => ({
      name: definition.name,
      parameters: definition.parameters,
      output_schema: definition.output && definition.output.schema ? definition.output.schema : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    schema: 'dsh-blue-v3/tools@1',
    note: '只冻结名称、参数 schema、输出 type；描述可以改。',
    count: tools.length,
    roles: Object.fromEntries(Object.entries(ROLE_TOOLS).map(([role, list]) => [role, list.length])),
    tools,
  }
}

function evidenceFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'blue-vec-evidence-'))
  const store = new BlueStore(dir)
  try {
    const engagement = store.openEngagement('3.0 证据向量', ['https://example.test'], 'synthetic fixture')
    store.addAsset(engagement.id, {
      kind: 'host',
      name: 'web-01',
      address: '10.0.0.5',
      port: 443,
      criticality: 'high',
      service: 'https',
    })
    store.addAlert(engagement.id, {
      title: 'fixture alert',
      severity: 'high',
      source: 'fixture',
      raw: '{"event":"synthetic"}',
    })
    store.addFinding(engagement.id, {
      title: 'fixture finding',
      severity: 'high',
      category: 'webshell',
      evidence: 'synthetic evidence',
      recommendation: 'remove',
    })
    store.createTask(engagement.id, {
      role: 'ir',
      title: '隔离主机 10.0.0.5',
      brief: 'synthetic high risk task',
      risk_level: 'high',
    })
    store.addTimeline(engagement.id, {
      actor: 'tester',
      action: 'note',
      target: 'fixture',
      detail: 'synthetic timeline',
    })
    const bundle = buildEvidenceBundle(store, engagement.id, { actor: 'tester' })
    writeJson(join(FIXTURES, 'evidence-bundle.json'), bundle)
    return { schema: bundle.schema, digest: bundle.digest, key_id: bundle.signature.key_id }
  } finally {
    store.close()
    rmSync(dir, { recursive: true, force: true })
  }
}

writeJson(join(VECTORS, 'state.json'), stateVector())
writeJson(join(VECTORS, 'timeline.json'), timelineVector())
writeJson(join(VECTORS, 'risk.json'), riskVector())
writeJson(join(VECTORS, 'path.json'), pathVector())
writeJson(join(VECTORS, 'tools.json'), toolsVector())
const evidence = evidenceFixture()

console.log('✓ 3.0 M0 向量已生成')
console.log('  state:    49 条迁移')
console.log('  timeline: 3 条链')
console.log('  risk:     10 条')
console.log('  path:     40 条')
console.log(`  tools:    66 个（roles=${Object.keys(ROLE_TOOLS).length}）`)
console.log(`  evidence: ${evidence.digest.slice(0, 16)}… key=${evidence.key_id}`)
