/**
 * 攻击面图谱：资产—CVE—发现的关系和风险分。
 *
 * 这是“已知资产上的潜在暴露”，不是漏洞验证：
 * CVE 匹配只按产品关键字，版本是否受影响仍是 unknown。
 */
import { CVE_PACK } from './cve-pack.js'
import { matchAssetToCves } from './cve-campaign.js'

const CRITICALITY_SCORE = { critical: 45, high: 30, medium: 15, low: 5 }
const SEVERITY_SCORE = { critical: 28, high: 18, medium: 9, low: 3, info: 1 }
const CVE_SCORE = { critical: 18, high: 12, medium: 6, low: 2 }

function riskLabel(score) {
  if (score >= 70) return 'critical'
  if (score >= 45) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

export function buildRiskGraph(store, engagementId) {
  const assets = store.queryAssets(engagementId, { limit: 1000 })
  const findings = store.listFindings(engagementId, { limit: 1000 }).filter((item) => item.status !== 'fixed' && item.status !== 'accepted')
  const cveById = new Map()
  const edges = []
  const graphAssets = assets.map((asset) => {
    const matches = matchAssetToCves(asset, CVE_PACK)
    const assetFindings = findings.filter((item) => item.asset_id === asset.id)
    let score = CRITICALITY_SCORE[asset.criticality] || 5
    for (const finding of assetFindings) score += SEVERITY_SCORE[finding.severity] || 0
    for (const cve of matches) {
      score += CVE_SCORE[cve.severity] || 0
      edges.push({ from: `asset:${asset.id}`, to: `cve:${cve.id}`, kind: 'potential_cve', version_verified: false })
    }
    score = Math.min(score, 100)
    const tags = Array.isArray(asset.tags) ? asset.tags : []
    const exposure = tags.some((tag) => /internet|public|external|对外/i.test(tag)) || ['web', 'api', 'vpn'].includes(asset.kind)
    for (const finding of assetFindings) {
      edges.push({ from: `asset:${asset.id}`, to: `finding:${finding.id}`, kind: 'has_finding' })
    }
    const cveIds = matches.map((cve) => cve.id)
    for (const cve of matches) {
      if (!cveById.has(cve.id)) {
        cveById.set(cve.id, {
          id: cve.id,
          title: cve.title,
          product: cve.product,
          severity: cve.severity,
          urgency: cve.urgency,
          asset_ids: [],
        })
      }
      cveById.get(cve.id).asset_ids.push(asset.id)
    }
    return {
      id: `asset:${asset.id}`,
      asset_id: asset.id,
      name: asset.name,
      kind: asset.kind,
      address: asset.address,
      criticality: asset.criticality,
      exposure,
      risk: score,
      risk_label: riskLabel(score),
      cve_ids: cveIds,
      findings_open: assetFindings.length,
    }
  }).sort((a, b) => b.risk - a.risk)

  const graphCves = Array.from(cveById.values()).sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 }
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
  })
  const summary = {
    assets: graphAssets.length,
    exposed_assets: graphAssets.filter((asset) => asset.exposure).length,
    cve_matches: graphCves.length,
    edges: edges.length,
    high_risk_assets: graphAssets.filter((asset) => asset.risk >= 45).length,
    unverified_matches: edges.filter((edge) => edge.kind === 'potential_cve').length,
  }
  return {
    ok: true,
    version_verified: false,
    summary,
    assets: graphAssets,
    cves: graphCves,
    edges,
    note: '风险分只用于排序；CVE 匹配基于资产名称/服务/tag，未验证版本，不能直接判定受影响的资产。',
  }
}
