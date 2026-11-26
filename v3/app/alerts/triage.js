/** 3.0 告警研判用例（M4.1/M5 批量）。 */
import { BlueError } from '../../domain/shared/errors.js'
import { createTask } from '../tasks/service.js'

export function triageAlert(store, engagementId, args = {}) {
  const id = String(args.id ?? '').trim()
  if (id === '') throw new BlueError('ALERT_ID', '告警 id 不能为空')
  const current = store.facts.getAlert(id)
  if (current === null) throw new BlueError('ALERT_NOT_FOUND', '告警不存在：' + id)
  if (current.engagement_id !== engagementId) {
    throw new BlueError('ALERT_SCOPE', '告警不属于当前防守目标')
  }
  const alert = store.facts.updateAlert(id, args)
  let task = null
  if (args.create_task === true) {
    const role = String(args.role || (alert.severity === 'critical' ? 'ir' : 'hunt')).trim()
    const created = createTask(store, engagementId, {
      role,
      priority: alert.severity === 'critical' ? 'P0' : alert.severity === 'high' ? 'P1' : 'P2',
      title: `处置告警：${alert.title}`,
      brief: `告警 ${alert.id}（${alert.severity}）\n原始内容：${String(alert.raw || '').slice(0, 1500)}\n研判结论：${alert.note || '无'}`,
      acceptance: '确认影响面、完成止损/清除并给出验证证据；无法完成写清阻碍。',
      alert_id: alert.id,
      actor: 'monitor',
    })
    task = created.task
    store.facts.updateAlert(alert.id, { task_id: task.id, actor: 'monitor' })
    alert.task_id = task.id
  }
  return {
    alert,
    task,
    stats: store.engagements.stats(engagementId),
  }
}

export function triageAlerts(store, engagementId, args = {}) {
  const ids = Array.isArray(args.ids) ? args.ids.map((id) => String(id).trim()).filter(Boolean) : []
  if (ids.length === 0) throw new BlueError('ALERT_IDS', 'ids 不能为空')
  if (ids.length > 200) throw new BlueError('ALERT_IDS_MAX', '单次最多 200 条告警')
  const updated = []
  const failed = []
  for (const id of Array.from(new Set(ids))) {
    try {
      const result = triageAlert(store, engagementId, { ...args, id, create_task: args.create_task === true })
      updated.push({ id, status: result.alert.status, severity: result.alert.severity, task_id: result.task?.id ?? null })
    } catch (error) {
      failed.push({ id, code: error?.code ?? 'ALERT_TRIAGE', error: error?.message ?? String(error) })
    }
  }
  return {
    requested: ids.length,
    updated: updated.length,
    failed: failed.length,
    alerts: updated,
    errors: failed,
    stats: store.engagements.stats(engagementId),
  }
}
