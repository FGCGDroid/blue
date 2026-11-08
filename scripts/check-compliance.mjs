#!/usr/bin/env node
/**
 * 合规/密钥闸门。
 *
 * --staged   扫描暂存区（pre-commit hook 调用）
 * --selftest 自测扫描器、DISCLOSURE、hook 文件与 core.hooksPath
 */

import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SECRET_PATTERNS = [
  { name: 'GitHub token', regex: /(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/ },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Slack token', regex: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'OpenAI-style key', regex: /sk-[A-Za-z0-9]{24,}/ },
]

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function stagedFiles() {
  const output = git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
  return output === '' ? [] : output.split(/\r?\n/).filter(Boolean)
}

function scanText(file, text) {
  const findings = []
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(text)) findings.push(`${file}: ${pattern.name}`)
  }
  return findings
}

function checkStaged() {
  const findings = []
  for (const file of stagedFiles()) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    let text
    try { text = readFileSync(path, 'utf8') } catch { continue }
    findings.push(...scanText(file, text))
  }
  if (!existsSync(join(ROOT, 'DISCLOSURE'))) findings.push('DISCLOSURE 缺失：禁止提交')
  if (findings.length > 0) {
    console.error('✗ 合规检查失败：')
    for (const finding of findings) console.error('  - ' + finding)
    console.error('修复或移除敏感内容后再提交；如为测试样例，请改成明显的假值。')
    process.exit(1)
  }
  console.log(`✓ 合规检查通过：${stagedFiles().length} 个暂存文件`)
}

function selftest() {
  const fake = 'ghp_' + 'A'.repeat(24)
  const findings = scanText('fixture.js', `const token = '${fake}'\n`)
  if (findings.length !== 1) throw new Error('扫描器未识别 GitHub token 样例')
  if (scanText('fixture.js', 'const token = process.env.GITHUB_TOKEN\n').length !== 0) {
    throw new Error('扫描器把环境变量引用误报为密钥')
  }
  if (!existsSync(join(ROOT, 'DISCLOSURE'))) throw new Error('DISCLOSURE 缺失')
  const hook = join(ROOT, '.githooks', 'pre-commit')
  if (!existsSync(hook)) throw new Error('.githooks/pre-commit 缺失')
  if (!readFileSync(hook, 'utf8').includes('check-compliance.mjs')) throw new Error('pre-commit 未接入扫描器')
  const configured = execFileSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
  if (configured !== '.githooks') {
    throw new Error(`core.hooksPath=${configured || '(空)'}，请运行 node scripts/install-hooks.mjs`)
  }
  console.log('✓ 合规闸门自测通过：扫描器、DISCLOSURE、pre-commit、core.hooksPath')
}

const args = new Set(process.argv.slice(2))
try {
  if (args.has('--selftest')) selftest()
  else checkStaged()
} catch (error) {
  console.error('✗ 合规检查失败：' + (error instanceof Error ? error.message : String(error)))
  process.exit(1)
}
