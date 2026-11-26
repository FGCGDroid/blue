/**
 * 任务风险分级（3.0 骨架，从 2.0 lib/plan.js 原样搬）。
 *
 * 3.0.0 不改变判定行为；任何调整都放 3.2。
 * 规则分错会直接影响审批闸，改这里必须同时改 test/vectors/risk.json。
 */
import { TASK_STATUS } from './states.js'

export const RISK_LEVELS = Object.freeze(['low', 'medium', 'high'])

const DESTRUCTIVE_ACTION = /(隔离|断网|封禁|删除|清除|杀进程|结束进程|isolate|quarantine|block|drop|kill|delete|remove|disable|禁用|锁定|重置|reset|修改|变更|下发|执行|apply|enable)/i
const SENSITIVE_SURFACE = /(主机|host|文件|file|防火墙|firewall|iptables|内核|启动项|ssh|凭据|密码|账号|端口)/i

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

/** 风险分级：高风险动作只能进入待审批，不能自动派发。 */
export function inferRisk(input = {}) {
  const explicit = asText(input.risk_level).trim().toLowerCase()
  const role = asText(input.role, 'monitor')
  const text = [input.title, input.brief, input.acceptance].map((part) => asText(part)).join('\n')
  const destructive = DESTRUCTIVE_ACTION.test(text)
  const sensitive = SENSITIVE_SURFACE.test(text)
  let inferred = 'low'
  if ((role === 'ir' || role === 'hardening') && destructive && sensitive) inferred = 'high'
  else if (role === 'ir') inferred = 'medium'
  else if (role === 'hardening') inferred = SENSITIVE_SURFACE.test(text) ? 'medium' : 'low'
  // 只允许显式升级为 high，不能用 risk_level=low 绕过高风险动作。
  return explicit === 'high' || inferred === 'high' ? 'high' : inferred
}

/** 风险对应的初始状态。 */
export function initialStatusForRisk(riskLevel) {
  return riskLevel === 'high' ? TASK_STATUS.PENDING_APPROVAL : TASK_STATUS.QUEUED
}
