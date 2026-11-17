/** /metrics 渲染（3.0，M3）。 */
function escapeLabel(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

export function renderMetrics(counters) {
  const entries = counters && typeof counters.entries === 'function'
    ? counters.entries()
    : Object.entries(counters || {}).map(([key, value]) => ({ name: key, labels: {}, value }))
  const lines = []
  for (const entry of entries) {
    const labels = Object.entries(entry.labels || {})
      .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
      .join(',')
    lines.push(`${entry.name}${labels ? `{${labels}}` : ''} ${entry.value}`)
  }
  return lines.length === 0 ? '' : lines.join('\n') + '\n'
}
