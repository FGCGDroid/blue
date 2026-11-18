/** 3.0 资产用例。 */
export function addAsset(store, engagementId, input = {}) {
  const asset = store.facts.addAsset(engagementId, input)
  return {
    asset,
    stats: store.engagements.stats(engagementId),
  }
}

export function queryAssets(store, engagementId, filters = {}) {
  const assets = store.facts.queryAssets(engagementId, filters)
  return {
    count: assets.length,
    assets,
    stats: store.engagements.stats(engagementId),
  }
}
