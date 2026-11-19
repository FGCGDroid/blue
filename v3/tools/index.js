/**
 * 工具组清单（骨架）。
 *
 * 只负责把各组的 register 串起来；具体工具定义在 M4。
 */
import * as session from './session.js'
import * as asset from './asset.js'
import * as alert from './alert.js'
import * as finding from './finding.js'
import * as ioc from './ioc.js'
import * as task from './task.js'
import * as incident from './incident.js'
import * as decision from './decision.js'
import * as timeline from './timeline.js'
import * as report from './report.js'
import * as decoy from './decoy.js'
import * as detection from './detection.js'
import * as telemetry from './telemetry.js'
import * as control from './control.js'
import * as cve from './cve.js'
import * as risk from './risk.js'
import * as evidence from './evidence.js'
import * as audit from './audit.js'
import * as response from './response.js'
import * as responseExec from './response-exec.js'
import * as policy from './policy.js'
import * as gateway from './gateway.js'
import * as hunt from './hunt.js'
import * as range from './range.js'
import * as protect from './protect.js'
import * as knowledge from './knowledge.js'
import * as review from './review.js'
import * as collector from './collector.js'
import * as artifact from './artifact.js'
import * as remote from './remote.js'

export const TOOL_MODULES = Object.freeze([
  session, asset, alert, finding, ioc, task, incident, decision, timeline, report,
  decoy, detection, telemetry, control, cve, risk, evidence, audit, response,
  responseExec, policy, gateway, hunt, range, protect, knowledge, review, collector, artifact, remote,
])
