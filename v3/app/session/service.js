/** 3.0 session 用例：建立/关闭目标、预检。 */
import { BlueError } from '../../domain/shared/errors.js'

export function openEngagement(store, { name, scope, note } = {}) {
  const engagement = store.engagements.open(name, scope, note)
  return {
    engagement: { ...engagement, stats: store.engagements.stats(engagement.id) },
    scope_assets: 0,
    note: '已绑定到本会话；子智能体会继承。scope 资产自动导入待 M5。',
  }
}

export function closeEngagement(store, engagementId) {
  const engagement = store.engagements.close(engagementId)
  return { engagement, note: '目标已关闭；历史数据保留，不再作为 active 目标自动选中。' }
}

export function preflightReport(store, tools = {}) {
  let integrity = 'unknown'
  try {
    const row = store.db.sql('PRAGMA integrity_check').get()
    integrity = row ? String(Object.values(row)[0]) : 'unknown'
  } catch {
    integrity = 'unknown'
  }
  const registered = Number(tools.registered ?? 0)
  const planned = Number(tools.planned ?? 0)
  const channels = [
    {
      id: 'tools',
      available: registered > 0,
      detail: `${registered}/${planned} 个工具已注册`,
    },
    {
      id: 'host_api',
      available: true,
      detail: '/blue/api 与 /blue/v3/api（2.0 控制台兼容）',
    },
    {
      id: 'gateway',
      available: false,
      detail: '独立进程；preflight 不启动网关，需要单独运行 v3/gateway.js',
    },
    {
      id: 'telemetry',
      available: true,
      detail: '只支持 JSONL 文件源；OTLP 未接',
    },
    {
      id: 'evidence_anchor',
      available: true,
      detail: '本地 Ed25519 锚点 + file/https sink',
    },
    {
      id: 'subagent',
      available: null,
      detail: '由 DSH subagent 服务决定；autopilot M4 只登记 dispatched，不自动拉起',
    },
  ]
  return {
    ok: integrity === 'ok',
    node: process.version,
    platform: process.platform,
    db: {
      root: store.root,
      schema_version: store.schemaVersion,
      integrity,
    },
    tools: { planned, registered },
    channels,
    missing: channels.filter((item) => item.available === false).map((item) => item.id),
    checks: {
      self_check_required: true,
      gateway_optional: true,
      external_anchor_optional: true,
    },
    note: '未检查真实安全工具链；这里只验证工具契约、事实库和可用通道。',
  }
}

export function assertSelfCheckPhrase(phrase) {
  if (String(phrase ?? '').trim() !== '防御自检') {
    throw new BlueError('SELF_CHECK_PHRASE', '开局自检短语不正确：请让用户明确回复「防御自检」')
  }
}
