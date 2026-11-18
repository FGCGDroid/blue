/** 证据包落盘/读取（M5）：只允许数据根 evidence/ 下。 */
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, basename, resolve } from 'node:path'
import { isWithin } from './safe-path.js'
import { BlueError } from '../../domain/shared/errors.js'

function evidenceDir(root) {
  return join(root, 'evidence')
}

function safeTarget(root, requested) {
  const dir = evidenceDir(root)
  mkdirSync(dir, { recursive: true })
  const name = String(requested || `evidence-${Date.now()}.json`).trim()
  if (name === '' || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new BlueError('EVIDENCE_PATH', 'path 只能是 evidence/ 下的文件名：' + requested)
  }
  const target = resolve(dir, basename(name))
  if (!isWithin(dir, target)) throw new BlueError('EVIDENCE_PATH', '路径越界：' + requested)
  return target
}

export function writeEvidenceFile(root, bundle, requested = '') {
  const target = safeTarget(root, requested)
  mkdirSync(dirname(target), { recursive: true })
  const temp = `${target}.tmp-${process.pid}`
  writeFileSync(temp, JSON.stringify(bundle, null, 2) + '\n', 'utf8')
  try {
    renameSync(temp, target)
  } catch {
    try { unlinkSync(temp) } catch { /* ignore */ }
    writeFileSync(target, JSON.stringify(bundle, null, 2) + '\n', 'utf8')
  }
  return {
    file: target,
    bytes: Buffer.byteLength(JSON.stringify(bundle, null, 2) + '\n', 'utf8'),
  }
}

export function readEvidenceFile(root, requested) {
  const name = String(requested || '').trim()
  if (name === '') throw new BlueError('EVIDENCE_PATH', 'path 不能为空')
  const dir = resolve(evidenceDir(root))
  let target
  try {
    target = realpathSync(resolve(name))
  } catch {
    throw new BlueError('EVIDENCE_PATH', '证据包不存在：' + name)
  }
  if (!isWithin(dir, target)) throw new BlueError('EVIDENCE_PATH', '只允许读取 evidence/ 下的证据包：' + target)
  if (!existsSync(target)) throw new BlueError('EVIDENCE_PATH', '证据包不存在：' + target)
  let parsed
  try {
    parsed = JSON.parse(readFileSync(target, 'utf8'))
  } catch (error) {
    throw new BlueError('EVIDENCE_JSON', '证据包不是合法 JSON：' + error.message)
  }
  return { file: target, bundle: parsed }
}
