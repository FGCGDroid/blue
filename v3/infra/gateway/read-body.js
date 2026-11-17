/** 请求体读取（3.0，M3）：只在上游放行后调用。 */
export function readBody(req, maxBytes = 1024 * 1024) {
  const limit = Math.min(Math.max(Number(maxBytes) || 1024 * 1024, 1024), 8 * 1024 * 1024)
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk) => {
      if (tooLarge) return
      size += chunk.length
      if (size > limit) {
        tooLarge = true
        chunks.length = 0
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve({
      body: tooLarge ? Buffer.alloc(0) : Buffer.concat(chunks),
      bytes: size,
      tooLarge,
    }))
    req.on('error', reject)
  })
}
