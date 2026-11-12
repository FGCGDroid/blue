import { BehaviorWindow } from '../lib/hunter.js'

const burst = new BehaviorWindow({ burst: 20, pathSweep: 10 })
let last
for (let i = 0; i < 25; i += 1) last = burst.observe('10.0.0.9', `/p/${i}`, 'Mozilla/5.0')
if (last.risk !== 'high' || !last.tags.includes('automation_burst') || !last.tags.includes('path_sweep')) {
  throw new Error('并发/路径扫描未识别：' + JSON.stringify(last))
}

const tool = new BehaviorWindow({ burst: 20, pathSweep: 10 })
let toolLast
for (let i = 0; i < 6; i += 1) toolLast = tool.observe('10.0.0.10', '/admin', 'curl/8.0')
if (toolLast.risk !== 'medium' || !toolLast.tags.includes('automation_tool')) {
  throw new Error('工具指纹未识别：' + JSON.stringify(toolLast))
}

const normal = new BehaviorWindow({ burst: 20, pathSweep: 10 })
const normalLast = normal.observe('10.0.0.11', '/', 'Mozilla/5.0')
if (normalLast.risk !== 'none' || normalLast.tags.length !== 0) throw new Error('正常请求被误报')

console.log('✓ 行为窗口测试通过：并发/路径扫描/工具指纹/正常请求')
