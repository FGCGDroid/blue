/** 遥测源仓储（3.0 骨架，M2 实现）。 */
import { notImplemented } from '../../../domain/shared/errors.js'

export class TelemetryRepo {
  constructor(db) {
    this.db = db
  }

  addSource() {
    notImplemented('TelemetryRepo.addSource', 'M2')
  }

  listSources() {
    notImplemented('TelemetryRepo.listSources', 'M2')
  }

  saveCursor() {
    notImplemented('TelemetryRepo.saveCursor', 'M2')
  }

  markError() {
    notImplemented('TelemetryRepo.markError', 'M2')
  }
}
