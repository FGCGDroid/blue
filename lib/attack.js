/**
 * 内置日志规则到 MITRE ATT&CK 的静态映射。
 *
 * 这不是“ATT&CK 全覆盖”，只是让我们知道：
 * 现有 13 条日志特征大致覆盖哪些战术/技术，哪些还没规则。
 */
import { LOG_PATTERNS } from './playbooks.js'

export const TECHNIQUES = {
  'T1505.003': { tactic: 'persistence', name: 'Web Shell' },
  'T1059.001': { tactic: 'execution', name: 'PowerShell' },
  'T1059.004': { tactic: 'execution', name: 'Unix Shell' },
  'T1059.007': { tactic: 'execution', name: 'JavaScript' },
  'T1105': { tactic: 'command-and-control', name: 'Ingress Tool Transfer' },
  'T1190': { tactic: 'initial-access', name: 'Exploit Public-Facing Application' },
  'T1595': { tactic: 'reconnaissance', name: 'Active Scanning' },
  'T1110': { tactic: 'credential-access', name: 'Brute Force' },
  'T1053.005': { tactic: 'persistence', name: 'Scheduled Task' },
  'T1041': { tactic: 'exfiltration', name: 'Exfiltration Over C2 Channel' },
  'T1070': { tactic: 'defense-evasion', name: 'Indicator Removal' },
  'T1078': { tactic: 'initial-access', name: 'Valid Accounts' },
}

export const PATTERN_TECHNIQUES = {
  'php-webshell': ['T1505.003'],
  'jsp-webshell': ['T1505.003'],
  'aspx-webshell': ['T1505.003'],
  'aspx-process-start': ['T1505.003'],
  'jwt-none': ['T1078'],
  'web-login-fail': ['T1110'],
  'powershell-cradle': ['T1059.001', 'T1105'],
  'linux-reverse-shell': ['T1059.004'],
  'sql-injection': ['T1190'],
  'path-traversal': ['T1190'],
  xss: ['T1059.007'],
  scanner: ['T1595'],
  'brute-force': ['T1110'],
  persistence: ['T1053.005'],
  exfil: ['T1041'],
  'log-tamper': ['T1070'],
}

/**
 * @param {Array<{id:string,label:string}>} patterns
 * @returns {{ total:number, mapped:number, unmapped:string[], techniques:Array, tactics:Array, note:string }}
 */
export function attackCoverage(patterns = LOG_PATTERNS) {
  const techniqueMap = new Map()
  const unmapped = []
  for (const pattern of patterns) {
    const ids = PATTERN_TECHNIQUES[pattern.id]
    if (!Array.isArray(ids) || ids.length === 0) {
      unmapped.push(pattern.id)
      continue
    }
    for (const id of ids) {
      const meta = TECHNIQUES[id]
      if (meta === undefined) {
        unmapped.push(pattern.id)
        continue
      }
      const item = techniqueMap.get(id) ?? { id, tactic: meta.tactic, name: meta.name, patterns: [] }
      item.patterns.push(pattern.id)
      techniqueMap.set(id, item)
    }
  }
  const techniques = Array.from(techniqueMap.values()).sort((a, b) => a.id.localeCompare(b.id))
  const tacticCount = new Map()
  for (const item of techniques) tacticCount.set(item.tactic, (tacticCount.get(item.tactic) || 0) + 1)
  return {
    total: patterns.length,
    mapped: patterns.length - new Set(unmapped).size,
    unmapped: Array.from(new Set(unmapped)),
    techniques,
    tactics: Array.from(tacticCount, ([tactic, count]) => ({ tactic, count })).sort((a, b) => a.tactic.localeCompare(b.tactic)),
    note: '这是内置日志规则到 ATT&CK 的映射，不代表 ATT&CK 全覆盖，也不代表已部署对应检测。',
  }
}
