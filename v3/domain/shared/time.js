/** 时间工具。3.0 只使用 UTC ISO 字符串。 */
export function nowIso() {
  return new Date().toISOString()
}

export function isIso(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
