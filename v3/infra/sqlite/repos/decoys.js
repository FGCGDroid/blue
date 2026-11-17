/** 诱饵仓储（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../../domain/shared/errors.js'

export class DecoysRepo {
  constructor(db) {
    this.db = db
  }

  create() {
    notImplemented('DecoysRepo.create', 'M2')
  }

  get() {
    notImplemented('DecoysRepo.get', 'M2')
  }

  list() {
    notImplemented('DecoysRepo.list', 'M2')
  }

  update() {
    notImplemented('DecoysRepo.update', 'M2')
  }

  addHit() {
    notImplemented('DecoysRepo.addHit', 'M2')
  }

  sync() {
    notImplemented('DecoysRepo.sync', 'M2')
  }
}
