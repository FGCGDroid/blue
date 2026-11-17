/** 资产/告警/发现/IOC 仓储（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../../domain/shared/errors.js'

export class FactsRepo {
  constructor(db) {
    this.db = db
  }

  addAsset() {
    notImplemented('FactsRepo.addAsset', 'M2')
  }

  queryAssets() {
    notImplemented('FactsRepo.queryAssets', 'M2')
  }

  addAlert() {
    notImplemented('FactsRepo.addAlert', 'M2')
  }

  listAlerts() {
    notImplemented('FactsRepo.listAlerts', 'M2')
  }

  addFinding() {
    notImplemented('FactsRepo.addFinding', 'M2')
  }

  listFindings() {
    notImplemented('FactsRepo.listFindings', 'M2')
  }

  addIoc() {
    notImplemented('FactsRepo.addIoc', 'M2')
  }

  listIocs() {
    notImplemented('FactsRepo.listIocs', 'M2')
  }

  getIoc() {
    notImplemented('FactsRepo.getIoc', 'M2')
  }
}
