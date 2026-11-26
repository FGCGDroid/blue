#!/usr/bin/env node
// 告警库清理：
//   node scripts/purge-alerts.mjs --all        备份后清空 alerts 表
//   node scripts/purge-alerts.mjs --closed     删除已关闭/误报（默认保留最近 60 分钟）
//   node scripts/purge-alerts.mjs --closed --interval 600   常驻，每 10 分钟清一次
import { DatabaseSync } from 'node:sqlite'
import { copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ALL = process.argv.includes('--all')
const index = process.argv.indexOf('--interval')
const INTERVAL = index >= 0 ? Math.max(Number(process.argv[index + 1]) || 0, 0) : 0

function purge() {
  const dbPath = join(homedir(), '.dsh', 'blue', 'blue.db')
  copyFileSync(dbPath, dbPath + '.alerts-backup.' + Date.now())
  const db = new DatabaseSync(dbPath)
  const before = db.prepare('SELECT COUNT(*) c FROM alerts').get().c
  if (ALL) {
    db.exec('DELETE FROM alerts')
  } else {
    db.prepare("DELETE FROM alerts WHERE status IN ('closed','false_positive') AND created_at < datetime('now','-60 minutes')").run()
  }
  const after = db.prepare('SELECT COUNT(*) c FROM alerts').get().c
  db.close()
  console.log(`[${new Date().toISOString()}] alerts ${before} -> ${after}${ALL ? ' (全部清除)' : ' (仅清理已处理)'}`)
}

purge()
if (INTERVAL > 0) {
  console.log('常驻模式，间隔 ' + INTERVAL + ' 秒')
  setInterval(purge, INTERVAL * 1000)
}
