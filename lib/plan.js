/**
 * 任务规划（工具与控制台共用）。
 *
 * 规则：告警 → 高危发现 → 重点资产覆盖 → 基线缺口；
 * 同一标题未关闭前不重复创建，避免自主循环把队列刷爆。
 */

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function openTaskTitles(store, engagementId) {
  const rows = store.listTasks(engagementId, { limit: 1000 })
  const cutoff = Date.now() - 12 * 60 * 60 * 1000
  const map = new Map()
  for (const task of rows) {
    if (task.status === 'cancelled') continue
    if (task.status === 'done') {
      const at = Date.parse(task.updated_at)
      if (Number.isFinite(at) && at < cutoff) continue
    }
    map.set(task.title.trim().toLowerCase(), task)
  }
  return map
}

function createCandidate(store, engagementId, existing, candidates, input) {
  const title = asText(input.title).trim()
  if (title === '') return false
  const key = title.toLowerCase()
  if (existing.has(key)) return false
  existing.set(key, { id: 'pending' })
  candidates.push({ ...input, title })
  return true
}

export function planCandidates(store, engagementId) {
  const existing = openTaskTitles(store, engagementId)
  const candidates = []
  const alerts = store.listAlerts(engagementId, { limit: 200 })
    .filter((alert) => alert.status === 'open' || alert.status === 'investigating')
  for (const alert of alerts) {
    const role = alert.severity === 'critical' ? 'ir' : alert.severity === 'high' ? 'hunt' : 'monitor'
    createCandidate(store, engagementId, existing, candidates, {
      role,
      priority: alert.severity === 'critical' ? 'P0' : alert.severity === 'high' ? 'P1' : 'P2',
      title: `研判告警：${alert.title}`,
      brief: `告警 ${alert.id}（来源 ${alert.source || 'unknown'}，等级 ${alert.severity}）。\n原始内容：${String(alert.raw).slice(0, 1200)}\n先判真伪与影响面，再决定是否升级为事件。`,
      acceptance: '给出真阳性/假阳性结论与依据；真阳性必须落 finding 或升级 ir 任务。',
      alert_id: alert.id,
    })
  }

  const findings = store.listFindings(engagementId, { status: 'open', limit: 200 })
  for (const finding of findings) {
    if (finding.severity !== 'critical' && finding.severity !== 'high') continue
    const role = /webshell|rce|upload|deserial|injection|traversal/i.test(finding.category) ? 'ir' : 'hardening'
    createCandidate(store, engagementId, existing, candidates, {
      role,
      priority: finding.severity === 'critical' ? 'P0' : 'P1',
      title: `${role === 'ir' ? '处置' : '修复'}发现：${finding.title}`,
      brief: `发现 ${finding.id}（${finding.severity}/${finding.category}）。\n证据：${String(finding.evidence).slice(0, 1200)}\n建议：${finding.recommendation || '无'}`,
      acceptance: '完成处置或修复并回归验证；无法完成写清阻塞原因。',
    })
  }

  const assets = store.queryAssets(engagementId, { limit: 200 })
  const findingsByAsset = new Set(findings.map((finding) => finding.asset_id).filter(Boolean))
  for (const asset of assets) {
    if (asset.criticality !== 'critical' && asset.criticality !== 'high') continue
    if (findingsByAsset.has(asset.id)) continue
    createCandidate(store, engagementId, existing, candidates, {
      role: 'hunt',
      priority: asset.criticality === 'critical' ? 'P1' : 'P2',
      title: `重点资产失陷痕迹核查：${asset.name}`,
      brief: `资产 ${asset.id}（${asset.kind} ${asset.address || ''}${asset.port ? ':' + asset.port : ''} ${asset.service || ''}，等级 ${asset.criticality}）。\n检查暴露面、异常登录、WebShell、异常进程与外连。`,
      acceptance: '给出覆盖项与结论；发现异常落 finding，未发现也要写清查过什么。',
      asset_id: asset.id,
    })
  }

  if (assets.length === 0) {
    createCandidate(store, engagementId, existing, candidates, {
      role: 'monitor',
      priority: 'P1',
      title: '资产盘点与暴露面确认',
      brief: '梳理本场需要防守的域名/IP/端口/服务/后台，标注 critical/high，并全部 blue_asset_add 落库。',
      acceptance: '至少完成核心服务的资产清单；未确认的写清缺口。',
    })
  }
  if (store.listIocs(engagementId, { limit: 1 }).length === 0) {
    createCandidate(store, engagementId, existing, candidates, {
      role: 'intel',
      priority: 'P2',
      title: '建立本场 IOC 基线',
      brief: '从攻击告警/日志/样本中提取首批 IOC（源 IP、URL、哈希、WebShell 特征），标注来源与置信度。',
      acceptance: '至少 5 条可用 IOC，附检测写法与误报评估。',
    })
  }
  if (alerts.length === 0) {
    createCandidate(store, engagementId, existing, candidates, {
      role: 'monitor',
      priority: 'P2',
      title: '确认日志与告警接入',
      brief: '确认 Web/系统/安全设备日志是否可读、时间是否同步、关键字段是否齐全；给出缺口清单。',
      acceptance: '列出已接入与缺失的日志源，并给出补齐方式。',
    })
  }
  createCandidate(store, engagementId, existing, candidates, {
    role: 'hardening',
    priority: 'P3',
    title: '加固基线与暴露面核查',
    brief: '运行 blue_hardening_check；对高风险监听端口、防火墙、账号权限、SSH 配置给出整改项。',
    acceptance: '给出检查证据、风险分级与可回滚的整改建议。',
  })
  return candidates
}
