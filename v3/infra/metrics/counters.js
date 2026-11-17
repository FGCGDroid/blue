/** 网关计数器（3.0，M3）。 */
export function createCounters() {
  const values = new Map()

  function keyOf(name, labels = {}) {
    const pairs = Object.keys(labels).sort().map((key) => `${key}=${labels[key]}`)
    return pairs.length === 0 ? name : `${name}{${pairs.join(',')}}`
  }

  function put(name, labels, value) {
    const key = keyOf(name, labels)
    values.set(key, { name, labels: { ...labels }, value: Number(value) || 0 })
    return values.get(key).value
  }

  return {
    inc(name, labels = {}) {
      const key = keyOf(name, labels)
      const current = values.get(key)
      return put(name, labels, (current ? current.value : 0) + 1)
    },
    set(name, value, labels = {}) {
      return put(name, labels, value)
    },
    get(name, labels = {}) {
      const entry = values.get(keyOf(name, labels))
      return entry ? entry.value : 0
    },
    snapshot() {
      return Object.fromEntries(
        Array.from(values.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, entry.value]),
      )
    },
    entries() {
      return Array.from(values.values()).sort((a, b) => {
        const left = keyOf(a.name, a.labels)
        const right = keyOf(b.name, b.labels)
        return left.localeCompare(right)
      })
    },
    reset() {
      values.clear()
    },
  }
}
