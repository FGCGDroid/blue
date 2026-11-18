/** JSONL 读取（M4.2）：只允许数据根或当前工作区，防止把任意系统文件当事件源。 */
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isWithin } from './safe-path.js'
import { BlueError } from '../../domain/shared/errors.js'

export function readJsonl(file, options = {}) {
  const requested = String(file ?? '').trim()
  if (requested === '') throw new BlueError('JSONL_PATH', 'path 不能为空')
  let target
  try {
    target = realpathSync(resolve(requested))
  } catch {
    throw new BlueError('JSONL_PATH', '文件不存在：' + requested)
  }
  const root = options.root ? resolve(options.root) : null
  const cwd = resolve(process.cwd())
  if (!(root !== null && isWithin(root, target)) && !isWithin(cwd, target)) {
    throw new BlueError('JSONL_PATH', '只允许读取数据根或当前工作区内的 JSONL：' + target)
  }
  const info = statSync(target)
  if (!info.isFile()) throw new BlueError('JSONL_PATH', '不是普通文件：' + target)
  const maxBytes = Math.min(Math.max(Number(options.maxBytes) || 32 * 1024 * 1024, 1), 32 * 1024 * 1024)
  if (info.size > maxBytes) throw new BlueError('JSONL_SIZE', '文件过大：' + info.size)
  const maxEvents = Math.min(Math.max(Number(options.maxEvents) || 2000, 1), 20000)
  const lines = readFileSync(target, 'utf8').split(/\r?\n/).filter(Boolean)
  const events = []
  let skipped = 0
  for (const line of lines.slice(0, maxEvents)) {
    try {
      const event = JSON.parse(line)
      if (event !== null && typeof event === 'object') events.push(event)
      else skipped += 1
    } catch {
      skipped += 1
    }
  }
  return { path: target, read: Math.min(lines.length, maxEvents), events, skipped }
}
