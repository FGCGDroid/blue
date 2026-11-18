/**
 * 3.0 工具入口（M4.0）。
 *
 * M4.0 只注册 session 6 + asset 2 + alert 3；其余组保持骨架。
 * 所有工具统一经过 self-check 门禁，工具层不写 SQL。
 */
import { TOOL_MODULES } from './tools/index.js'
import { ALL_TOOL_NAMES, EXISTING_TOOL_NAMES, NEW_TOOL_NAMES } from './tools/catalog.js'
import { withSelfCheck } from './tools/guard.js'
import { readJsonl } from './infra/fs/jsonl.js'
import { readArtifact, readText } from './infra/fs/artifact.js'
import { readEvidenceFile, writeEvidenceFile } from './infra/fs/evidence-file.js'
import { writeReportFile } from './infra/fs/report-file.js'
import { loadPolicy } from './infra/policy/store.js'
import { pushToSinks } from './infra/evidence/anchor-sink.js'
import { loadConfig } from './bootstrap/config.js'

export const name = 'blue-tools-v3'

export const inject = ['blueTeamV3', 'tools']

export function apply(ctx) {
  const store = typeof ctx.get === 'function' ? ctx.get('blueTeamV3') : ctx.blueTeamV3
  if (!store) throw new Error('blue-tools-v3: 缺少 blueTeamV3 服务')
  const registeredNames = []
  const env = {
    ctx,
    store,
    get ctfLab() {
      return typeof ctx.get === 'function' ? ctx.get('ctfLab') : ctx.ctfLab
    },
    registeredNames,
    readJsonl: (file, options) => readJsonl(file, { root: store.root, ...options }),
    readText: (file, options) => readText(file, { root: store.root, ...options }),
    readArtifact: (file, options) => readArtifact(file, { root: store.root, ...options }),
    writeEvidence: (bundle, name) => writeEvidenceFile(store.root, bundle, name),
    readEvidence: (path) => readEvidenceFile(store.root, path),
    writeReport: (markdown, name) => writeReportFile(store.root, markdown, name),
    loadPolicy,
    pushToSinks,
    gatewayConfig: (() => {
      try { return loadConfig(process.env) } catch { return null }
    })(),
  }

  const register = (definition) => {
    const guarded = withSelfCheck(definition)
    registeredNames.push(definition.name)
    const install = () => ctx.tools.register(guarded)
    if (typeof ctx.effect === 'function') ctx.effect(install)
    else install()
  }

  for (const module of TOOL_MODULES) module.register(register, env)
  ctx.logger?.info?.(
    'blue-tools-v3: 已注册 %d 个工具（M4.0 计划 %d；现有 %d + 新增 %d = %d）',
    registeredNames.length,
    ALL_TOOL_NAMES.length,
    EXISTING_TOOL_NAMES.length,
    NEW_TOOL_NAMES.length,
    ALL_TOOL_NAMES.length,
  )
}

export default { name, inject, apply }
