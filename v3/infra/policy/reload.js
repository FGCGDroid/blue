/** 策略热加载（3.0，M3）。 */
import { loadPolicy } from './store.js'

/**
 * 读取一次策略并与当前 hash 比较。
 * 失败时返回 changed:false + error，调用方保留旧策略。
 */
export function reloadPolicy(path, previousHash = '') {
  try {
    const loaded = loadPolicy(path)
    return {
      changed: loaded.hash !== previousHash,
      policy: loaded.policy,
      hash: loaded.hash,
      path: loaded.path,
      source: loaded.source,
      error: null,
    }
  } catch (error) {
    return {
      changed: false,
      policy: null,
      hash: previousHash,
      path,
      source: 'error',
      error,
    }
  }
}
