/** 3.0 session 用例：建立/复用目标、预检。 */
import { BlueError } from '../../domain/shared/errors.js'

export function openEngagement(store, { name, scope, note } = {}) {
  const engagement = store.engagements.open(name, scope, note)
  return {
    engagement: { ...engagement, stats: store.engagements.stats(engagement.id) },
    scope_assets: 0,
    note: '已绑定到本会话；子智能体会继承。scope 资产自动导入在 M4.1 补。',
  }
}

export function preflightReport(store, tools = {}) {
  let integrity = 'unknown'
  try {
    const row = store.db.sql('PRAGMA integrity_check').get()
    integrity = row ? String(Object.values(row)[0]) : 'unknown'
  } catch {
    integrity = 'unknown'
  }
  return {
    ok: integrity === 'ok',
    node: process.version,
    platform: process.platform,
    db: {
      root: store.root,
      schema_version: store.schemaVersion,
      integrity,
    },
    tools: {
      planned: Number(tools.planned ?? 0),
      registered: Number(tools.registered ?? 0),
    },
    checks: {
      self_check_required: true,
      gateway_optional: true,
      external_anchor_optional: true,
    },
    note: '未检查真实安全工具链；M4.0 只验证工具契约与本地事实库。',
  }
}

export function assertSelfCheckPhrase(phrase) {
  if (String(phrase ?? '').trim() !== '防御自检') {
    throw new BlueError('SELF_CHECK_PHRASE', '开局自检短语不正确：请让用户明确回复「防御自检」')
  }
}
