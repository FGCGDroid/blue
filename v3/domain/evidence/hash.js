/**
 * timeline 哈希（3.0 骨架，从 2.0 lib/store.js 原样搬）。
 *
 * 必须与 2.0 逐字节一致，否则迁移后 verifyTimeline 会把旧链判坏。
 * 改这里必须同时更新 test/vectors/timeline.json。
 */
import { createHash } from 'node:crypto'

export function timelineHash(row, prevHash = '') {
  return createHash('sha256')
    .update(JSON.stringify([
      prevHash || '',
      row.engagement_id,
      row.at,
      row.actor,
      row.action,
      row.target,
      row.detail,
    ]))
    .digest('hex')
}
