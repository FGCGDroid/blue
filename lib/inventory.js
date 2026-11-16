/**
 * 把 engagement.scope 自动登记成资产，避免“开了目标但图谱空白”。
 * 只登记库存，不代表已验证在线或存在漏洞。
 */

function hostOf(raw) {
  const value = String(raw || '').trim()
  if (value === '') return ''
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      const url = new URL(value)
      return url.hostname
    }
  } catch {
    return ''
  }
  return value.replace(/^\[|\]$/g, '').split('/')[0].replace(/:\d+$/, '')
}

export function importScopeAssets(store, engagement) {
  const scope = Array.isArray(engagement.scope) ? engagement.scope : []
  const imported = []
  for (const raw of scope.slice(0, 100)) {
    const host = hostOf(raw)
    if (host === '') continue
    try {
      imported.push(store.addAsset(engagement.id, {
        name: raw,
        address: host,
        kind: 'host',
        status: 'in_scope',
        note: '从 engagement.scope 自动登记；未验证在线状态',
        actor: 'system',
      }))
    } catch {
      // 单个非法 scope 不阻断整个目标创建。
    }
  }
  return imported
}
