/** 3.0 CVE 防御包用例（M4.3）。 */
import { BlueError } from '../../domain/shared/errors.js'
import { cveSummary, getCve, listCves, scanCveText } from '../../domain/cve/pack.js'
import { createTask } from '../tasks/service.js'

export function pack(input = {}) {
  const includeActions = input.include_actions !== false
  if (String(input.id || '').trim() !== '') {
    const item = getCve(input.id)
    if (item === null) throw new BlueError('CVE_NOT_FOUND', 'CVE 不在当前防御包：' + input.id)
    return {
      verified: false,
      advisory: includeActions ? item : { ...item, patterns: undefined, actions: undefined },
    }
  }
  const items = listCves({ query: input.query, product: input.product })
  return {
    verified: false,
    summary: cveSummary(),
    items: items.map((item) => includeActions
      ? item
      : { id: item.id, title: item.title, product: item.product, severity: item.severity, urgency: item.urgency }),
  }
}

export function scan(text, options = {}) {
  const result = scanCveText(text, options)
  return {
    ...result,
    note: '启发式特征只说明日志里出现相关字样，不证明漏洞已被利用；低置信命中单独放在 weakHits，默认不计入 matched。',
  }
}

function assetMatches(asset, item) {
  const haystack = [asset.name, asset.address, asset.service, ...(asset.tags || [])].join(' ').toLowerCase()
  return haystack.includes(String(item.product || '').toLowerCase())
}

export function campaign(store, engagementId, input = {}) {
  const assets = store.facts.queryAssets(engagementId, { limit: 1000 })
  const selectedAssets = input.asset
    ? assets.filter((asset) => asset.id === input.asset || asset.name === input.asset)
    : assets
  const cves = input.cve ? [getCve(input.cve)].filter(Boolean) : listCves()
  if (input.cve && cves.length === 0) throw new BlueError('CVE_NOT_FOUND', 'CVE 不在当前防御包：' + input.cve)

  const matches = []
  for (const asset of selectedAssets) {
    for (const item of cves) {
      if (!assetMatches(asset, item)) continue
      matches.push({ asset, cve: item })
    }
  }
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 100)
  const created = []
  if (input.create === true) {
    for (const match of matches.slice(0, limit)) {
      const result = createTask(store, engagementId, {
        role: 'hardening',
        priority: match.cve.severity === 'critical' ? 'P0' : match.cve.severity === 'high' ? 'P1' : 'P2',
        title: `CVE 核查：${match.cve.id} / ${match.asset.name}`,
        brief: `${match.cve.title}\n资产：${match.asset.name} (${match.asset.address || '无地址'})\n${match.cve.summary}`,
        acceptance: '确认版本/补丁状态，给出升级或缓解证据；未验证前不要声称已修复。',
        asset_id: match.asset.id,
        risk_level: 'medium',
        actor: 'commander',
      })
      created.push(result.task)
    }
  }
  return {
    ok: true,
    assets: selectedAssets.length,
    cves: cves.length,
    matches: matches.length,
    created: created.length,
    tasks: created,
    planned: matches.slice(0, limit).map((match) => ({
      asset_id: match.asset.id,
      asset: match.asset.name,
      cve: match.cve.id,
      title: match.cve.title,
      severity: match.cve.severity,
      urgency: match.cve.urgency,
    })),
    note: '只按资产名/服务/tag 做启发式匹配，未验证版本；create=true 也只建核查任务，不执行补丁或隔离。',
  }
}
