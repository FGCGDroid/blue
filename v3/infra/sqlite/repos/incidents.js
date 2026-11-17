/** 案件仓储（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../../domain/shared/errors.js'

export class IncidentsRepo {
  constructor(db) {
    this.db = db
  }

  open() {
    notImplemented('IncidentsRepo.open', 'M2')
  }

  get() {
    notImplemented('IncidentsRepo.get', 'M2')
  }

  list() {
    notImplemented('IncidentsRepo.list', 'M2')
  }

  update() {
    notImplemented('IncidentsRepo.update', 'M2')
  }

  attach() {
    notImplemented('IncidentsRepo.attach', 'M2')
  }
}
