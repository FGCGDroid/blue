/** 网关决策日志（3.0，M3）。 */
import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname } from 'node:path'

const MAX_BYTES = 10 * 1024 * 1024

export function appendDecision(logPath, decision) {
  try {
    mkdirSync(dirname(logPath), { recursive: true })
    if (existsSync(logPath) && statSync(logPath).size >= MAX_BYTES) {
      const rotated = logPath + '.1'
      rmSync(rotated, { force: true })
      renameSync(logPath, rotated)
    }
    appendFileSync(logPath, JSON.stringify(decision) + '\n', 'utf8')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}
