/**
 * 3.0 SQLite 句柄（M2 基础）。
 *
 * 负责：
 *   - 打开/关闭 blue.db
 *   - 建基础 schema
 *   - 2.0 -> 3.0 幂等迁移
 *   - 迁移前备份（只备份非 3.0 库）
 *   - 事务与预编译语句缓存
 *
 * 不做业务判断；任务/时间线逻辑在 repos。
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { BASE_SCHEMA } from './migrations/001-base.js'
import { applyFrom20 } from './migrations/002-from-2.0.js'
import { BlueError } from '../../domain/shared/errors.js'

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function quoteSqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'"
}

export class SqliteDb {
  constructor(file) {
    if (typeof file !== 'string' || file === '') throw new Error('SqliteDb: file 不能为空')
    this.file = file
    this.db = null
    this.stmts = new Map()
    this.closed = false
  }

  open() {
    if (this.db !== null) return this
    mkdirSync(dirname(this.file), { recursive: true })
    const existed = existsSync(this.file) && statSync(this.file).size > 0
    this.db = new DatabaseSync(this.file)

    const existingVersion = existed ? this.readSchemaVersion() : ''
    if (existed && existingVersion !== '3.0') this.backupBeforeMigration()

    try {
      this.db.exec(BASE_SCHEMA)

      const version = this.getMeta('schema_version', '')
      if (version !== '' && version !== '3.0') {
        throw new BlueError('SCHEMA_VERSION', `不支持的 schema_version：${version}`)
      }

      this.transaction(() => {
        applyFrom20(this.db)
        this.setMeta('schema_version', '3.0')
      })

      const check = this.db.prepare('PRAGMA integrity_check').get()
      const result = check ? Object.values(check)[0] : 'unknown'
      if (result !== 'ok') {
        throw new BlueError('INTEGRITY_CHECK', `数据库完整性检查失败：${result}`)
      }
      return this
    } catch (error) {
      this.close()
      throw error
    }
  }

  /** 在 schema 建表之前读版本；没有 meta 表就是 2.0/空库。 */
  readSchemaVersion() {
    const table = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meta'").get()
    if (table === undefined) return ''
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get()
    return row === undefined ? '' : String(row.value)
  }

  backupBeforeMigration() {
    const dir = join(dirname(this.file), 'backups')
    mkdirSync(dir, { recursive: true })
    const target = join(dir, `blue-pre-3.0-${stamp()}.db`)
    if (existsSync(target)) throw new BlueError('BACKUP_EXISTS', `备份文件已存在：${target}`)
    this.db.exec(`VACUUM INTO ${quoteSqlString(target)}`)
    this.lastBackup = target
    return target
  }

  sql(text) {
    if (this.db === null) throw new Error('SqliteDb: 未打开')
    let stmt = this.stmts.get(text)
    if (stmt === undefined) {
      stmt = this.db.prepare(text)
      this.stmts.set(text, stmt)
    }
    return stmt
  }

  exec(text) {
    if (this.db === null) throw new Error('SqliteDb: 未打开')
    this.db.exec(text)
  }

  transaction(fn) {
    if (this.db === null) throw new Error('SqliteDb: 未打开')
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      try { this.db.exec('ROLLBACK') } catch { /* 保留原始错误 */ }
      throw error
    }
  }

  getMeta(key, fallback = null) {
    const row = this.sql('SELECT value FROM meta WHERE key = ?').get(key)
    return row === undefined ? fallback : row.value
  }

  setMeta(key, value) {
    this.sql(`INSERT INTO meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, String(value))
  }

  close() {
    if (this.db === null) return
    this.stmts.clear()
    this.db.close()
    this.db = null
    this.closed = true
  }
}
