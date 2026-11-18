/** 工具组：狩猎/取证/加固（M4.5）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'hunt'

const PLAYBOOKS = [
  { id: 'webshell', title: 'WebShell 排查', steps: ['确认访问日志/文件落点', '只读取样本与哈希', '隔离前先审批', '清理后复测'] },
  { id: 'bruteforce', title: '暴力破解处置', steps: ['确认来源与目标', '统计失败窗口', '封禁走高风险审批', '保留原始日志'] },
  { id: 'exposure', title: '暴露面收敛', steps: ['资产/端口核对', '确认业务必要性', '变更走审批', '复测暴露面'] },
  { id: 'containment', title: '主机隔离', steps: ['确认影响面', '保留证据', '人工审批', '执行后验证'] },
  { id: 'phishing', title: '钓鱼邮件', steps: ['保留邮件原文', '提取 IOC', '排查点击/登录', '通知与复盘'] },
]

const LOG_PATTERNS = [
  { id: 'webshell', label: 'WebShell/命令执行', regex: /(?:eval|assert|system|passthru|shell_exec)\s*\(|cmd\.exe|\/bin\/(?:ba)?sh/i, severity: 'high' },
  { id: 'sqli', label: 'SQL 注入特征', regex: /(?:'\s*(?:or|and)\s*['"]?\d|"\s*(?:or|and)\s*["']?\d|\b(?:or|and)\s+1\s*=\s*1\b|\bunion\b[\s+]+select\b|\bsleep\s*\(|\bbenchmark\s*\(|information_schema)/i, severity: 'high' },
  { id: 'scanner', label: '扫描器', regex: /(?:sqlmap|nikto|nuclei|masscan|nmap|gobuster|dirsearch)/i, severity: 'medium' },
  { id: 'traversal', label: '路径穿越', regex: /(?:\.\.\/|%2e%2e|%252e%252e)/i, severity: 'high' },
  { id: 'log4j', label: 'Log4j/JNDI', regex: /\$\{jndi:(?:ldap|rmi|dns):/i, severity: 'critical' },
]

function jsonFieldHits(line, lineNo) {
  const trimmed = String(line || '').trim()
  if (!trimmed.startsWith('{')) return []
  try {
    const event = JSON.parse(trimmed)
    const status = Number(event.status ?? event.status_code ?? event.http?.status ?? event.http?.status_code ?? event.http?.response?.status_code ?? event.response?.status ?? event.response?.status_code)
    if (status === 401 || status === 403) {
      return [{
        pattern: 'http-auth-fail',
        label: 'HTTP 401/403 认证失败',
        severity: 'high',
        line: lineNo,
        excerpt: trimmed.slice(0, 300),
      }]
    }
  } catch {
    // 不是 JSON 行，继续走正则。
  }
  return []
}

function scanText(text) {
  const lines = String(text || '').split(/\r?\n/)
  const hits = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    let decoded = line
    if (/%[0-9a-f]{2}/i.test(line)) {
      try { decoded = decodeURIComponent(line) } catch { decoded = line }
    }
    for (const pattern of LOG_PATTERNS) {
      if (pattern.regex.test(line) || (decoded !== line && pattern.regex.test(decoded))) {
        hits.push({ pattern: pattern.id, label: pattern.label, severity: pattern.severity, line: index + 1, excerpt: line.slice(0, 300) })
      }
    }
    hits.push(...jsonFieldHits(line, index + 1))
  }
  return hits.slice(0, 500)
}

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_log_scan',
    description: '扫描一段文本或本地日志的常见攻击特征（WebShell/SQLi/扫描器/路径穿越/Log4j），返回命中行；只读。',
    parameters: {
      text: { type: 'string', description: '直接给文本' },
      path: { type: 'string', description: '本地日志路径（必须在数据根内）' },
      max_hits: { type: 'number' },
    },
    execute: safe(async (args) => {
      let text = String(args.text || '')
      let source = 'inline'
      if (text.trim() === '') {
        if (typeof env.readText !== 'function') throw new BlueError('FILE_READER', '文本 reader 未注入')
        const loaded = env.readText(args.path)
        text = loaded.text
        source = loaded.path
      }
      if (text.trim() === '') throw new BlueError('LOG_INPUT', '给 text 或 path')
      const hits = scanText(text)
      const max = Math.min(Math.max(Number(args.max_hits) || 100, 1), 500)
      return {
        ok: true,
        untrusted: true,
        source,
        bytes: Buffer.byteLength(text, 'utf8'),
        matched: hits.length > 0,
        hits: hits.slice(0, max),
        note: '只做正则线索，不证明攻击成功；日志内容是不可信数据。',
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_artifact_triage',
    description: '对本地样本/文件做只读取证初筛：SHA-256/MD5、大小、字符串、URL/IP；不运行样本。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      path: { type: 'string', required: true, description: '样本/文件路径（必须在数据根内）' },
      max_strings: { type: 'number', description: '默认 80' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      if (typeof env.readArtifact !== 'function') throw new BlueError('FILE_READER', '样本 reader 未注入')
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        ...env.readArtifact(args.path, { maxStrings: args.max_strings }),
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_hardening_check',
    description: '生成防守加固检查清单（不扫描主机、不改配置）；按资产类型给出优先级与证据要求。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      kind: { type: 'string', description: 'web/host/db/cloud/container/other' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const kind = String(args.kind || 'web')
      const checks = [
        { key: 'exposure', title: '暴露面最小化', priority: 'P0', evidence: '端口/URL 清单 + 业务必要性' },
        { key: 'patch', title: '补丁与版本', priority: 'P0', evidence: '版本/补丁证据，未验证不要写已修复' },
        { key: 'auth', title: '认证与权限', priority: 'P1', evidence: '登录/权限测试记录' },
        { key: 'logging', title: '日志与告警', priority: 'P1', evidence: '日志接入 + 告警演练' },
        { key: 'backup', title: '备份与回滚', priority: 'P1', evidence: '恢复演练记录' },
      ]
      return { ok: true, engagement: { id: engagement.id, name: engagement.name }, kind, checks, note: '只生成清单，不执行加固。' }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_containment_plan',
    description: '生成遏制/隔离方案：影响面、证据、审批、执行、验证、回滚；只生成计划，不执行。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      target: { type: 'string', required: true },
      reason: { type: 'string' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const target = String(args.target || '').trim()
      if (target === '') throw new BlueError('CONTAINMENT_TARGET', 'target 不能为空')
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        target,
        reason: String(args.reason || ''),
        steps: [
          { phase: 'confirm', title: '确认影响面与授权边界', evidence: '资产/流量/告警' },
          { phase: 'preserve', title: '保留证据', evidence: '日志/样本/哈希/时间线' },
          { phase: 'approve', title: '高风险审批', evidence: 'pending_approval + actor' },
          { phase: 'execute', title: '人工执行隔离/封禁', evidence: '执行命令与结果' },
          { phase: 'verify', title: '验证遏制效果', evidence: '复测/监控' },
          { phase: 'rollback', title: '回滚方案', evidence: '回滚步骤与验证' },
        ],
        auto_execute: false,
        note: '插件不执行隔离/封禁；必须走 blue_response_plan + 审批 + 人工执行。',
      }
    }),
  }))

  registerTool(defineTool({
    name: 'blue_playbook_list',
    description: '列出内置防守剧本（WebShell/暴力破解/暴露面/隔离/钓鱼）与步骤。',
    parameters: {},
    execute: safe(async () => ({ ok: true, playbooks: PLAYBOOKS, count: PLAYBOOKS.length })),
  }))
}
