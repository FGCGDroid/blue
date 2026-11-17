/** SQLite 句柄（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../domain/shared/errors.js'

export class SqliteDb {
  constructor(file) {
    if (typeof file !== 'string' || file === '') throw new Error('SqliteDb: file 不能为空')
    this.file = file
    this.opened = false
  }

  open() {
    notImplemented('SqliteDb.open', 'M2')
  }

  close() {
    this.opened = false
  }
}
