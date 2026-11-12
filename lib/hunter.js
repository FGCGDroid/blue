/**
 * 轻量行为窗口：只做“自动化流量”标注，不宣称识别 AI，也不自动封禁。
 *
 * 设计目标：
 * - 不依赖外部数据库；
 * - 每个来源 IP 一个 1 秒滑动窗口；
 * - 只返回 tags / risk / 统计，由调用方决定怎么展示。
 */
const TOOL_UA = /(curl|wget|python-requests|python-urllib|go-http-client|nuclei|sqlmap|masscan|nikto|zgrab|httpx)/i

export class BehaviorWindow {
  constructor(options = {}) {
    this.windowMs = options.windowMs ?? 1000
    this.burst = options.burst ?? 20
    this.pathSweep = options.pathSweep ?? 10
    this.maxClients = options.maxClients ?? 5000
    this.clients = new Map()
  }

  /**
   * @param {string} ip
   * @param {string} path
   * @param {string} userAgent
   * @returns {{ tags: string[], risk: 'high'|'medium'|'none', count: number, distinctPaths: number, reason: string }}
   */
  observe(ip, path, userAgent = '') {
    const now = Date.now()
    const key = String(ip || '')
    let state = this.clients.get(key)
    if (state === undefined) {
      state = { events: [], paths: [], lastSeen: now }
      this.clients.set(key, state)
    }
    state.lastSeen = now

    state.events = state.events.filter((item) => now - item < this.windowMs)
    state.paths = state.paths.filter((item) => now - item.t < this.windowMs)
    state.events.push(now)
    state.paths.push({ t: now, path: String(path || '') })

    const count = state.events.length
    const distinctPaths = new Set(state.paths.map((item) => item.path)).size
    const tags = []
    if (count > this.burst) tags.push('automation_burst')
    if (distinctPaths > this.pathSweep) tags.push('path_sweep')
    if (TOOL_UA.test(String(userAgent)) && count >= 5) tags.push('automation_tool')

    if (this.clients.size > this.maxClients) this.prune(now)

    const risk = tags.includes('automation_burst') ? 'high' : tags.length > 0 ? 'medium' : 'none'
    return {
      tags,
      risk,
      count,
      distinctPaths,
      reason: tags.length === 0
        ? ''
        : `window=${this.windowMs}ms requests=${count} distinct_paths=${distinctPaths} ua_tool=${TOOL_UA.test(String(userAgent))}`,
    }
  }

  prune(now = Date.now()) {
    for (const [key, state] of this.clients) {
      if (now - state.lastSeen > this.windowMs * 60) this.clients.delete(key)
    }
    while (this.clients.size > this.maxClients) {
      const oldest = this.clients.keys().next().value
      if (oldest === undefined) break
      this.clients.delete(oldest)
    }
  }

  reset() {
    this.clients.clear()
  }
}
