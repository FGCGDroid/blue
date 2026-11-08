#!/usr/bin/env node
/** 安装仓库级 pre-commit 合规闸门，并验证它确实接在提交路径上。 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' })
execFileSync('node', ['scripts/check-compliance.mjs', '--selftest'], { cwd: root, stdio: 'inherit' })
console.log('✓ git hooks 已安装：.githooks/pre-commit')
