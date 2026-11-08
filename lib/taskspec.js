/**
 * TaskSpec：控制台和 autopilot 共用的任务书结构。
 *
 * 同一份 spec 渲染 markdown（人看）和 JSON（子智能体/审计吃），
 * 不再让控制台和派发器各自拼一套散文。
 */

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function parseJson(value, fallback) {
  if (typeof value !== 'string' || value === '') return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export const TASK_SPEC_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://dsh.local/blue/task-spec.schema.json',
  title: 'Blue Team TaskSpec',
  type: 'object',
  additionalProperties: false,
  required: [
    'task_id', 'role', 'title', 'priority', 'risk_level', 'requires_approval',
    'scope', 'constraints', 'expected_output', 'acceptance', 'brief',
  ],
  properties: {
    task_id: { type: 'string', minLength: 1 },
    role: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    priority: { enum: ['P0', 'P1', 'P2', 'P3'] },
    risk_level: { enum: ['low', 'medium', 'high'] },
    requires_approval: { type: 'boolean' },
    approved_by: { type: ['string', 'null'] },
    approved_at: { type: ['string', 'null'] },
    scope: { type: 'string' },
    constraints: { type: 'array', items: { type: 'string' } },
    expected_output: { type: 'object' },
    acceptance: { type: 'string' },
    brief: { type: 'string' },
    asset_id: { type: ['string', 'null'] },
    alert_id: { type: ['string', 'null'] },
  },
})

const DEFAULT_CONSTRAINTS = Object.freeze({
  low: ['read-only', 'record-evidence', 'do-not-exfiltrate'],
  medium: ['read-only-unless-approved', 'record-before-change', 'rollback-plan'],
  high: ['human-approved', 'preserve-evidence', 'least-privilege', 'rollback-plan'],
})

export function validateTaskSpec(spec) {
  const errors = []
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) throw new Error('TaskSpec 必须是对象')
  for (const key of TASK_SPEC_SCHEMA.required) {
    if (!(key in spec)) errors.push('缺少 ' + key)
  }
  for (const key of Object.keys(spec)) {
    if (!(key in TASK_SPEC_SCHEMA.properties)) errors.push('未知字段 ' + key)
  }
  if (typeof spec.task_id !== 'string' || spec.task_id === '') errors.push('task_id 非法')
  if (typeof spec.role !== 'string' || spec.role === '') errors.push('role 非法')
  if (typeof spec.title !== 'string' || spec.title === '') errors.push('title 非法')
  if (!['P0', 'P1', 'P2', 'P3'].includes(spec.priority)) errors.push('priority 非法')
  if (!['low', 'medium', 'high'].includes(spec.risk_level)) errors.push('risk_level 非法')
  if (typeof spec.requires_approval !== 'boolean') errors.push('requires_approval 非法')
  if (!Array.isArray(spec.constraints) || spec.constraints.some((item) => typeof item !== 'string')) errors.push('constraints 非法')
  if (spec.expected_output === null || typeof spec.expected_output !== 'object' || Array.isArray(spec.expected_output)) errors.push('expected_output 非法')
  if (typeof spec.acceptance !== 'string' || typeof spec.brief !== 'string') errors.push('acceptance/brief 非法')
  if (errors.length > 0) throw new Error('TaskSpec 校验失败：' + errors.join('; '))
  return spec
}

export function buildTaskSpec(task) {
  const risk = task.risk_level || 'low'
  const constraints = parseJson(task.constraints, null)
  const expected = parseJson(task.expected_output, null)
  return validateTaskSpec({
    task_id: task.id,
    role: task.role,
    title: task.title,
    priority: task.priority,
    risk_level: risk,
    requires_approval: Boolean(task.requires_approval),
    approved_by: task.approved_by || null,
    approved_at: task.approved_at || null,
    scope: asText(task.scope),
    constraints: Array.isArray(constraints) && constraints.length > 0 ? constraints : [...DEFAULT_CONSTRAINTS[risk] ?? DEFAULT_CONSTRAINTS.low],
    expected_output: expected && typeof expected === 'object' && !Array.isArray(expected) && Object.keys(expected).length > 0
      ? expected
      : { table: 'tasks', task_id: task.id, fields: ['status', 'result', 'note'] },
    acceptance: asText(task.acceptance),
    brief: asText(task.brief),
    asset_id: task.asset_id || null,
    alert_id: task.alert_id || null,
  })
}

export function taskSpecJson(spec) {
  return JSON.stringify(spec, null, 2)
}

export function renderTaskMarkdown(spec, rolePrompt = '') {
  const lines = []
  if (rolePrompt) lines.push(rolePrompt, '')
  lines.push(`【任务】${spec.title}`)
  lines.push(`【任务 ID】${spec.task_id}`)
  lines.push(`【优先级】${spec.priority}`)
  lines.push(`【风险等级】${spec.risk_level}${spec.requires_approval ? '（需人工审批）' : ''}`)
  if (spec.approved_by) lines.push(`【审批】${spec.approved_by} @ ${spec.approved_at || ''}`)
  lines.push(`【范围】${spec.scope || '按本场 scope 与任务说明'}`)
  lines.push('')
  lines.push('【任务说明】')
  lines.push(spec.brief || '（无补充说明，按角色职责执行）')
  lines.push('')
  lines.push('【约束】')
  for (const constraint of spec.constraints) lines.push(`- ${constraint}`)
  lines.push('')
  lines.push('【期望产出】')
  lines.push('```json')
  lines.push(taskSpecJson(spec.expected_output))
  lines.push('```')
  lines.push('')
  if (spec.acceptance) {
    lines.push('【验收标准】')
    lines.push(spec.acceptance)
    lines.push('')
  }
  lines.push('【硬约束】')
  lines.push('- 只做本任务；需要别的角色/权限时写 `needs:`，不要越权。')
  lines.push('- 所有结论必须用 blue_* 工具落库；没落库 = 没发生。')
  lines.push('- 证据优先：命令、原始日志、请求/响应、文件路径与哈希。')
  lines.push('- 高风险动作必须先有 approval；不要绕过控制台审批。')
  lines.push('- 你是叶子节点，没有委派工具；不要给用户直接发消息。')
  lines.push('')
  lines.push('【回报格式】')
  lines.push('1. 结论（已证实/高度可能/线索）')
  lines.push('2. 证据（路径/命令/哈希/时间）')
  lines.push('3. 落库 id（asset/alert/finding/ioc/task）')
  lines.push('4. 未解决项与建议下一步')
  lines.push('needs: role=<...>; tool=<...>; access=<...>（没有写 none）')
  return lines.join('\n')
}

export function renderTaskSpec(task, rolePrompt = '') {
  return {
    spec: buildTaskSpec(task),
    markdown: renderTaskMarkdown(buildTaskSpec(task), rolePrompt),
    json: taskSpecJson(buildTaskSpec(task)),
  }
}
