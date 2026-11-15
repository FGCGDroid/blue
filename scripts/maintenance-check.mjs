#!/usr/bin/env node
/**
 * 维护巡检机器人：只检查、报告、开 issue，不发布、不合并、不改安全策略。
 *
 * 用法：
 *   node scripts/maintenance-check.mjs
 *   node scripts/maintenance-check.mjs --full
 *   node scripts/maintenance-check.mjs --full --issue
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = process.argv.slice(2)
const full = args.includes('--full')
const issue = args.includes('--issue')
const reportFlag = args.indexOf('--report')
const reportPath = resolve(root, reportFlag >= 0 ? args[reportFlag + 1] : '.tmp/maintenance-report.md')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

function run(command, argv, options = {}) {
  try {
    const useShell = process.platform === 'win32' && /\.cmd$/i.test(command)
    const executable = useShell ? (process.env.ComSpec || 'cmd.exe') : command
    const args = useShell ? ['/d', '/s', '/c', [command, ...argv].join(' ')] : argv
    const out = execFileSync(executable, args, {
      cwd: root,
      encoding: 'utf8',
      timeout: 180000,
      stdio: options.stdio || 'pipe',
    })
    return { ok: true, out: String(out || '') }
  } catch (error) {
    return { ok: false, error: String(error.message || error), out: String(error.stdout || '') }
  }
}

async function json(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'dsh-blue-maintenance' } })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true, data: await res.json() }
  } catch (error) {
    return { ok: false, error: String(error.message || error) }
  }
}

const checks = []
function add(id, status, detail, evidence = '') {
  checks.push({ id, status, detail, evidence: String(evidence).slice(0, 4000) })
}

add('package', 'ok', `${packageJson.name}@${packageJson.version}`)
add('node', 'ok', process.version)
add('engines.dsh', 'ok', packageJson.engines?.dsh || 'not declared')

if (full) {
  for (const [id, command, argv] of [
    ['tests', npmCommand, ['test']],
    ['build', process.execPath, ['scripts/build.mjs']],
    ['validate', process.execPath, ['scripts/validate.mjs']],
    ['compat', process.execPath, ['scripts/test-compat.mjs']],
  ]) {
    const result = run(command, argv)
    add(id, result.ok ? 'ok' : 'fail', result.ok ? '通过' : result.error, result.out.slice(-2500))
  }
  const pack = run(npmCommand, ['pack', '--dry-run'])
  add('package-dry-run', pack.ok ? 'ok' : 'fail', pack.ok ? '通过' : pack.error, pack.out.slice(-1500))
}

const npm = await json('https://registry.npmjs.org/dsh-blue-team-mode/latest')
const npmVersion = npm.ok ? String(npm.data.version || '') : ''
add('npm-latest', npm.ok ? (npmVersion === packageJson.version ? 'ok' : 'warn') : 'unknown',
  npm.ok ? `npm latest=${npmVersion} package=${packageJson.version}` : npm.error)

const catalog = await json('https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json?x=' + Date.now())
let catalogItem = null
if (catalog.ok) {
  const list = Array.isArray(catalog.data.plugins) ? catalog.data.plugins : (Array.isArray(catalog.data.entries) ? catalog.data.entries : [])
  catalogItem = list.find((item) => item && item.name === 'dsh-blue-team-mode') || null
}
const catalogVersions = catalogItem && Array.isArray(catalogItem.versions)
  ? catalogItem.versions.map((item) => String(item.version || '')).filter(Boolean)
  : []
add('catalog', catalog.ok
  ? (catalogVersions.includes(packageJson.version) ? 'ok' : 'warn')
  : 'unknown',
  catalog.ok
    ? `catalog=${catalogVersions.join(', ') || 'missing'} package=${packageJson.version}`
    : catalog.error)

const soakPath = resolve(process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || tmpdir(), '.dsh'), 'blue', 'soak-beta31.state.json')
if (existsSync(soakPath)) {
  try {
    const soak = JSON.parse(readFileSync(soakPath, 'utf8'))
    const target = Number(soak.target_hours || 24)
    const done = Number(soak.elapsed_sec || 0) / 3600
    add('soak', soak.status === 'completed' ? 'ok' : 'warn',
      `status=${soak.status} ${done.toFixed(2)}h/${target}h left=${Math.max(target - done, 0).toFixed(2)}h samples=${soak.samples} integrity=${soak.last_integrity} timeline=${soak.last_timeline_ok}`)
  } catch (error) {
    add('soak', 'unknown', String(error.message || error))
  }
} else {
  add('soak', 'unknown', 'no local soak state on this runner')
}

const failed = checks.filter((item) => item.status === 'fail')
const warnings = checks.filter((item) => item.status === 'warn' || item.status === 'unknown')
const overall = failed.length > 0 ? 'fail' : (warnings.length > 0 ? 'warn' : 'ok')
const markdown = [
  '# 维护巡检',
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 版本：${packageJson.name}@${packageJson.version}`,
  `- 总体：${overall}`,
  '',
  '| 检查 | 状态 | 详情 |',
  '|---|---|---|',
  ...checks.map((item) => `| ${item.id} | ${item.status} | ${String(item.detail).replace(/\|/g, '\\|')} |`),
  '',
].join('\n')
writeFileSync(reportPath, markdown, 'utf8')

async function updateIssue() {
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '')
  const repo = String(process.env.GITHUB_REPOSITORY || '')
  if (!token || !repo) return { ok: false, error: 'GITHUB_TOKEN/GITHUB_REPOSITORY missing' }
  const api = `https://api.github.com/repos/${repo}`
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'dsh-blue-maintenance', 'content-type': 'application/json' }
  const title = '[maintenance] 每日巡检'
  const issues = await fetch(`${api}/issues?state=open&per_page=100`, { headers, signal: AbortSignal.timeout(15000) })
  if (!issues.ok) return { ok: false, error: `list issues HTTP ${issues.status}` }
  const list = await issues.json()
  const existing = Array.isArray(list) ? list.find((item) => item.title === title) : null
  const body = markdown.slice(0, 60000)
  if (existing) {
    const res = await fetch(`${api}/issues/${existing.number}`, { method: 'PATCH', headers, body: JSON.stringify({ body }) })
    return { ok: res.ok, number: existing.number, error: res.ok ? '' : `HTTP ${res.status}` }
  }
  const res = await fetch(`${api}/issues`, { method: 'POST', headers, body: JSON.stringify({ title, body }) })
  const data = res.ok ? await res.json() : null
  return { ok: res.ok, number: data?.number, error: res.ok ? '' : `HTTP ${res.status}` }
}

let issueResult = null
if (issue) issueResult = await updateIssue()
const result = { ok: failed.length === 0, overall, checks, report: reportPath, issue: issueResult }
writeFileSync(reportPath.replace(/\.md$/, '.json'), JSON.stringify(result, null, 2) + '\n', 'utf8')
console.log(JSON.stringify(result, null, 2))
process.exit(failed.length > 0 ? 1 : 0)
