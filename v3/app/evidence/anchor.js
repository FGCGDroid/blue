/**
 * 审计锚定用例（M3.5）。
 *
 * app 层不直接 import infra；sink 推送函数由调用方注入
 * （生产是 infra/evidence/anchor-sink.js 的 pushToSinks）。
 */
export async function anchorAndPush(store, engagementId, sinks = [], context = {}) {
  const anchor = store.evidenceRepo.addAnchor(engagementId, { actor: context.actor || 'commander' })
  if (!Array.isArray(sinks) || sinks.length === 0) {
    return { ok: true, anchor, sinks: [], pushed: false, note: '未配置 sink' }
  }
  if (typeof context.push !== 'function') {
    return { ok: true, anchor, sinks: [], pushed: false, note: '未注入 sink 推送函数' }
  }
  const results = await context.push(sinks, anchor)
  return {
    ok: true,
    anchor,
    sinks: results,
    pushed: results.length > 0 && results.every((item) => item.ok === true),
  }
}
