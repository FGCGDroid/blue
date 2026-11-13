import { compareVersions, dshCapabilities } from '../lib/compat.js'

if (compareVersions('0.2.1-rc.1', '0.2.1-rc.1') !== 0) throw new Error('同版本比较失败')
if (compareVersions('0.2.1-rc.2', '0.2.1-rc.1') <= 0) throw new Error('rc 版本比较失败')
if (compareVersions('0.2.2-rc.3', '0.2.1') <= 0) throw new Error('跨 minor 比较失败')
if (compareVersions('0.2.0', '0.2.1-rc.1') >= 0) throw new Error('0.2.0 不应满足 0.2.1-rc.1')

const old = dshCapabilities('0.2.0-rc.2')
if (old.agent_preset !== false || old.legacy_subagent !== true) throw new Error('0.2.0 兼容判断错误')
const min = dshCapabilities('0.2.1-rc.1')
if (min.agent_preset !== true || min.legacy_subagent !== false) throw new Error('0.2.1-rc.1 兼容判断错误')
const current = dshCapabilities('0.2.2-rc.3')
if (current.agent_preset !== true) throw new Error('当前版本判断错误')

console.log('✓ DSH 版本兼容判断')
