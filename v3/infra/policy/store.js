/**
 * 策略文件加载/保存（3.0，M3）。
 *
 * 文件缺失时返回内置最小策略；文件存在但非法时拒绝加载。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_POLICY, policyHash, validatePolicy } from '../../domain/gateway/policy.js'
import { BlueError } from '../../domain/shared/errors.js'

export function loadPolicy(path, options = {}) {
  if (typeof path !== 'string' || path === '') {
    throw new BlueError('POLICY_PATH', '策略路径不能为空')
  }

  if (!existsSync(path)) {
    if (options.missingOk === false) {
      throw new BlueError('POLICY_MISSING', `策略文件不存在：${path}`)
    }
    const policy = validatePolicy(DEFAULT_POLICY)
    return { policy, hash: policyHash(policy), path, source: 'default' }
  }

  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (error) {
    throw new BlueError('POLICY_READ', `策略文件读取失败：${error.message}`)
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new BlueError('POLICY_JSON', `策略不是合法 JSON：${error.message}`)
  }

  try {
    const policy = validatePolicy(parsed)
    return { policy, hash: policyHash(policy), path, source: 'file' }
  } catch (error) {
    if (error instanceof BlueError) throw error
    throw new BlueError('POLICY_INVALID', error.message)
  }
}

export function savePolicy(path, input) {
  const policy = validatePolicy(input)
  const hash = policyHash(policy)
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, JSON.stringify(policy, null, 2) + '\n', 'utf8')
  try {
    renameSync(temp, path)
  } catch {
    // Windows 上目标存在时 rename 可能失败；退回直接覆盖。
    try { unlinkSync(temp) } catch { /* ignore */ }
    writeFileSync(path, JSON.stringify(policy, null, 2) + '\n', 'utf8')
  }
  return { policy, hash, path }
}
