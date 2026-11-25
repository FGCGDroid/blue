// 打法分类：从签名/标题推导 technique 与 variant
export function techniqueOf(text) {
  const s = String(text || '').toLowerCase()
  if (/sqli|union|select|sleep\(|benchmark\(|information_schema|and\+?1=1|%0aand/.test(s)) return 'sqli'
  if (/xss|<script|onerror|javascript:/.test(s)) return 'xss'
  if (/nmap|zgrab|masscan|nikto|nuclei|gobuster|dirsearch|scanner|whatweb/.test(s)) return 'scanner'
  if (/\.env|\.git|backup|sensitive|download|wp-admin|administrator|phpinfo|server-status|package\.json|yarn\.lock|actuator/.test(s)) return 'sensitive-path'
  if (/login|401|403|brute|auth/.test(s)) return 'brute-force'
  if (/decoy|诱饵/.test(s)) return 'deception'
  return 'other'
}

export function variantOf(text) {
  const s = String(text || '').toLowerCase()
  if (/union/.test(s)) return 'union'
  if (/sleep\(|benchmark\(/.test(s)) return 'time-based'
  if (/and|or/.test(s) && /1=1|1=2|\d+=\d+/.test(s)) return 'boolean'
  if (/%0a|%09|%20|\/\*\*|\+/.test(s) && /and|or|union/.test(s)) return 'encoded'
  if (/\.\.|%2e/.test(s)) return 'traversal'
  if (/nmap|zgrab|masscan/.test(s)) return 'scanner-ua'
  return 'plain'
}
