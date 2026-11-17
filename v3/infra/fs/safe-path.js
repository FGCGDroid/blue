/** 路径闸（3.0 骨架）：判断 target 是否在 root 内。 */
import { relative, resolve, sep } from 'node:path'

export function isWithin(root, target) {
  const base = resolve(root)
  const candidate = resolve(target)
  const rel = relative(base, candidate)
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep))
}
