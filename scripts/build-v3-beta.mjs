#!/usr/bin/env node
/** 构建 3.0 beta 试装包：v3 内核 + 2.0 客户端 + 原预设。 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VERSION = '3.0.0-beta.1'
const STAGE = join(ROOT, '.tmp', 'beta-package')
const OUT = join(ROOT, 'dist', `dsh-blue-team-mode-${VERSION}.tgz`)

rmSync(STAGE, { recursive: true, force: true })
mkdirSync(STAGE, { recursive: true })
mkdirSync(join(ROOT, 'dist'), { recursive: true })

for (const entry of ['v3', 'presets', 'skills', 'locale', 'lab']) {
  cpSync(join(ROOT, entry), join(STAGE, entry), { recursive: true })
}
// 不把历史 soak 日志打进安装包。
rmSync(join(STAGE, 'lab', '.run'), { recursive: true, force: true })
for (const file of ['lib/client.js', 'icon.svg', 'README.md', 'LICENSE', 'DISCLOSURE', 'SECURITY.md']) {
  cpSync(join(ROOT, file), join(STAGE, file))
}
// 兼容 DSH 旧解析器：即使它仍按 lib/*.js 找入口，也落到 v3。
for (const [file, target] of [
  ['index.js', '../v3/index.js'],
  ['store.js', '../v3/store.js'],
  ['tools.js', '../v3/tools.js'],
  ['ui.js', '../v3/ui.js'],
]) {
  writeFileSync(join(STAGE, 'lib', file), `export * from '${target}'\nexport { default } from '${target}'\n`, 'utf8')
}
cpSync(join(ROOT, 'cordis.patch.yml'), join(STAGE, 'cordis.patch.yml'))

const base = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const pkg = {
  name: 'dsh-blue-team-mode',
  version: VERSION,
  description: '蓝队防御模式 3.0 beta：75 个工具、保护我的服务器向导、ctf_lab 接入',
  license: base.license,
  author: base.author,
  repository: base.repository,
  homepage: base.homepage,
  bugs: base.bugs,
  type: 'module',
  main: './v3/index.js',
  exports: {
    '.': './v3/index.js',
    './store': './v3/store.js',
    './tools': './v3/tools.js',
    './ui': './v3/ui.js',
    './client': './lib/client.js',
    './package.json': './package.json',
    './locale/*.json': './locale/*.json',
    './icon': './icon.svg',
  },
  files: ['v3', 'lab', 'lib/client.js', 'presets', 'skills', 'locale', 'icon.svg', 'cordis.patch.yml', 'README.md', 'SECURITY.md', 'LICENSE', 'DISCLOSURE'],
  scripts: {
    lab: 'node lab/start.mjs',
    'test:lab': 'node lab/scenarios/acceptance.mjs && node lab/scenarios/vectors.mjs',
  },
  dsh: {
    bundle: { patch: './cordis.patch.yml' },
    client: {
      platform: 'web',
      inject: [
        '@deepseek-ai/dsh-client-ui-sidebar-right',
        '@deepseek-ai/dsh-client-ui-conversation',
        '@deepseek-ai/dsh-client-ui-session',
      ],
    },
  },
  engines: { node: '>=22.13', dsh: '>=0.2.2-rc.3' },
  keywords: ['dsh', 'dsh-plugin', 'blue-team', 'ctf', 'defense', 'beta'],
}
writeFileSync(join(STAGE, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8')

rmSync(OUT, { force: true })
execFileSync('tar', ['-czf', OUT, '-C', STAGE, '.'], { stdio: 'inherit' })
console.log(`✓ beta 包：${OUT}`)
console.log(`  安装：file:${OUT}`)
