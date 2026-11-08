/**
 * 生成 cordis.patch.yml。
 *
 * 为什么不把 6 个角色的预设直接抄进 patch：
 *   · 预设正文是 YAML，嵌进 patch 的 `plugins:` 需要整体缩进；
 *   · 六个角色只有标题/profile 两处不同，模板化后不易漂移；
 *   · DSH 0.1.7 起预设只认 `@deepseek-ai/dsh-agent-preset` 声明行，
 *     不再扫描 `$DSH_HOME/.agent-presets/`，所以声明必须写进 patch。
 *
 * 运行：node scripts/build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function metadata(rel) {
  const text = read(rel)
  const name = /^name:[ \t]*(.*)$/m.exec(text)
  const description = /^description:[ \t]*(.*)$/m.exec(text)
  if (name === null || description === null) throw new Error(rel + ' 缺少 name 或 description')
  return { name: name[1].trim(), description: description[1].trim() }
}

const mainMeta = metadata('presets/blue/preset.yml')
const workerMeta = metadata('presets/blue/worker.preset.yml')
const mainPlugins = read('presets/blue/agent.cordis.yml')
const workerTemplate = read('presets/blue/worker.cordis.yml')

const ROLES = [
  { role: 'monitor', title: '监控值守' },
  { role: 'intel', title: '情报分析' },
  { role: 'hunt', title: '威胁狩猎' },
  { role: 'ir', title: '应急响应' },
  { role: 'forensics', title: '取证分析' },
  { role: 'hardening', title: '加固修复' },
]

/** 把一段预设 YAML 缩进到 patch 的 plugins 子节点下。 */
function indentPlugins(text) {
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : '          ' + line))
    .join('\n')
}

function declarePreset({ entryId, id, name, description, order, plugins }) {
  return `- insert:
    - id: ${entryId}
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: ${id}
        name: ${JSON.stringify(name)}
        description: ${JSON.stringify(description)}
        order: ${order}
        plugins:
${indentPlugins(plugins)}
`
}

function renderWorker(role, title, profile) {
  return workerTemplate
    .split('__ROLE_TITLE__').join(title)
    .split('__ROLE_PROFILE__').join(profile)
}

const declarations = []
declarations.push(declarePreset({
  entryId: 'preset-blue',
  id: 'blue',
  name: mainMeta.name,
  description: mainMeta.description,
  order: 20,
  plugins: mainPlugins,
}))
declarations.push(declarePreset({
  entryId: 'preset-blue-worker',
  id: 'blue-worker',
  name: workerMeta.name,
  description: workerMeta.description,
  order: 96,
  plugins: renderWorker('all', '蓝队全工具', 'all'),
}))
ROLES.forEach((item, index) => {
  declarations.push(declarePreset({
    entryId: 'preset-blue-worker-' + item.role,
    id: 'blue-worker-' + item.role,
    name: '蓝队执行角色 · ' + item.title,
    description: '蓝队' + item.title + '执行预设：由主会话自动选用，按角色裁剪工具；请不要手动选择。',
    order: 97 + index,
    plugins: renderWorker(item.role, item.title, item.role),
  }))
})

const header = `# dsh-blue-team-mode bundle patch
#
# 由 scripts/build.mjs 生成，不要手改；改预设请改 presets/blue/*.yml 后重跑。
#
# 行组成：
#   1. host 自举：路径/技能同步 + 进程级 ctx.blueTeamMode
#   2. SQLite 事实库：进程级 ctx.blueTeam（$DSH_HOME/blue/blue.db）
#   3. 预设声明：蓝队指挥官 + 全工具执行角色 + 六个按角色裁剪的执行变体
#
# 预设声明是 DSH 0.1.7+ 唯一认可的注册方式；工具行里的
# dsh-blue-team-mode/tools 由 profile 安装的包解析。

# 1) host 自举 + 事实库
- insert:
    - id: blue-mode
      name: dsh-blue-team-mode
    - id: blue-mode-store
      name: dsh-blue-team-mode/store
      config:
        root: !!js dshHomePath('blue')
    - id: blue-mode-ui
      name: dsh-blue-team-mode/ui

# 2) 预设声明
`

writeFileSync(join(root, 'cordis.patch.yml'), header + declarations.join('\n'), 'utf8')
console.log('✓ cordis.patch.yml 已生成（1 个主预设 + 1 个全工具执行预设 + ' + ROLES.length + ' 个角色变体）')
