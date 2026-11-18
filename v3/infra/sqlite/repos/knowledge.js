/** 攻击打法知识库仓储（M5.1）。 */
import { createHash } from 'node:crypto'
import { asText } from './shared.js'
import { signatureOf } from '../../../domain/knowledge/signature.js'

function idOf(engagementId, signature) {
  return `KB-${createHash('sha256').update(`${engagementId}|${signature}`).digest('hex').slice(0, 16).toUpperCase()}`
}

function pathOf(event = {}) {
  const raw = asText(event.path || event.url || event.http?.path || event.raw_path).trim()
  return raw.split('?')[0].split('#')[0]
}

function methodOf(event = {}) {
  return asText(event.method || event.http?.method || 'GET').toUpperCase()
}

function statusOf(event = {}) {
  const value = Number(event.status ?? event.status_code ?? event.http?.status ?? event.http?.status_code)
  return Number.isFinite(value) ? value : 0
}

/** 把具体请求折成可复用的打法签名；数字段归一，避免 ID 爆炸。 */
export { signatureOf }

function defaultDefense(signature, event = {}) {
  const path = pathOf(event)
  if (/(^|\/)\.env($|\/)|(^|\/)\.git($|\/)|(^|\/)\.svn($|\/)/i.test(path)) {
    return { action: 'block_path', summary: '固定敏感文件路径：网关直接拒绝，不转发到上游', reversible: true }
  }
  if (/^\/(admin|manage|console|wp-admin|phpmyadmin|actuator)/i.test(path)) {
    return { action: 'block_path', summary: '管理入口按策略阻断；如业务需要，先加 allow 再放行', reversible: true }
  }
  if (statusOf(event) === 401 || statusOf(event) === 403) {
    return { action: 'detect', summary: '登录/权限失败：保留检测并聚合，不直接封禁可伪造来源', reversible: true }
  }
  return { action: 'detect', summary: '先加检测规则，确认业务影响后再阻断', reversible: true }
}

export class KnowledgeRepo {
  constructor(db, timeline = null) {
    this.db = db
    this.timeline = timeline
  }

  list(engagementId, filters = {}) {
    const clauses = ['engagement_id = ?']
    const params = [engagementId]
    if (typeof filters.status === 'string' && filters.status !== '') {
      clauses.push('status = ?')
      params.push(filters.status)
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 200, 1), 1000)
    return this.db.sql(`SELECT * FROM knowledge_entries WHERE ${clauses.join(' AND ')} ORDER BY last_seen DESC LIMIT ?`)
      .all(...params, limit).map((row) => this.toEntry(row))
  }

  get(id) {
    const row = this.db.sql('SELECT * FROM knowledge_entries WHERE id = ?').get(asText(id))
    return row === undefined ? null : this.toEntry(row)
  }

  match(engagementId, event) {
    const signature = signatureOf(event)
    const row = this.db.sql('SELECT * FROM knowledge_entries WHERE engagement_id = ? AND signature = ?')
      .get(engagementId, signature)
    return row === undefined ? null : this.toEntry(row)
  }

  /**
   * 观测到一次攻击：没有就学习，有就累加。返回 created 供上层决定是否自动建防御任务。
   */
  observe(engagementId, event = {}, options = {}) {
    const signature = asText(options.signature).trim() || signatureOf(event)
    const existing = this.db.sql('SELECT * FROM knowledge_entries WHERE engagement_id = ? AND signature = ?')
      .get(engagementId, signature)
    const at = new Date().toISOString()
    if (existing !== undefined) {
      this.db.sql('UPDATE knowledge_entries SET hits = hits + 1, last_seen = ?, updated_at = ? WHERE id = ?')
        .run(at, at, existing.id)
      return { entry: this.get(existing.id), created: false }
    }
    const id = idOf(engagementId, signature)
    const defense = options.defense || defaultDefense(signature, event)
    const title = asText(options.title).trim() || `打法：${signature}`
    const attack = asText(options.attack).trim() || asText(event.title || event.rule_key || '').slice(0, 500)
    this.db.sql(`INSERT INTO knowledge_entries
      (id, engagement_id, signature, kind, title, attack, defense, auto_block, hits, first_seen, last_seen, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
      .run(id, engagementId, signature, asText(options.kind, 'http'), title, attack, JSON.stringify(defense), options.auto_block === true ? 1 : 0, 1, at, at, at, at)
    if (this.timeline !== null) {
      this.timeline.append(engagementId, {
        actor: 'monitor',
        action: 'knowledge_learn',
        target: id,
        detail: signature,
      })
    }
    return { entry: this.get(id), created: true }
  }

  toEntry(row) {
    let defense = {}
    try { defense = JSON.parse(row.defense) } catch { defense = {} }
    return {
      id: row.id,
      signature: row.signature,
      kind: row.kind,
      title: row.title,
      attack: row.attack,
      defense,
      auto_block: Boolean(row.auto_block),
      hits: Number(row.hits),
      first_seen: row.first_seen,
      last_seen: row.last_seen,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }
}
