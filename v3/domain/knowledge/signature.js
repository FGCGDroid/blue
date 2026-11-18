/** 攻击请求签名归一化（纯函数，tools/domain 共用）。 */
function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function signatureOf(event = {}) {
  const raw = text(event.path || event.url || event.http?.path || event.raw_path).trim()
  const path = raw.split('?')[0].split('#')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':uuid')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
  if (path === '') {
    const rule = text(event.rule_key || event.rule || event.title).trim()
    return `other:${rule || 'unknown'}`
  }
  const method = text(event.method || event.http?.method || 'GET').toUpperCase()
  const value = Number(event.status ?? event.status_code ?? event.http?.status ?? event.http?.status_code)
  const status = Number.isFinite(value) ? value : 0
  return `http:${method}:${path}:${status}`
}
