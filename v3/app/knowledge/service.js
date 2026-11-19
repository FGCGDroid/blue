/** 打法知识库用例：从告警学习签名，并自动落检测/防御任务。 */
import { createHash } from 'node:crypto'

function parseRaw(alert) {
  const raw = typeof alert.raw === 'string' ? alert.raw.trim() : ''
  if (raw.startsWith('{')) {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

function eventOf(alert) {
  const raw = parseRaw(alert)
  return {
    ...raw,
    path: raw.path || raw.url || raw.canonical_path || raw.raw_path || raw.request_uri || '',
    method: raw.method || raw.http_method || 'GET',
    status: raw.status ?? raw.status_code ?? raw.http_status ?? (raw.decision === 'block' ? 403 : 0),
    title: alert.title,
    rule_key: raw.rule_key || raw.rule_id || raw.rule || '',
  }
}

/**
 * 学习一条告警。新签名会自动：
 *  1. 进入知识库；
 *  2. 生成一条检测规则（不直接改主机）；
 *  3. 生成一条 queued 防御任务（低风险，供人/智能体执行）。
 * 不自动改防火墙、不自动封 IP；阻断路径需要网关在链路上。
 */
export function learnAlert(store, engagementId, alert, options = {}) {
  const event = eventOf(alert)
  const learned = store.knowledge.observe(engagementId, event, { auto_block: false })
  if (!learned.created || options.auto === false) return learned
  const entry = learned.entry
  const path = String(event.path || '').split('?')[0]
  const status = Number(event.status || 0)
  let rule = null
  try {
    if (path !== '') {
      rule = store.detection.upsert(engagementId, {
        rule_key: `kb-${entry.id.slice(3, 15).toLowerCase()}`,
        title: `知识库：${entry.title}`,
        severity: alert.severity === 'critical' ? 'critical' : 'high',
        selection: { path: [path], ...(status > 0 ? { status: [status] } : {}) },
        condition: 'all',
        tags: ['knowledge', 'auto'],
      })
    }
  } catch { /* 规则冲突不阻塞学习 */ }
  return { ...learned, rule }
}

export function knowledgeRuleKey(entryId) {
  return `kb-${createHash('sha256').update(String(entryId)).digest('hex').slice(0, 12)}`
}

/** 为一条知识生成低风险防御任务；不自动改主机/防火墙。 */
export function defendEntry(store, engagementId, id) {
  const entry = store.knowledge.get(id)
  if (entry === null) return null
  const task = store.tasks.create(engagementId, {
    role: 'hardening',
    priority: entry.defense?.action === 'block_path' ? 'P1' : 'P2',
    risk_level: 'low',
    title: `知识库防御：${entry.title}`.slice(0, 120),
    brief: [
      `签名：${entry.signature}`,
      `动作：按知识库建议，人工确认后执行。`,
      '只读确认；动作需人工批准。',
    ].join('\n'),
    acceptance: '确认误报与业务影响，给出可回滚动作。',
  })
  return { entry, task }
}
