#!/usr/bin/env node
/**
 * 3.0 M2 事实/案件仓储测试。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BlueStoreV3 } from '../v3/store.js'

const root = mkdtempSync(join(tmpdir(), 'blue-v3-facts-'))
let store

try {
  store = new BlueStoreV3(root)
  const engagementId = 'ENG-FACTS'

  const asset1 = store.facts.addAsset(engagementId, {
    kind: 'host', name: 'web-01', address: '10.0.0.5', port: 443, criticality: 'high', tags: ['edge'],
  })
  const asset2 = store.facts.addAsset(engagementId, {
    kind: 'host', name: 'web-01-renamed', address: '10.0.0.5', port: 443,
  })
  assert.equal(asset1.id, asset2.id)
  assert.equal(asset2.name, 'web-01-renamed')
  assert.deepEqual(asset2.tags, ['edge'])
  assert.equal(store.facts.queryAssets(engagementId, { criticality: 'high' }).length, 1)

  const alert1 = store.facts.addAlert(engagementId, {
    title: 'fixture alert', severity: 'high', source: 'fixture', raw: '{"x":1}', external_id: 'e1',
  })
  const alert2 = store.facts.addAlert(engagementId, {
    title: 'fixture alert', severity: 'critical', source: 'fixture', raw: '{"x":1}', external_id: 'e1',
  })
  assert.equal(alert1.id, alert2.id)
  assert.equal(alert1.inserted, true)
  assert.equal(alert2.inserted, false)
  assert.equal(alert2.severity, 'critical')
  assert.equal(store.facts.listAlerts(engagementId, { severity: 'critical' }).length, 1)

  const finding = store.facts.addFinding(engagementId, {
    title: 'fixture finding', severity: 'high', category: 'webshell', evidence: 'synthetic',
  })
  const updatedFinding = store.facts.updateFinding(finding.id, { status: 'fixed', actor: 'tester' })
  assert.equal(updatedFinding.status, 'fixed')

  const ioc1 = store.facts.addIoc(engagementId, { type: 'domain', value: 'Example.Test.', confidence: 'high' })
  const ioc2 = store.facts.addIoc(engagementId, { type: 'domain', value: 'example.test', source: 'fixture' })
  assert.equal(ioc1.id, ioc2.id)
  assert.equal(ioc2.value, 'example.test')
  assert.equal(ioc2.source, 'fixture')
  assert.equal(store.facts.listIocs(engagementId, { type: 'domain' }).length, 1)

  const incident = store.incidents.open(engagementId, {
    title: 'fixture incident', severity: 'high', owner: 'tester',
  })
  assert.equal(incident.status, 'open')
  const task = store.tasks.create(engagementId, { role: 'monitor', title: 'attach task' })
  const attached = store.incidents.attach(incident.id, {
    alert_id: alert1.id, finding_id: finding.id, task_id: task.id, actor: 'tester',
  })
  assert.equal(attached.attached.length, 3)
  assert.equal(store.facts.getFinding(finding.id).incident_id, incident.id)
  assert.equal(store.tasks.get(task.id).incident_id, incident.id)

  const contained = store.incidents.update(incident.id, { status: 'contained', actor: 'tester' })
  assert.equal(contained.status, 'contained')
  assert.throws(
    () => store.incidents.update(incident.id, { status: 'open' }),
    (error) => error.code === 'INCIDENT_TRANSITION',
  )

  const verify = store.timeline.verify(engagementId)
  assert.equal(verify.ok, true, JSON.stringify(verify))
  assert.ok(verify.checked >= 8)

  console.log('✓ v3 事实/案件仓储通过：资产去重/告警去重/发现/IOC/案件/关联/时间线')
} finally {
  if (store) store.close()
  rmSync(root, { recursive: true, force: true })
}
