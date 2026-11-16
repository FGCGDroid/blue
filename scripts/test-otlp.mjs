import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BlueStore } from '../lib/store.js'
import { ingestOtlp, otlpAuthorized } from '../lib/otlp.js'

const root = mkdtempSync(join(tmpdir(), 'blue-otlp-'))
const store = new BlueStore(root)
const engagement = store.openEngagement('otlp-test', ['127.0.0.1'])
const payload = {
  resourceLogs: [{
    resource: { attributes: [{ key: 'service.name', value: { stringValue: 'checkout' } }] },
    scopeLogs: [{
      scope: { name: 'test' },
      logRecords: [{
        timeUnixNano: '1763222400000000000',
        severityNumber: 17,
        severityText: 'ERROR',
        body: { stringValue: 'payment failed' },
        attributes: [{ key: 'net.peer.ip', value: { stringValue: '127.0.0.1' } }],
      }],
    }],
  }],
}
const first = ingestOtlp(store, engagement.id, payload)
const second = ingestOtlp(store, engagement.id, payload)
const alert = store.listAlerts(engagement.id, { limit: 10 })[0]
const source = alert.source
const severity = alert.severity
store.close()
rmSync(root, { recursive: true, force: true })

const previous = process.env.BLUE_OTLP_TOKEN
process.env.BLUE_OTLP_TOKEN = 'secret-token'
const auth = otlpAuthorized({ authorization: 'Bearer secret-token' })
const noAuth = otlpAuthorized({})
if (previous === undefined) delete process.env.BLUE_OTLP_TOKEN
else process.env.BLUE_OTLP_TOKEN = previous

const ok = first.inserted === 1 && second.duplicates === 1 && source === 'otel:checkout' && severity === 'high' && auth && !noAuth
console.log(JSON.stringify({ ok, first, second, source, severity, auth, noAuth }, null, 2))
if (!ok) process.exit(1)
