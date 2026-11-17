/**
 * 3.0 统一错误。
 *
 * 工具层返回 { ok:false, error } 时保留 code，方便以后加错误码契约。
 * 骨架阶段的占位函数统一抛 NOT_IMPLEMENTED，不静默返回假数据。
 */
export class BlueError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'BlueError'
    this.code = code
    this.details = details
  }
}

export function notImplemented(feature, milestone = 'M?') {
  throw new BlueError('NOT_IMPLEMENTED', `${feature} 尚未实现（${milestone}）`, { feature, milestone })
}
