/** 3.0 告警研判用例（M4.0）。 */
import { BlueError } from '../../domain/shared/errors.js'

export function triageAlert(store, engagementId, args = {}) {
  const id = String(args.id ?? '').trim()
  if (id === '') throw new BlueError('ALERT_ID', '告警 id 不能为空')
  if (args.create_task === true) {
    throw new BlueError('NOT_IMPLEMENTED', 'M4.0 尚未注册 task 工具；create_task 先传 false，等 task 组迁移', {
      feature: 'create_task',
      milestone: 'M4.1',
    })
  }
  const current = store.facts.getAlert(id)
  if (current === null) throw new BlueError('ALERT_NOT_FOUND', '告警不存在：' + id)
  if (current.engagement_id !== engagementId) {
    throw new BlueError('ALERT_SCOPE', '告警不属于当前防守目标')
  }
  const alert = store.facts.updateAlert(id, args)
  return {
    alert,
    task: null,
    stats: store.engagements.stats(engagementId),
  }
}
