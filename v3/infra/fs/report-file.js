/** 报告落盘（M5）：只允许数据根 reports/ 下。 */
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { isWithin } from './safe-path.js'
import { BlueError } from '../../domain/shared/errors.js'

export function writeReportFile(root, markdown, requested = '') {
  const dir = join(root, 'reports')
  mkdirSync(dir, { recursive: true })
  const name = String(requested || `report-${Date.now()}.md`).trim()
  if (name === '' || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new BlueError('REPORT_PATH', 'path 只能是 reports/ 下的文件名：' + requested)
  }
  const target = resolve(dir, basename(name))
  if (!isWithin(dir, target)) throw new BlueError('REPORT_PATH', '路径越界：' + requested)
  const body = String(markdown || '')
  const temp = `${target}.tmp-${process.pid}`
  writeFileSync(temp, body, 'utf8')
  try {
    renameSync(temp, target)
  } catch {
    try { unlinkSync(temp) } catch { /* ignore */ }
    writeFileSync(target, body, 'utf8')
  }
  return { file: target, bytes: Buffer.byteLength(body, 'utf8') }
}
