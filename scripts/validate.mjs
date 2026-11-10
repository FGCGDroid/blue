/**
 * 离线校验 bundle 结构与预设声明（不启动 DSH）。
 *
 * 运行：node scripts/validate.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []

/** 优先用当前 profile 的 yaml 包；找不到就跳过结构性 YAML 校验。 */
async function loadYaml() {
  try {
    return (await import('yaml')).default
  } catch { /* fall through */ }
  const candidates = [
    process.env.DSH_PROFILE_DIR ? join(process.env.DSH_PROFILE_DIR, 'node_modules/yaml/dist/index.js') : null,
    join(process.env.DSH_HOME || '', 'profiles/desktop/node_modules/yaml/dist/index.js'),
  ].filter((path) => typeof path === 'string' && path !== '' && existsSync(path))
  for (const path of candidates) {
    try {
      return (await import(pathToFileURL(path).href)).default
    } catch { /* next */ }
  }
  return null
}

const YAML = await loadYaml()
if (YAML === null) {
  console.warn('! 未找到 yaml 包，跳过 patch 结构校验；继续校验技能/本地化/包结构')
}

function check(condition, label) {
  if (condition) {
    console.log('✓ ' + label)
  } else {
    failures.push(label)
    console.error('✗ ' + label)
  }
}

if (YAML !== null) {
const patchText = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
const patch = YAML.parse(patchText.replace(/!!js[^\r\n]*/g, 'js-expression'))

check(Array.isArray(patch) && patch.length === 9, 'patch 顶层是 9 个 insert（1 host + 8 预设）')
const insertRows = patch.filter((entry) => Array.isArray(entry.insert)).flatMap((entry) => entry.insert)
check(insertRows.some((row) => row.id === 'blue-mode' && row.name === 'dsh-blue-team-mode'), 'host 自举行存在')
check(insertRows.some((row) => row.id === 'blue-mode-store' && row.name === 'dsh-blue-team-mode/store'), 'SQLite store 行存在')
check(insertRows.some((row) => row.id === 'blue-mode-ui' && row.name === 'dsh-blue-team-mode/ui'), '右侧栏控制台 Host 行存在')

const presets = insertRows.filter((row) => row.name === '@deepseek-ai/dsh-agent-preset')
check(presets.length === 8, '预设声明共 8 条（1 主 + 1 全工具 + 6 角色）')
const ids = presets.map((row) => row.config.id).sort()
check(ids.join(',') === [
  'blue', 'blue-worker', 'blue-worker-forensics', 'blue-worker-hardening',
  'blue-worker-hunt', 'blue-worker-intel', 'blue-worker-ir', 'blue-worker-monitor',
].sort().join(','), '预设 id 完整')

for (const row of presets) {
  const config = row.config
  check(typeof config.name === 'string' && config.name.length > 0, config.id + ' 有显示名')
  check(typeof config.description === 'string' && config.description.length > 0, config.id + ' 有描述')
  check(Array.isArray(config.plugins) && config.plugins.length > 0, config.id + ' 有 plugins')
  const persona = config.plugins.find((plugin) => plugin.id === 'persona')
  check(persona !== undefined, config.id + ' 有 persona')
  const tools = config.plugins.find((plugin) => plugin.name === 'dsh-blue-team-mode/tools')
  check(tools !== undefined, config.id + ' 挂载 blue tools')
  if (config.id !== 'blue') {
    check(tools !== undefined && tools.config && typeof tools.config.profile === 'string', config.id + ' 有角色 profile')
    check(config.plugins.every((plugin) => !String(plugin.name).includes('dsh-tool-subagent')), config.id + ' 无委派工具')
  }
}

const main = presets.find((row) => row.config.id === 'blue').config
const subagent = main.plugins.find((plugin) => plugin.id === 'tool-subagent')
check(subagent !== undefined && subagent.config.agentPreset === 'blue-worker', '主预设委派到 blue-worker')
check(subagent !== undefined && Array.isArray(subagent.config.allowedAgentPresets) && subagent.config.allowedAgentPresets.length === 7, '允许 7 个执行预设')

const placeholders = patchText.match(/__ROLE_(?:TITLE|PROFILE)__/g)
check(placeholders === null, 'patch 无未替换占位符')

const workerText = readFileSync(join(root, 'presets/blue/worker.cordis.yml'), 'utf8')
check(workerText.includes('__ROLE_TITLE__') && workerText.includes('__ROLE_PROFILE__'), 'worker 源模板保留占位符')
}

const skills = readdirSync(join(root, 'skills')).filter((file) => file.endsWith('.md'))
check(skills.length === 17, '技能数量 = 17（实际 ' + skills.length + '）')
for (const file of skills) {
  const text = readFileSync(join(root, 'skills', file), 'utf8')
  check(/^---\r?\n/.test(text) && /^name:/m.test(text) && /^description:/m.test(text), file + ' 有 frontmatter')
}

for (const locale of ['en', 'zh']) {
  const data = JSON.parse(readFileSync(join(root, 'locale', locale + '.json'), 'utf8'))
  check(typeof data.meta?.title === 'string' && typeof data.meta?.description === 'string', 'locale ' + locale + ' 完整')
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
check(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'package.json 声明 bundle patch')
check(typeof pkg.exports['./tools'] === 'string', 'package.json 导出 ./tools')
check(typeof pkg.exports['./ui'] === 'string', 'package.json 导出 ./ui')
check(typeof pkg.exports['./client'] === 'string', 'package.json 导出 ./client')
check(pkg.dsh?.client?.platform === 'web', 'package.json 声明 web client')
check(existsSync(join(root, 'lib/client.js')), 'client.js 存在')
check(readFileSync(join(root, 'lib/client.js'), 'utf8').includes('__ModuleLoader__'), 'client.js 使用客户端模块格式')
check(existsSync(join(root, 'lib/ui.js')), 'ui.js 存在')

if (failures.length > 0) {
  console.error('\n校验失败：' + failures.length + ' 项')
  process.exit(1)
}
console.log('\n全部校验通过。')
