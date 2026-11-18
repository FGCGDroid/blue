/** 文本/样本读取（M4.5）：只读，限制数据根/当前工作区，不执行内容。 */
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isWithin } from './safe-path.js'
import { BlueError } from '../../domain/shared/errors.js'

function allowed(file, root) {
  const target = realpathSync(resolve(String(file || '').trim()))
  const roots = [resolve(root)]
  if (!roots.some((base) => isWithin(base, target))) {
    throw new BlueError('FILE_PATH', '只允许读取数据根内的文件：' + target)
  }
  return target
}

export function readText(file, options = {}) {
  const target = allowed(file, options.root)
  const info = statSync(target)
  if (!info.isFile()) throw new BlueError('FILE_PATH', '不是普通文件：' + target)
  const maxBytes = Math.min(Math.max(Number(options.maxBytes) || 8 * 1024 * 1024, 1), 32 * 1024 * 1024)
  if (info.size > maxBytes) throw new BlueError('FILE_SIZE', '文件过大：' + info.size)
  return { path: target, size: info.size, text: readFileSync(target, 'utf8') }
}

export function readArtifact(file, options = {}) {
  const target = allowed(file, options.root)
  const info = statSync(target)
  if (!info.isFile()) throw new BlueError('FILE_PATH', '不是普通文件：' + target)
  const maxBytes = Math.min(Math.max(Number(options.maxBytes) || 16 * 1024 * 1024, 1), 32 * 1024 * 1024)
  if (info.size > maxBytes) throw new BlueError('FILE_SIZE', '文件过大：' + info.size)
  const bytes = readFileSync(target)
  const text = bytes.toString('utf8')
  const strings = text.match(/[\x20-\x7e]{6,}/g) || []
  const urls = Array.from(new Set(text.match(/https?:\/\/[^\s"'<>]+/g) || []))
  const ips = Array.from(new Set(text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []))
  return {
    path: target,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    md5: createHash('md5').update(bytes).digest('hex'),
    strings: strings.slice(0, Number(options.maxStrings) || 80),
    urls: urls.slice(0, 50),
    ips: ips.slice(0, 50),
    note: '只读初筛，不运行样本；字符串/URL/IP 只是线索。',
  }
}
