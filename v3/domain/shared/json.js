/** 稳定 JSON：对象键排序，数组保序。用于策略摘要和证据 digest。 */
export function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]))
  }
  return value
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value))
}
