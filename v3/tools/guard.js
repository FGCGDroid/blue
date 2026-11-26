/** 3.0 工具统一门禁：未完成「防御自检」前，写库/派发类工具一律拒绝。 */
import { hasSelfCheck } from './context.js'

export const SELF_CHECK_ALLOWED = Object.freeze(new Set([
  'blue_session_info',
  'blue_preflight',
  'blue_defense_selfcheck',
]))

export function withSelfCheck(definition) {
  if (SELF_CHECK_ALLOWED.has(definition.name)) return definition
  const original = definition.execute
  return {
    ...definition,
    execute: async (args, exec) => {
      if (!hasSelfCheck(exec)) {
        return JSON.stringify({
          ok: false,
          code: 'SELF_CHECK_REQUIRED',
          error: '开局必须先让用户明确说「防御自检」，然后调用 blue_defense_selfcheck；在此之前不能创建/绑定目标、写事实库或派发任务。',
        }, null, 2)
      }
      return original(args, exec)
    },
  }
}
