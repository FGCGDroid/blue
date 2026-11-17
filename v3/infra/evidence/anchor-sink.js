/**
 * 外锚 sink（M3.5）。
 *
 * 支持：
 *   file  JSONL 追加
 *   https 只允许白名单域名、只允许 https、不跟随重定向、5 秒超时
 *
 * sink 失败不回滚本地锚点；调用方把结果写进 decision/日志。
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { isIP } from 'node:net'
import { dirname } from 'node:path'
import { BlueError } from '../../domain/shared/errors.js'

function hostOf(url) {
  return url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

function hostAllowed(host, allowHosts) {
  return allowHosts.some((entry) => {
    const allowed = String(entry || '').toLowerCase()
    if (allowed.startsWith('*.')) return host === allowed.slice(2) || host.endsWith(allowed.slice(1))
    return host === allowed
  })
}

export function validateSink(sink) {
  if (sink === null || typeof sink !== 'object') throw new BlueError('ANCHOR_SINK', 'sink 必须是对象')
  if (sink.kind === 'file') {
    const path = String(sink.path || '').trim()
    if (path === '') throw new BlueError('ANCHOR_SINK', 'file sink 缺少 path')
    return { kind: 'file', path }
  }
  if (sink.kind === 'https') {
    let url
    try {
      url = new URL(String(sink.url || ''))
    } catch {
      throw new BlueError('ANCHOR_SINK', 'https sink URL 非法')
    }
    if (url.protocol !== 'https:') throw new BlueError('ANCHOR_SINK', '只允许 https')
    if (url.username !== '' || url.password !== '') throw new BlueError('ANCHOR_SINK', 'URL 不能带凭据')
    if (isIP(hostOf(url)) !== 0) throw new BlueError('ANCHOR_SINK', '不允许 IP 直连')
    const allowHosts = Array.isArray(sink.allow_hosts) ? sink.allow_hosts : []
    if (allowHosts.length === 0) throw new BlueError('ANCHOR_SINK', 'https sink 必须配置 allow_hosts')
    if (!hostAllowed(hostOf(url), allowHosts)) throw new BlueError('ANCHOR_SINK', `域名不在白名单：${hostOf(url)}`)
    return { kind: 'https', url: url.toString(), allow_hosts: allowHosts }
  }
  throw new BlueError('ANCHOR_SINK', `不支持的 sink 类型：${sink.kind}`)
}

export async function pushAnchor(sink, anchor) {
  let normalized
  try {
    normalized = validateSink(sink)
  } catch (error) {
    return { ok: false, kind: sink && sink.kind ? sink.kind : '', error: error.message }
  }

  if (normalized.kind === 'file') {
    try {
      mkdirSync(dirname(normalized.path), { recursive: true })
      appendFileSync(normalized.path, JSON.stringify(anchor) + '\n', 'utf8')
      return { ok: true, kind: 'file', path: normalized.path }
    } catch (error) {
      return { ok: false, kind: 'file', path: normalized.path, error: error.message }
    }
  }

  try {
    const response = await fetch(normalized.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(anchor),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    })
    const text = await response.text()
    if (!response.ok) {
      return { ok: false, kind: 'https', status: response.status, error: `HTTP ${response.status}`, receipt: text.slice(0, 300) }
    }
    return { ok: true, kind: 'https', status: response.status, receipt: text.slice(0, 300) }
  } catch (error) {
    return { ok: false, kind: 'https', error: error.message }
  }
}

export async function pushToSinks(sinks = [], anchor) {
  const results = []
  for (const sink of Array.isArray(sinks) ? sinks : []) {
    results.push(await pushAnchor(sink, anchor))
  }
  return results
}
