/**
 * 响应执行适配器（M3.5）。
 *
 * 3.0.0 只内置 manual/mock。命令型适配器由部署方实现，
 * 不在这里默认执行 iptables / nft / fail2ban / 删除 / 杀进程。
 */
import { BlueError } from '../shared/errors.js'

const ACTION_COMMANDS = Object.freeze({
  isolate_host: (target) => [`# manual: 隔离主机 ${target}`, '# 确认回滚路径后再执行'],
  block_ip: (target) => [`# manual: 封禁 IP ${target}`, '# 保留到期时间与回滚命令'],
  disable_account: (target) => [`# manual: 禁用账号 ${target}`, '# 先确认工单/审批'],
  revoke_session: (target) => [`# manual: 注销会话 ${target}`],
  quarantine_file: (target) => [`# manual: 隔离文件 ${target}`, '# 保留哈希与原始路径'],
})

export function planCommands(action) {
  const build = ACTION_COMMANDS[action.action]
  if (!build) throw new BlueError('RESPONSE_ADAPTER', `没有动作模板：${action.action}`)
  return {
    action: action.action,
    target: action.target,
    rollback: action.rollback,
    commands: build(action.target),
  }
}

export function createManualAdapter() {
  return {
    kind: 'manual',
    plan(action) {
      return planCommands(action)
    },
    async execute(action) {
      return {
        ok: true,
        executed: false,
        manual: true,
        plan: planCommands(action),
        evidence: '',
      }
    },
    async rollback(action) {
      return {
        ok: true,
        executed: false,
        manual: true,
        plan: {
          action: action.action,
          target: action.target,
          rollback: action.rollback,
          commands: [`# manual: 回滚 ${action.action} ${action.target}`, `# 原回滚方案：${action.rollback}`],
        },
        evidence: '',
      }
    },
  }
}

/** 测试/定制适配器；调用方必须自己保证不执行破坏性命令。 */
export function createMockAdapter(handlers = {}) {
  return {
    kind: 'mock',
    plan(action) {
      return planCommands(action)
    },
    async execute(action) {
      if (typeof handlers.execute === 'function') return handlers.execute(action)
      return { ok: true, executed: true, manual: false, evidence: 'mock execute' }
    },
    async rollback(action) {
      if (typeof handlers.rollback === 'function') return handlers.rollback(action)
      return { ok: true, executed: true, manual: false, evidence: 'mock rollback' }
    },
  }
}
