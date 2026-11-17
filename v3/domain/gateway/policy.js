/**
 * 路径策略模型（3.0 骨架）。
 *
 * M3 实现 validate / evaluate。
 * 骨架只留接口，避免策略判定被误实现成“看到 admin 就封”。
 */
import { notImplemented } from '../shared/errors.js'

export function validatePolicy(_policy) {
  notImplemented('validatePolicy', 'M3')
}

export function evaluatePolicy(_canonicalPath, _policy) {
  notImplemented('evaluatePolicy', 'M3')
}
