/** 3.0 自主派发用例（M4.1）。 */
import { BlueError } from '../../domain/shared/errors.js'
import { createTask } from './service.js'

const ROLE_BY_SEVERITY = { critical: 'ir', high: 'hunt', medium: 'hunt', low: 'monitor', info: 'monitor' }
const PRIORITY_BY_SEVERITY = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3', info: 'P3' }

function asInt(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function slotsOf(store, engagementId) {
  return Math.min(Math.max(asInt(store.db.getMeta('autopilot:slots:' + engagementId, 4), 4), 1), 8)
}

function gateOf(store, engagementId) {
  const maxRounds = Math.max(asInt(store.db.getMeta('autopilot:max_rounds:' + engagementId, 12), 12), 1)
  const cooldownSec = Math.max(asInt(store.db.getMeta('autopilot:cooldown_sec:' + engagementId, 30), 30), 0)
  const rounds = Math.max(asInt(store.db.getMeta('autopilot:rounds:' + engagementId, 0), 0), 0)
  if (rounds >= maxRounds) {
    return { ok: false, reason: 'round_limit', rounds, max_rounds: maxRounds }
  }
  const last = Date.parse(String(store.db.getMeta('autopilot:last_cycle:' + engagementId, '')))
  if (Number.isFinite(last) && cooldownSec > 0) {
    const elapsed = Math.floor((Date.now() - last) / 1000)
    if (elapsed < cooldownSec) {
      return { ok: false, reason: 'cooldown', remaining_sec: cooldownSec - elapsed, cooldown_sec: cooldownSec }
    }
  }
  return { ok: true, rounds, max_rounds: maxRounds, cooldown_sec: cooldownSec }
}

function markCycle(store, engagementId) {
  const rounds = Math.max(asInt(store.db.getMeta('autopilot:rounds:' + engagementId, 0), 0), 0) + 1
  store.db.setMeta('autopilot:rounds:' + engagementId, rounds)
  store.db.setMeta('autopilot:last_cycle:' + engagementId, new Date().toISOString())
  return rounds
}

function plan(store, engagementId, limit) {
  const existing = store.tasks.list(engagementId, { limit: 1000 })
  const seen = new Set(existing.map((task) => task.alert_id).filter(Boolean))
  const alerts = [
    ...store.facts.listAlerts(engagementId, { status: 'open', limit: 200 }),
    ...store.facts.listAlerts(engagementId, { status: 'investigating', limit: 200 }),
  ]
  const created = []
  for (const alert of alerts) {
    if (seen.has(alert.id)) continue
    if (created.length >= limit) break
    const severity = alert.severity || 'medium'
    const role = ROLE_BY_SEVERITY[severity] || 'hunt'
    const result = createTask(store, engagementId, {
      role,
      priority: PRIORITY_BY_SEVERITY[severity] || 'P2',
      title: `处置告警：${alert.title}`,
      brief: `告警 ${alert.id}（${severity}）\n原始内容：${String(alert.raw || '').slice(0, 1500)}\n研判结论：${alert.note || '无'}`,
      acceptance: '确认影响面、完成止损/清除并给出验证证据；无法完成写清阻塞。',
      alert_id: alert.id,
      actor: 'commander',
    })
    created.push(result.task)
    seen.add(alert.id)
  }
  return created
}

function next(store, engagementId, limit) {
  const maxSlots = slotsOf(store, engagementId)
  const counts = store.tasks.counts(engagementId)
  const active = Number(counts.dispatched || 0) + Number(counts.running || 0)
  const available = Math.max(maxSlots - active, 0)
  const pending = store.tasks.list(engagementId, { status: 'pending_approval', limit: 20 })
  const queued = store.tasks.list(engagementId, { status: 'queued', limit: Math.max(limit * 4, 40) })
    .filter((task) => task.risk_level !== 'high' || (task.approved_at !== null && task.approved_at !== ''))
  if (queued.length === 0 && pending.length > 0) {
    return {
      ok: false,
      reason: 'approval_required',
      task_id: pending[0].id,
      risk_level: pending[0].risk_level,
      pending_approval: pending.length,
      note: '高风险任务在待审批队列；先调用 blue_task_approve，不能自动派发。',
    }
  }
  if (available === 0) {
    return { ok: false, reason: 'slots_full', max_slots: maxSlots, tasks_active: active }
  }
  const want = Math.min(Math.max(limit, 1), available, queued.length)
  const dispatches = []
  for (const task of queued.slice(0, want)) {
    const updated = store.tasks.update(task.id, {
      status: 'dispatched',
      assignee: task.role,
      actor: 'commander',
      note: 'autopilot dispatch',
    }, 'commander')
    dispatches.push({
      task_id: updated.id,
      role: updated.role,
      priority: updated.priority,
      risk_level: updated.risk_level,
      requires_approval: Boolean(updated.requires_approval),
      approved_by: updated.approved_by || '',
      approved_at: updated.approved_at || '',
      title: updated.title,
      note: 'M4.1 只登记 dispatched，不自动拉起 subagent；由调用方按 task 继续派发。',
    })
  }
  return { ok: dispatches.length > 0, dispatches, max_slots: maxSlots, remaining_slots: Math.max(available - dispatches.length, 0) }
}

export async function runAutopilot(store, engagementId, args = {}) {
  const action = String(args.action || 'status').trim().toLowerCase()
  const limit = Math.min(Math.max(asInt(args.limit, 6), 1), 20)
  const stats = store.engagements.stats(engagementId)

  if (action === 'set_slots') {
    const nextSlots = Math.min(Math.max(asInt(args.slots, 4), 1), 8)
    store.db.setMeta('autopilot:slots:' + engagementId, nextSlots)
    return { ok: true, max_slots: nextSlots, stats }
  }

  if (action === 'status') {
    const counts = store.tasks.counts(engagementId)
    return {
      ok: true,
      stats,
      max_slots: slotsOf(store, engagementId),
      task_counts: counts,
      queued_by_priority: ['P0', 'P1', 'P2', 'P3'].map((priority) => ({
        priority,
        count: store.tasks.list(engagementId, { status: 'queued', priority, limit: 1000 }).length,
      })),
      note: 'M4.1 的 autopilot 只做任务队列；真实 subagent 派发在 UI/agent 层接入后再开。',
    }
  }

  if (action === 'plan') {
    const tasks = plan(store, engagementId, limit)
    return {
      ok: true,
      created: tasks.length,
      tasks,
      stats: store.engagements.stats(engagementId),
      note: tasks.length === 0 ? '没有新的候选任务。' : '用 next/cycle 领取。',
    }
  }

  if (action === 'next' || action === 'cycle') {
    if (action === 'cycle') {
      const gate = gateOf(store, engagementId)
      if (!gate.ok) return gate
      plan(store, engagementId, limit)
    }
    const result = next(store, engagementId, limit)
    if (action === 'cycle' && result.ok && result.dispatches.length > 0) {
      result.rounds = markCycle(store, engagementId)
    }
    result.stats = store.engagements.stats(engagementId)
    return result
  }

  if (action === 'complete') {
    const id = String(args.task_id || '').trim()
    if (id === '') throw new BlueError('TASK_ID', 'complete 需要 task_id')
    const current = store.tasks.get(id)
    if (current === null || current.engagement_id !== engagementId) {
      throw new BlueError('TASK_NOT_FOUND', '任务不存在：' + id)
    }
    const status = String(args.status || 'done') === 'blocked' ? 'blocked' : 'done'
    const task = store.tasks.update(id, {
      status,
      result: String(args.result || current.result || ''),
      actor: 'commander',
    }, 'commander')
    if (status === 'done' && current.alert_id) {
      try {
        store.facts.updateAlert(current.alert_id, {
          status: 'contained',
          note: `任务 ${id} 已完成：${String(args.result || '').slice(0, 500)}`,
          actor: 'commander',
        })
      } catch { /* 告警可能已关闭；任务完成不因回写失败而失败 */ }
    }
    return { ok: true, task, stats: store.engagements.stats(engagementId) }
  }

  throw new BlueError('AUTOPILOT_ACTION', '未知 action：' + action)
}
