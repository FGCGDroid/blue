/** 面向“有服务器但不会防御”的入门向导（M5.1）。 */
import { BlueError } from '../../domain/shared/errors.js'

function targetInfo(raw) {
  const value = String(raw || '').trim()
  if (value === '') throw new BlueError('PROTECT_TARGET', '请填写服务器 IP、域名或网址')
  let host = value
  let port = ''
  let address = value
  try {
    const url = new URL(value)
    host = url.hostname
    port = url.port
    address = url.toString()
  } catch {
    const withoutScheme = value.replace(/^[a-z]+:\/\//i, '').split('/')[0]
    const match = /^\[([^\]]+)\](?::(\d+))?$/.exec(withoutScheme) ?? /^([^:]+)(?::(\d+))?$/.exec(withoutScheme)
    host = match ? match[1] : withoutScheme.split(':')[0]
    port = match && match[2] ? match[2] : ''
    address = value
  }
  if (host === '') throw new BlueError('PROTECT_TARGET', '无法识别目标地址')
  return { host, port, display: port === '' ? host : `${host}:${port}`, address }
}

export function startProtection(store, input = {}) {
  const { host, display, address } = targetInfo(input.target)
  const name = String(input.name || `保护 ${display}`).trim()
  const kind = String(input.kind || 'web').trim()
  const engagement = store.engagements.open(name, [host], '通过“保护我的服务器”向导建立')
  const asset = store.facts.addAsset(engagement.id, {
    name: String(input.asset_name || display),
    address,
    kind,
    criticality: String(input.criticality || 'high'),
    tags: ['向导建立', '待接入日志'],
    evidence: 'blue_protect start：用户填写目标；尚未做远程探测，不伪造在线/漏洞结论。',
    actor: 'commander',
  })
  const checklist = [
    { key: 'exposure', title: '只开放必要端口', why: '公网只留 80/443 或业务端口，数据库/管理口不要直接暴露', action: '在服务器安全组/防火墙里限制来源' },
    { key: 'patch', title: '系统与组件补丁', why: '旧版本是入侵入口', action: '先查版本，再在维护窗口升级' },
    { key: 'auth', title: '管理入口强口令 + 二次验证', why: '弱口令和撞库最常见', action: '改强口令，能开 2FA 就开' },
    { key: 'logging', title: '把访问日志接进来', why: '没有日志就只能事后猜', action: '把 Nginx/Apache/应用日志放到 DSH 可读目录，再 blue_telemetry_source_add' },
    { key: 'backup', title: '备份并演练恢复', why: '被删/被加密时能回滚', action: '至少保留一份离线备份' },
  ]
  return {
    engagement: { id: engagement.id, name: engagement.name, scope: engagement.scope },
    asset,
    checklist,
    next_actions: [
      '先完成“只开放必要端口”和“管理入口强口令”两项',
      '把这台服务器的访问日志接入 blue_telemetry',
      '每周跑一次 blue_protect action=status 看有没有新风险',
    ],
    note: '已建立防护档案；当前没有远程探测，不会假装服务器安全或已加固。',
  }
}

export function protectionStatus(store, engagementId) {
  const engagement = store.engagements.get(engagementId)
  if (engagement === null) throw new BlueError('ENGAGEMENT_NOT_FOUND', '防护目标不存在：' + engagementId)
  const stats = store.engagements.stats(engagementId)
  const telemetry = store.telemetry.listSources(engagementId)
  const openAlerts = Number(stats.alerts_open || 0)
  let headline = '待接入日志'
  let level = 'setup'
  if (openAlerts > 0) {
    headline = '有风险，需要处理'
    level = 'risk'
  } else if (telemetry.length > 0 && Number(stats.assets || 0) > 0) {
    headline = '监控中'
    level = 'watching'
  } else if (Number(stats.assets || 0) === 0) {
    headline = '还没有登记资产'
    level = 'empty'
  }
  const next = []
  if (telemetry.length === 0) next.push('接入访问日志：把日志路径给我，或放到 $DSH_HOME/blue/logs/ 下')
  if (openAlerts > 0) next.push(`有 ${openAlerts} 条未处理告警，先看 blue_alert_list`)
  if (next.length === 0) next.push('保持日志接入，定期看告警即可')
  return {
    engagement: { id: engagement.id, name: engagement.name, scope: engagement.scope },
    headline,
    level,
    summary: {
      assets: Number(stats.assets || 0),
      alerts_open: openAlerts,
      tasks_open: Number(stats.tasks_active || 0) + Number(stats.tasks_queued || 0) + Number(stats.tasks_pending_approval || 0),
      telemetry_sources: telemetry.length,
    },
    next_actions: next,
    note: '人话结论只基于已接入的事实；没有日志/探测时不会写“安全”。',
  }
}
