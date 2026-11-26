/** 3.0 IOC 用例（M4.1；先支持文本扫描，内置规则等 detection 组迁移）。 */
import { BlueError } from '../../domain/shared/errors.js'

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function addIoc(store, engagementId, input = {}) {
  const ioc = store.facts.addIoc(engagementId, input)
  return {
    ioc,
    total: store.facts.listIocs(engagementId, { limit: 2000 }).length,
  }
}

export function listIocs(store, engagementId, filters = {}) {
  const iocs = store.facts.listIocs(engagementId, filters)
  return { count: iocs.length, iocs }
}

export function checkIocs(store, engagementId, input = {}) {
  const text = asText(input.text)
  if (text === '') throw new BlueError('IOC_TEXT', 'M4.1 只支持 text；文件扫描等 hunt 组迁移')
  const iocs = store.facts.listIocs(engagementId, { limit: 2000 })
  const lines = text.split(/\r?\n/)
  const hits = []
  for (const ioc of iocs) {
    if (typeof ioc.value !== 'string' || ioc.value === '') continue
    const needle = ioc.value.toLowerCase()
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      if (line.toLowerCase().includes(needle)) {
        hits.push({
          ioc_id: ioc.id,
          type: ioc.type,
          value: ioc.value,
          line: index + 1,
          excerpt: line.slice(0, 300),
        })
        if (hits.length >= 300) break
      }
    }
    if (hits.length >= 300) break
  }
  return {
    matched: hits.length > 0,
    hits,
    total: hits.length,
    checked: iocs.length,
    note: 'M4.1 只做已登记 IOC 的文本子串匹配；内置攻击特征在 detection 组迁移后接入。',
  }
}
