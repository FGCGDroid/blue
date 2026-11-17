#!/usr/bin/env node
/**
 * 3.0 迁移回滚：把迁移前备份恢复成 blue.db。
 *
 * 必须在 Host 与网关停止后执行。
 */
import { copyFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function latestBackup(root) {
  const dir = join(root, 'backups')
  if (!existsSync(dir)) return null
  const files = readdirSync(dir)
    .filter((name) => /^blue-pre-3\.0-.*\.db$/.test(name))
    .map((name) => {
      const path = join(dir, name)
      return { path, mtime: statSync(path).mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)
  return files.length === 0 ? null : files[0].path
}

export function rollback(root, backupPath = latestBackup(root)) {
  if (typeof root !== 'string' || root === '') throw new Error('root 不能为空')
  if (!backupPath || !existsSync(backupPath)) throw new Error('没有可用的迁移备份')
  const target = join(root, 'blue.db')
  copyFileSync(backupPath, target)
  rmSync(target + '-wal', { force: true })
  rmSync(target + '-shm', { force: true })
  return { root, target, backup: backupPath }
}

function defaultRoot() {
  if (process.env.BLUE_HOME) return process.env.BLUE_HOME
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'blue')
}

export function main(argv = process.argv.slice(2)) {
  const rootIndex = argv.indexOf('--root')
  const backupIndex = argv.indexOf('--backup')
  const root = resolve(rootIndex >= 0 && argv[rootIndex + 1] ? argv[rootIndex + 1] : defaultRoot())
  const backup = backupIndex >= 0 && argv[backupIndex + 1] ? resolve(argv[backupIndex + 1]) : latestBackup(root)
  try {
    const result = rollback(root, backup)
    console.log(JSON.stringify({ ok: true, ...result }, null, 2))
    return 0
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }))
    return 1
  }
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false

if (isMain) {
  process.exitCode = main()
}
