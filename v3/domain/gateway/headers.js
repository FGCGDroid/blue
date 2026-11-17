/**
 * 请求头走私检查（3.0，M3）。
 *
 * rawHeaders 是 Node 的原始 [name, value, ...] 数组，保留重复头。
 * 只做判定，不发响应；调用方决定 400。
 */
export function inspectSmuggling(rawHeaders) {
  if (!Array.isArray(rawHeaders)) return null
  const contentLength = []
  const transferEncoding = []
  for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
    const name = String(rawHeaders[index] || '').toLowerCase()
    const value = String(rawHeaders[index + 1] || '').trim()
    if (name === 'content-length') contentLength.push(value)
    if (name === 'transfer-encoding') transferEncoding.push(value)
  }
  if (contentLength.length > 1) return { reason: 'SMUGGLING', detail: 'duplicate content-length' }
  if (transferEncoding.length > 1) return { reason: 'SMUGGLING', detail: 'duplicate transfer-encoding' }
  if (contentLength.length > 0 && transferEncoding.length > 0) {
    return { reason: 'SMUGGLING', detail: 'CL+TE' }
  }
  if (contentLength.length === 1 && !/^\d+$/.test(contentLength[0])) {
    return { reason: 'SMUGGLING', detail: 'malformed content-length' }
  }
  if (transferEncoding.length === 1 && transferEncoding[0].toLowerCase() !== 'chunked') {
    return { reason: 'SMUGGLING', detail: 'ambiguous transfer-encoding' }
  }
  return null
}
