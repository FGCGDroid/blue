/** 3.0 攻击面覆盖/图谱（M4.3）。 */
const TECHNIQUES = [
  { id: 'T1190', tactic: 'Initial Access', name: 'Exploit Public-Facing Application', rule: 'web-attack' },
  { id: 'T1059', tactic: 'Execution', name: 'Command and Scripting Interpreter', rule: 'webshell-command' },
  { id: 'T1505', tactic: 'Persistence', name: 'Server Software Component', rule: 'webshell-file' },
  { id: 'T1078', tactic: 'Defense Evasion', name: 'Valid Accounts', rule: 'login-failure' },
  { id: 'T1110', tactic: 'Credential Access', name: 'Brute Force', rule: 'bruteforce' },
  { id: 'T1046', tactic: 'Discovery', name: 'Network Service Discovery', rule: 'scanner' },
  { id: 'T1595', tactic: 'Reconnaissance', name: 'Active Scanning', rule: 'scanner' },
  { id: 'T1071', tactic: 'Command and Control', name: 'Application Layer Protocol', rule: 'c2-beacon' },
  { id: 'T1041', tactic: 'Exfiltration', name: 'Exfiltration Over C2 Channel', rule: 'data-exfil' },
  { id: 'T1486', tactic: 'Impact', name: 'Data Encrypted for Impact', rule: 'ransomware' },
]

const RULE_ALIASES = {
  'builtin-http-401-403': ['T1110', 'T1078'],
  'builtin-auth-path': ['T1190', 'T1078'],
  'builtin-windows-logon-fail': ['T1110'],
  'builtin-webshell-file': ['T1505'],
  'builtin-scanner': ['T1046', 'T1595'],
  'web-attack': ['T1190'],
  'login-failure': ['T1078'],
  'bruteforce': ['T1110'],
  'scanner': ['T1046', 'T1595'],
  'webshell-file': ['T1505'],
  'webshell-command': ['T1059'],
  'c2-beacon': ['T1071'],
  'data-exfil': ['T1041'],
  'ransomware': ['T1486'],
}

export function attackCoverage(rules = []) {
  const ruleKeys = new Set((Array.isArray(rules) ? rules : []).map((rule) => rule.rule_key || rule.id || rule))
  const covered = TECHNIQUES.filter((item) => {
    if (ruleKeys.has(item.rule)) return true
    return Array.from(ruleKeys).some((key) => (RULE_ALIASES[key] || []).includes(item.id))
  }).map((item) => ({
    ...item,
    has_rule: true,
    matched_rules: Array.from(ruleKeys).filter((key) => key === item.rule || (RULE_ALIASES[key] || []).includes(item.id)),
    rule: undefined,
  }))
  const gaps = TECHNIQUES.filter((item) => !covered.some((hit) => hit.id === item.id)).map((item) => ({
    ...item,
    has_rule: false,
    suggested_rule: item.rule,
    rule: undefined,
  }))
  const mappedRules = new Set(TECHNIQUES.map((item) => item.rule))
  for (const [key, aliases] of Object.entries(RULE_ALIASES)) {
    if (aliases.length > 0) mappedRules.add(key)
  }
  const unmapped = Array.from(ruleKeys).filter((key) => !mappedRules.has(key))
  const tactics = Array.from(new Set(TECHNIQUES.map((item) => item.tactic)))
  return {
    techniques: TECHNIQUES.length,
    covered: covered.length,
    gaps: gaps.length,
    covered_techniques: covered,
    gaps_techniques: gaps,
    unmapped_rules: unmapped,
    active_rules: Array.from(ruleKeys),
    tactics,
    note: '内置规则与自定义规则都参与覆盖；只表示“有映射”，不代表已启用、已部署或没有误报。',
  }
}

export function buildRiskGraph(store, engagementId) {
  const assets = store.facts.queryAssets(engagementId, { limit: 500 })
  const findings = store.facts.listFindings(engagementId, { limit: 500 })
  const alerts = store.facts.listAlerts(engagementId, { limit: 500 })
  const weight = { critical: 40, high: 25, medium: 10, low: 3, info: 1 }
  const nodes = []
  const edges = []
  const byAsset = new Map()
  for (const asset of assets) {
    nodes.push({ id: asset.id, type: 'asset', label: asset.name, criticality: asset.criticality, score: 0 })
    byAsset.set(asset.id, nodes[nodes.length - 1])
  }
  for (const finding of findings) {
    nodes.push({ id: finding.id, type: 'finding', label: finding.title, severity: finding.severity })
    if (finding.asset_id && byAsset.has(finding.asset_id)) {
      const asset = byAsset.get(finding.asset_id)
      asset.score += weight[finding.severity] || 1
      edges.push({ from: finding.id, to: finding.asset_id, type: 'finding_on_asset' })
    }
  }
  for (const alert of alerts) {
    nodes.push({ id: alert.id, type: 'alert', label: alert.title, severity: alert.severity })
    if (alert.task_id) edges.push({ from: alert.id, to: alert.task_id, type: 'alert_task' })
  }
  const ranked = nodes.filter((node) => node.type === 'asset').sort((a, b) => b.score - a.score)
  return {
    engagement_id: engagementId,
    nodes,
    edges,
    asset_ranking: ranked.slice(0, 20),
    counts: { assets: assets.length, findings: findings.length, alerts: alerts.length, edges: edges.length },
    note: '图谱只基于本地事实库；未验证版本/CVE，不代表已确认入侵。',
  }
}
