/**
 * 把外部诱饵服务的 JSONL 事件同步进事实库。
 * 只用于已登记/明确授权的诱饵日志；不执行日志里的任何内容。
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { resolve, sep } from 'node:path'
function within(root, target) {
  return target === root || target.startsWith(root + sep)
}

export function defaultDecoyEventsPath() {
  return process.env.BLUE_DECOY_EVENTS
    || resolve(process.env.DSH_HOME || resolve(homedir(), '.dsh'), 'blue', 'decoy-events.jsonl')
}

export function syncDecoyEvents(store, engagementId, path, options = {}) {
  if (options.authorized !== true) throw new Error('同步外部诱饵事件需要 authorized=true')
  const target = resolve(path || defaultDecoyEventsPath())
  const configured = process.env.BLUE_DECOY_EVENTS ? resolve(process.env.BLUE_DECOY_EVENTS) : ''
  const blueRoot = resolve(process.env.DSH_HOME || resolve(homedir(), '.dsh'), 'blue')
  if (target !== configured && !within(blueRoot, target) && !within(resolve(process.cwd()), target)) {
    throw new Error('诱饵事件日志只允许来自 BLUE_DECOY_EVENTS、$DSH_HOME/blue 或当前工作区：' + target)
  }
  const info = readFileSync(target, 'utf8')
  const lines = info.split(/\r?\n/).filter(Boolean)
  const maxEvents = Math.min(Math.max(Number(options.maxEvents) || 2000, 1), 20000)
  const maxHits = Math.min(Math.max(Number(options.maxHits) || 200, 1), 500)
  let read = 0
  let created = 0
  let inserted = 0
  let duplicates = 0
  let skipped = 0
  const decoys = new Map()
  for (const line of lines.slice(0, maxEvents)) {
    read += 1
    let event
    try { event = JSON.parse(line) } catch { skipped += 1; continue }
    const name = typeof event.decoy === 'string' ? event.decoy.trim() : ''
    const remote = typeof event.remote === 'string' ? event.remote : ''
    const at = typeof event.at === 'string' ? event.at : ''
    const eventPath = typeof event.path === 'string' ? event.path : ''
    if (name === '' || at === '' || eventPath === '') { skipped += 1; continue }
    let decoy = decoys.get(name) || store.findDecoyByName(engagementId, name)
    if (decoy === null || decoy === undefined) {
      decoy = store.addDecoy(engagementId, {
        kind: 'tarpit',
        name,
        target: `http://external-decoy/${encodeURIComponent(name)}`,
        status: 'active',
        note: '由外部诱饵事件自动登记',
        actor: 'decoy-sync',
      })
      created += 1
    }
    decoys.set(name, decoy)
    if (inserted + duplicates >= maxHits) { skipped += 1; continue }
    const eventKey = createHash('sha256')
      .update([at, name, remote, event.method || '', eventPath, event.status || ''].join('|'))
      .digest('hex')
    const result = store.recordDecoyHit(decoy.id, {
      source: remote,
      evidence: JSON.stringify({
        at,
        method: event.method || '',
        path: eventPath,
        status: event.status || 0,
        user_agent: event.user_agent || '',
        tags: event.tags || [],
      }).slice(0, 4000),
      severity: Array.isArray(event.tags) && event.tags.length > 0 ? 'high' : 'medium',
      event_key: eventKey,
      actor: 'decoy-sync',
    })
    if (result.duplicate) duplicates += 1
    else inserted += 1
  }
  return { ok: true, path: target, read, created, inserted, duplicates, skipped }
}
