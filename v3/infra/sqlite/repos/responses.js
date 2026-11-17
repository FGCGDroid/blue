/** 响应动作仓储（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../../domain/shared/errors.js'

export class ResponsesRepo {
  constructor(db) {
    this.db = db
  }

  plan() {
    notImplemented('ResponsesRepo.plan', 'M2')
  }

  get() {
    notImplemented('ResponsesRepo.get', 'M2')
  }

  list() {
    notImplemented('ResponsesRepo.list', 'M2')
  }

  update() {
    notImplemented('ResponsesRepo.update', 'M2')
  }

  verify() {
    notImplemented('ResponsesRepo.verify', 'M2')
  }
}
