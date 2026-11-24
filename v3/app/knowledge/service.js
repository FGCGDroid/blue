/** 打法知识库用例：从告警学习签名，并自动落检测/防御任务。 */
import { createHash } from 'node:crypto'
import { TECHNIQUES } from '../../domain/gateway/techniques.js'

const HANDLING_TEXT = {
  block: '网关直接拦',
  reduce: '降低可利用面',
  detect: '规则能发现',
  owner: '要站点自己改',
  na: '网关管不了',
}

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
const DECOY_PATHS = [/^\/\.env$/i, /^\/\.git\/config$/i, /^\/server-status$/i, /^\/phpinfo$/i, /^\/download$/i, /^\/wp-admin(\/|$)/i, /^\/administrator(\/|$)/i]
function isDecoyPath(path) { return DECOY_PATHS.some((re) => re.test(path)) }

export function learnAlert(store, engagementId, alert, options = {}) {
  const event = eventOf(alert)
  const decoy = isDecoyPath(String(event.path || '').split('?')[0])
  const learned = store.knowledge.observe(engagementId, event, decoy
    ? { auto_block: false, title: '诱饵命中：' + String(event.path || ''), defense: { action: 'observe', summary: '诱饵/蜜罐命中，不生成泄露或封禁规则' } }
    : { auto_block: false })
  if (decoy || !learned.created || options.auto === false) return { ...learned, decoy }
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

/**
 * 把《攻击方法全集》M01–M32 作为内置基线推进打法库。
 *
 * 幂等：重复调用不新增、不累加 hits；只同步标题/说明。
 * 这些是“打法知识”，不是“本机发生过攻击”，所以 hits 保持 0。
 */
export function seedTechniqueLibrary(store, engagementId) {
  let created = 0
  let updated = 0
  for (const item of TECHNIQUES) {
    const handling = HANDLING_TEXT[item.handling] || item.handling
    const result = store.knowledge.seed(engagementId, {
      signature: `tech:${item.id}`,
      kind: 'technique',
      title: `【内置】${item.id} ${item.name}`,
      attack: `分类：${item.category}；处理：${handling}（${item.where}）；说明：${item.note}`,
      defense: {
        action: item.handling,
        summary: `${item.id} ${handling}：${item.note}`,
        technique: item.id,
        where: item.where,
      },
    })
    if (result.created) created += 1
    else if (result.unchanged === false) updated += 1
  }
  return {
    ok: true,
    total: TECHNIQUES.length,
    created,
    updated,
    note: '内置打法基线来自 docs/3.0/attack-methods.md；hits 只统计真实告警，不会把基线当攻击。',
  }
}

/** 为一条知识生成低风险防御任务；不自动改主机/防火墙。 */
export function defendEntry(store, engagementId, id) {
  const entry = store.knowledge.get(id)
  if (entry === null) return null
  if (entry.defense?.action === 'na') {
    return {
      entry,
      task: null,
      note: '这条打法不经过网关（侦察/离线/流程类），生成防御任务没有意义；看说明即可。',
    }
  }
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
