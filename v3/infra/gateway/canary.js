/** canary 探测（3.0，M3）。 */
export const CANARY_VARIANTS = Object.freeze([
  '/admin',
  '//admin',
  '/./admin',
  '/%61dmin',
  '/ADMIN',
  '/admin%2f..%2fpublic',
  '/foo/../admin',
  '/admin%00',
])

export async function probe(gatewayUrl, path, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const response = await fetchImpl(new URL(path, gatewayUrl), {
    method: options.method || 'GET',
    redirect: 'manual',
  })
  return { status: response.status, body: await response.text() }
}

export async function runCanary(gatewayUrl, options = {}) {
  const variants = options.variants || CANARY_VARIANTS
  const results = []
  for (const path of variants) {
    results.push({ path, ...(await probe(gatewayUrl, path, options)) })
  }
  return {
    ok: results.every((item) => item.status === 400 || item.status === 403),
    results,
  }
}
