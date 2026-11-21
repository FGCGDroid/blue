import assert from 'node:assert/strict'
import { REMOTE_BAN, normalizeTtl, normalizeAllowIps } from '../v3/domain/remote/config.js'
import { banElementCommand, unbanElementCommand, flushBanCommand } from '../v3/domain/remote/commands.js'

assert.equal(normalizeTtl(undefined), REMOTE_BAN.ttlDefaultSec)
assert.equal(normalizeTtl(1), REMOTE_BAN.ttlMinSec)
assert.equal(normalizeTtl(99999), REMOTE_BAN.ttlMaxSec)
assert.deepEqual(normalizeAllowIps('1.2.3.4, 5.6.7.8, 1.2.3.4,bad ip'), ['1.2.3.4', '5.6.7.8'])
assert.equal(banElementCommand('1.2.3.4', 1800), "nft add element inet blue_guard blocked '{ 1.2.3.4 timeout 1800s }'")
assert.equal(banElementCommand('bad', 1800), null)
assert.equal(unbanElementCommand('1.2.3.4'), "nft delete element inet blue_guard blocked '{ 1.2.3.4 }'")
assert.equal(flushBanCommand(), 'nft flush set inet blue_guard blocked')
console.log('✓ 远程封禁配置/命令：TTL 归一、白名单清洗、nft 命令 全部通过')
