import { createInterface } from 'node:readline/promises'
import { readFileSync, writeFileSync } from 'node:fs'
import { stdin, stdout } from 'node:process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const piped = !stdin.isTTY
const lines = piped ? readFileSync(0, 'utf8').split(/\r?\n/) : []
let li = 0
const rl = piped ? null : createInterface({ input: stdin, output: stdout })

const ask = async (q, def = '') => {
  let a = ''
  if (piped) a = (lines[li++] || '').trim()
  else a = (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim()
  return a || def
}
const say = (s = '') => console.log(s)

say('========================================')
say('  远程防控中心 · 配置向导')
say('========================================')
say('')

const port = Number(await ask('网页端口', '8090')) || 8090
const token = await ask('访问 token（留空自动生成）', Math.random().toString(36).slice(2, 10))
const webhook = await ask('钉钉 webhook（可留空）', '')
const keyword = await ask('钉钉关键词', '蓝队汇报')
say('')

const hosts = []
while (true) {
  say(`--- 添加被控机（第 ${hosts.length + 1} 台，直接回车结束）---`)
  const name = await ask('名称', '')
  if (!name) break
  const host = await ask('IP 或域名', '')
  if (!host) break
  const hport = Number(await ask('SSH 端口', '22')) || 22
  const user = await ask('SSH 用户', 'root')
  const auth = (await ask('认证方式 key/password', 'key')).toLowerCase()
  let password = ''
  if (auth.startsWith('p')) password = await ask('SSH 密码', '')
  const siteUrl = await ask('站点地址（可空，如 https://example.com/）', '')
  const nginxConf = await ask('nginx 配置路径（可空，启用网页诱饵）', '')
  const entry = { name, host, port: hport, user }
  if (password) entry.password = password
  if (siteUrl) {
    entry.siteUrl = siteUrl
    try { entry.hostHeader = new URL(siteUrl).hostname } catch { /* ignore */ }
  }
  if (nginxConf) entry.nginxConf = nginxConf
  hosts.push(entry)
  say(`已添加：${name} (${host})`)
  say('')
}

const keyPath = await ask('SSH 私钥路径（密码模式可留空）', join(homedir(), '.ssh', 'id_ed25519'))
say('')
say('是否开启自动防御？')
const autoDef = (await ask('自动封禁 + nft/fail2ban（y/n）', 'y')).toLowerCase().startsWith('y')
const webDef = (await ask('网页诱饵（需要填了 nginx 配置路径）（y/n）', 'n')).toLowerCase().startsWith('y')

const cfg = {
  hub: { port, bind: '127.0.0.1', token },
  db: './hub.db',
  intervalSec: 120,
  cooldownSec: 600,
  retentionDays: 30,
  ssh: { user: 'root', key: keyPath, timeout: 8000 },
  dingtalk: { webhook, keyword },
  thresholds: { load: 4, disk: 85, e5: 20, authDelta: 20, banDelta: 30 },
  defense: { enabled: autoDef, autoBan: autoDef, maxPerCycle: 10, ttl: '24h', ignore: [], web: { enabled: webDef } },
  hosts,
}

writeFileSync(new URL('./config.json', import.meta.url), JSON.stringify(cfg, null, 2))
say('')
say(`配置已写入 config.json，共 ${hosts.length} 台被控机。`)
say(`页面：http://127.0.0.1:${port}/?token=${token}`)
say('')
if (rl) rl.close()
