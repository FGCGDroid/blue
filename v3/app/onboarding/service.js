/** 面向“有服务器但不会防御”的入门向导（M5.1）。 */
import { BlueError } from '../../domain/shared/errors.js'
import { ADVISORY_PATHS } from '../../domain/gateway/policy.js'
import { techniqueCoverage } from '../../domain/gateway/techniques.js'
import { seedTechniqueLibrary } from '../knowledge/service.js'

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
  let knowledge = null
  try {
    knowledge = seedTechniqueLibrary(store, engagement.id)
  } catch (error) {
    knowledge = { ok: false, error: error?.message ?? String(error) }
  }
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
    { key: 'logging', title: '让系统看到日志', why: '没有日志就只能事后猜', action: '不用填路径：本机网关/ctf_lab 会自动接；远程服务器需要装采集器' },
    { key: 'backup', title: '备份并演练恢复', why: '被删/被加密时能回滚', action: '至少保留一份离线备份' },
  ]
  return {
    engagement: { id: engagement.id, name: engagement.name, scope: engagement.scope },
    asset,
    checklist,
    knowledge,
    next_actions: [
      '先完成“只开放必要端口”和“管理入口强口令”两项',
      '把这台服务器的访问日志接入 blue_telemetry',
      '每周跑一次 blue_protect action=status 看有没有新风险',
    ],
    note: '已建立防护档案；当前没有远程探测，不会假装服务器安全或已加固。',
  }
}

function isLoopbackHost(host) {
  const value = String(host || '').toLowerCase()
  return value === '127.0.0.1' || value === 'localhost' || value === '::1' || value === '[::1]'
}

export function targetLabel(raw) {
  return targetInfo(raw).display
}

/**
 * 一键真实防守：本机目标先起进程内网关，再把资产指向网关入口。
 * 远程目标不自动起网关，避免把无关主机当上游。
 */
export async function startProtectionWithGateway(store, manager, input = {}) {
  const info = targetInfo(input.target)
  const gatewayPort = Number(input.gateway_port) || 18787
  if (!manager || typeof manager.start !== 'function' || !isLoopbackHost(info.host) || input.gateway === false
    || Number(info.port) === gatewayPort) {
    return { ...startProtection(store, input), gateway: null }
  }
  let upstream
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(info.address) ? info.address : `http://${info.address}`)
    upstream = url.origin
  } catch {
    upstream = `http://${info.address}`
  }
  const started = await manager.start({ upstream, port: gatewayPort })
  const result = startProtection(store, {
    ...input,
    target: started.url + '/',
    name: input.name || `保护 ${info.display}`,
  })
  let telemetry = null
  try {
    telemetry = store.telemetry.addSource(result.engagement.id, {
      name: 'gateway-decisions',
      kind: 'jsonl',
      path: started.log_path,
    })
  } catch (error) {
    telemetry = { error: error?.message ?? String(error) }
  }
  return { ...result, gateway: started, direct_target: info.address, telemetry }
}

function assetLooksLocal(assets) {
  return (Array.isArray(assets) ? assets : []).some((asset) => {
    try {
      const host = new URL(String(asset.address || '')).hostname
      return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]'
    } catch {
      return false
    }
  })
}

export function protectionStatus(store, engagementId) {
  const engagement = store.engagements.get(engagementId)
  if (engagement === null) throw new BlueError('ENGAGEMENT_NOT_FOUND', '防护目标不存在：' + engagementId)
  const stats = store.engagements.stats(engagementId)
  const telemetry = store.telemetry.listSources(engagementId)
  const assets = store.facts.queryAssets(engagementId, { limit: 50 })
  const local = assetLooksLocal(assets)
  const openAlerts = Number(stats.alerts_open || 0)
  let headline = '还没看到日志'
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
  if (telemetry.length === 0) {
    next.push(local
      ? '日志还没找到：确认服务在写日志；本机网关和 ctf_lab 会自动接，不用填路径'
      : '日志在远程服务器上，不在本机；先装采集器，或把 access.log 放到本机')
  }
  if (openAlerts > 0) next.push(`有 ${openAlerts} 条未处理告警，先看告警页`)
  if (next.length === 0) next.push('日志已自动接入，有异常会直接出现在告警里')
  const coverage = techniqueCoverage()
  next.push(`常见 ${coverage.total} 种打法：网关直接拦 ${coverage.blocked} 种，${coverage.owner} 种要站点自己改`)
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
    attack_coverage: {
      total: coverage.total,
      blocked: coverage.blocked,
      reduced: coverage.reduced,
      detected: coverage.detected,
      owner: coverage.owner,
      not_applicable: coverage.not_applicable,
      note: coverage.note,
    },
    advisories: ADVISORY_PATHS.map((item) => ({ path: item.prefix, why: item.why })),
    next_actions: next,
    note: '人话结论只基于已接入的事实；没有日志/探测时不会写“安全”。',
  }
}
