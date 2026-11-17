/**
 * 路径规范化（3.0 骨架）。
 *
 * M3 实现，顺序固定：
 *   raw -> absolute-form 处理 -> 解码一次 -> 拒绝点段/编码分隔符
 *       -> canonical -> 返回 query
 *
 * 现在直接抛 NOT_IMPLEMENTED。不要在骨架里放“看起来能用”的正则，
 * 否则会被误当成已经具备 K1。
 */
import { notImplemented } from '../shared/errors.js'

export function normalizeRequestPath(_rawUrl, _policy = {}) {
  notImplemented('normalizeRequestPath', 'M3')
}
