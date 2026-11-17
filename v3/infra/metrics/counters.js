/** 网关计数器（3.0 骨架，M3 接 /metrics）。 */
export function createCounters() {
  const values = new Map()

  function keyOf(name, labels = {}) {
    const pairs = Object.keys(labels).sort().map((key) => `${key}=${labels[key]}`)
    return pairs.length === 0 ? name : `${name}{${pairs.join(',')}}`
  }

  return {
    inc(name, labels = {}) {
      const key = keyOf(name, labels)
      values.set(key, (values.get(key) || 0) + 1)
      return values.get(key)
    },
    set(name, value, labels = {}) {
      values.set(keyOf(name, labels), Number(value) || 0)
    },
    get(name, labels = {}) {
      return values.get(keyOf(name, labels)) || 0
    },
    snapshot() {
      return Object.fromEntries(Array.from(values.entries()).sort(([a], [b]) => a.localeCompare(b)))
    },
    reset() {
      values.clear()
    },
  }
}
