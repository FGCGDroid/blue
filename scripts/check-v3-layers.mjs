#!/usr/bin/env node
/**
 * 3.0 分层检查。
 *
 * 规则：
 *   domain     只能 import domain；不能直接用 fs/http/sqlite
 *   ports      不能 import 任何 v3 模块
 *   app        只能 import domain/ports；不能直接用 sqlite/http/fs
 *   infra      只能 import domain/ports；不能 import tools/ui/bootstrap
 *   tools      只能 import app/domain/ports；不能写 SQL
 *   ui         只能 import app/domain/ports；不能 import infra/tools/bootstrap
 *   bootstrap  可以 import 全部 v3；不能 import 外部包
 *   根文件     可以 import 全部 v3；不能 import 外部包
 *
 * 零运行时依赖：任何非 node: 的裸包都算违规。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const V3 = join(ROOT, 'v3')

const LAYERS = new Set(['bootstrap', 'ports', 'domain', 'app', 'infra', 'tools', 'ui'])
const REQUIRED_DIRS = ['bootstrap', 'ports', 'domain', 'app', 'infra', 'tools', 'ui']

const FORBIDDEN = {
  domain: new Set(['app', 'infra', 'tools', 'ui', 'bootstrap', 'ports', 'external', 'escape']),
  ports: new Set(['domain', 'app', 'infra', 'tools', 'ui', 'bootstrap', 'external', 'escape']),
  app: new Set(['infra', 'tools', 'ui', 'bootstrap', 'external', 'escape']),
  infra: new Set(['tools', 'ui', 'bootstrap', 'external', 'escape']),
  tools: new Set(['infra', 'ui', 'bootstrap', 'external', 'escape']),
  ui: new Set(['infra', 'tools', 'bootstrap', 'external', 'escape']),
  bootstrap: new Set(['external', 'escape']),
  root: new Set(['external', 'escape']),
}

const NODE_IO = new Set([
  'fs', 'fs/promises', 'http', 'https', 'net', 'tls', 'sqlite',
  'child_process', 'worker_threads', 'cluster', 'dgram', 'dns',
])

const NODE_FORBIDDEN = {
  domain: NODE_IO,
  ports: NODE_IO,
  app: NODE_IO,
  infra: new Set(['child_process']),
  tools: NODE_IO,
  ui: new Set(['sqlite', 'child_process']),
  bootstrap: new Set(['child_process']),
  root: new Set(),
}

const SQL = /\b(?:INSERT\s+INTO|UPDATE\s+[A-Za-z_][A-Za-z0-9_]*\s+SET|DELETE\s+FROM|SELECT\s+[^\n;]*\s+FROM)\b/i

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) out.push(...walk(full))
    else if (name.endsWith('.js')) out.push(full)
  }
  return out
}

function layerOf(file) {
  const rel = relative(V3, file)
  const first = rel.split(sep)[0]
  return LAYERS.has(first) ? first : 'root'
}

function specsOf(code) {
  const specs = new Set()
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(code)) !== null) specs.add(match[1])
  }
  return specs
}

function classify(spec, file) {
  if (spec.startsWith('node:')) {
    return { kind: 'node', name: spec.slice('node:'.length) }
  }
  if (spec.startsWith('.')) {
    const target = resolve(dirname(file), spec)
    const prefix = V3 + sep
    if (target !== V3 && !target.startsWith(prefix)) {
      return { kind: 'escape', spec }
    }
    const rel = relative(V3, target)
    const first = rel.split(sep)[0]
    return { kind: 'v3', layer: LAYERS.has(first) ? first : 'root', spec }
  }
  return { kind: 'external', name: spec }
}

export function checkV3Layers() {
  const violations = []
  const missing = []
  for (const dir of REQUIRED_DIRS) {
    const full = join(V3, dir)
    let ok = true
    try {
      ok = statSync(full).isDirectory()
    } catch {
      ok = false
    }
    if (!ok) missing.push(dir)
  }

  const files = walk(V3)
  const byLayer = {}

  for (const file of files) {
    const layer = layerOf(file)
    byLayer[layer] = (byLayer[layer] || 0) + 1
    const code = readFileSync(file, 'utf8')
    const rel = relative(ROOT, file)

    if (layer === 'domain' && /\bprocess\.env\b/.test(code)) {
      violations.push({ file: rel, message: 'domain 不能读 process.env' })
    }
    if (layer === 'tools' && SQL.test(code)) {
      violations.push({ file: rel, message: 'tools 里出现 SQL 字符串' })
    }

    for (const spec of specsOf(code)) {
      const target = classify(spec, file)

      if (target.kind === 'escape') {
        violations.push({ file: rel, message: `import 逃出 v3：${spec}` })
        continue
      }

      if (target.kind === 'external') {
        violations.push({ file: rel, message: `不允许外部依赖：${spec}` })
        continue
      }

      if (target.kind === 'node') {
        if ((NODE_FORBIDDEN[layer] || new Set()).has(target.name)) {
          violations.push({ file: rel, message: `${layer} 不能直接使用 node:${target.name}` })
        }
        continue
      }

      if ((FORBIDDEN[layer] || new Set()).has(target.layer)) {
        violations.push({ file: rel, message: `${layer} 不能 import ${target.layer}：${spec}` })
      }
    }
  }

  return {
    ok: violations.length === 0 && missing.length === 0,
    files: files.length,
    byLayer,
    missing,
    violations,
  }
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false

if (isMain) {
  const result = checkV3Layers()
  for (const dir of result.missing) console.error(`✗ 缺少目录：v3/${dir}`)
  for (const item of result.violations) console.error(`✗ ${item.file}: ${item.message}`)
  if (result.ok) {
    const summary = Object.entries(result.byLayer).map(([name, count]) => `${name}=${count}`).join(' ')
    console.log(`✓ v3 分层检查通过（${result.files} 个 JS；${summary}）`)
  } else {
    console.error(`v3 分层检查失败：${result.violations.length} 个违规，${result.missing.length} 个缺失目录`)
  }
  process.exitCode = result.ok ? 0 : 1
}
