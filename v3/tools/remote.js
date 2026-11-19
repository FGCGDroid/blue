/** 工具组：远程 SSH / 云 Webhook（M5.4）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'remote'

function requireTask(store, engagementId, taskId) {
  const task = store.tasks.get(String(taskId || ''))
  if (task === null || task.engagement_id !== engagementId) throw new BlueError('REMOTE_TASK', '审批任务不存在')
  if (task.risk_level !== 'high' || String(task.approved_by || '') === '') {
    throw new BlueError('REMOTE_APPROVAL', '远程写操作必须先创建 high 任务并人工审批')
  }
  return task
}

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_remote',
    description: '远程接入：SSH 私钥部署采集器，或云 Webhook 封 IP。写操作必须先走 high 任务审批。',
    parameters: {
      action: { type: 'string', required: true, description: 'info/setup/test/prepare/deploy/block' },
      engagement: { type: 'string', description: '（可选）防守目标；默认当前绑定' },
      host: { type: 'string' }, user: { type: 'string' }, key_path: { type: 'string' }, port: { type: 'number' },
      cloud_url: { type: 'string' }, cloud_token: { type: 'string' },
      task_id: { type: 'string', description: 'prepare 返回的审批任务 id' },
      collector_url: { type: 'string' }, token: { type: 'string' }, log: { type: 'string' },
      ip: { type: 'string' }, ttl_seconds: { type: 'number' }, reason: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const remote = env.blueRemote
      if (!remote) throw new BlueError('REMOTE_UNAVAILABLE', '远程服务未加载')
      const action = String(args.action || 'info').toLowerCase()

      if (action === 'info') {
        const s = remote.settings()
        return { ok: true, ssh: { host: s.host, user: s.user, key_path: s.key_path, port: s.port }, cloud: { url: s.cloud_url, token_set: s.cloud_token !== '' }, note: '私钥只存路径，不存内容。' }
      }
      if (action === 'setup') {
        return { ok: true, settings: remote.save(args), note: '远程动作仍需 high 任务审批。' }
      }
      if (action === 'test') {
        return { ok: true, ...(await remote.test(args)) }
      }
      if (action === 'prepare') {
        const task = store.tasks.create(engagement.id, {
          role: 'hardening',
          priority: 'P1',
          risk_level: 'high',
          title: `远程写操作审批：${args.host || 'remote'}`,
          brief: '远程部署采集器或云封禁前，必须由人确认目标、授权和回滚方式。',
          acceptance: '审批人确认目标归属与回滚方案。',
        })
        return { ok: true, task, next: '人工 blue_task_approve 后，再用 blue_remote deploy/block 带 task_id 执行。' }
      }
      if (action === 'deploy') {
        const task = requireTask(store, engagement.id, args.task_id)
        const result = await remote.deploy(args)
        try { store.tasks.update(task.id, { status: 'done', result: JSON.stringify(result).slice(0, 4000) }) } catch { /* 结果回填失败不隐藏执行结果 */ }
        return { ok: result.ok === true, task_id: task.id, ...result }
      }
      if (action === 'block') {
        const task = requireTask(store, engagement.id, args.task_id)
        const result = await remote.cloudBlock(args)
        try { store.tasks.update(task.id, { status: 'done', result: JSON.stringify(result).slice(0, 4000) }) } catch { /* ignore */ }
        return { ok: result.ok === true, task_id: task.id, ...result }
      }
      throw new BlueError('REMOTE_ACTION', 'action 只能是 info/setup/test/prepare/deploy/block')
    }),
  }))
}
