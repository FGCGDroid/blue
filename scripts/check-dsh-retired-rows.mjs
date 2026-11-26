#!/usr/bin/env node
/**
 * DSH 0.2.2 兼容检查。
 *
 * 0.2.2 移除了 `@deepseek-ai/dsh-tool-subagent-control/list-agents` 独立导出；
 * `tool-subagent-control` 现在一起注册 send_message / interrupt_agent / list_agents。
 * 旧 preset 里再写 tool-subagent-list-agents 行，会在 DSH 0.2.2 上报警/失效。
 *
 * 只扫描 preset 与 cordis.patch.yml；不执行插件。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const RETIRED = /tool-subagent-list-agents|dsh-tool-subagent-control\/list-agents/

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...walk(path))
    else if (name.endsWith('.yml') || name.endsWith('.yaml')) out.push(path)
  }
  return out
}

const files = [
  join(ROOT, 'cordis.patch.yml'),
  ...walk(join(ROOT, 'presets')),
]

const hits = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    if (RETIRED.test(line)) {
      hits.push({ file: relative(ROOT, file), line: index + 1, text: line.trim() })
    }
  })
}

if (hits.length > 0) {
  console.error('✗ DSH 0.2.2 兼容检查失败：发现已退役的 /list-agents 行')
  for (const hit of hits) console.error(`  ${hit.file}:${hit.line}: ${hit.text}`)
  console.error('  修复：删除该行，保留 tool-subagent-control 一行。')
  process.exit(1)
}

console.log(`✓ DSH 0.2.2 兼容检查通过（扫描 ${files.length} 个 preset/patch 文件，无 /list-agents 旧行）`)
