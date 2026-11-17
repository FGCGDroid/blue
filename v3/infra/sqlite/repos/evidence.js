/** 证据/锚定仓储（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../../domain/shared/errors.js'

export class EvidenceRepo {
  constructor(db) {
    this.db = db
  }

  addAnchor() {
    notImplemented('EvidenceRepo.addAnchor', 'M2')
  }

  listAnchors() {
    notImplemented('EvidenceRepo.listAnchors', 'M2')
  }

  verify() {
    notImplemented('EvidenceRepo.verify', 'M2')
  }
}
