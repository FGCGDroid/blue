/** 3.0 防守报告生成（M4.2，只返回 Markdown，不落盘）。 */
function cell(value, max = 120) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, max)
}

export function buildReport(store, engagementId) {
  const engagement = store.engagements.get(engagementId)
  if (engagement === null) throw new Error('防守目标不存在：' + engagementId)
  const stats = store.engagements.stats(engagementId)
  const assets = store.facts.queryAssets(engagementId, { limit: 200 })
  const alerts = store.facts.listAlerts(engagementId, { limit: 200 })
  const findings = store.facts.listFindings(engagementId, { limit: 200 })
  const iocs = store.facts.listIocs(engagementId, { limit: 200 })
  const tasks = store.tasks.list(engagementId, { limit: 200 })
  const incidents = store.incidents.list(engagementId, { limit: 100 })
  const timeline = store.timeline.list(engagementId, 30)
  const lines = []
  lines.push(`# 蓝队防守报告：${engagement.name}`)
  lines.push('')
  lines.push(`- 目标 ID：${engagement.id}`)
  lines.push(`- 状态：${engagement.status}`)
  lines.push(`- 范围：${engagement.scope.join(', ') || '未声明'}`)
  lines.push(`- 生成时间：${new Date().toISOString()}`)
  lines.push('')
  lines.push('## 态势')
  lines.push('')
  lines.push('```text')
  for (const [key, value] of Object.entries(stats)) lines.push(`${key}: ${value}`)
  lines.push('```')
  lines.push('')

  const section = (title, rows, header, format) => {
    lines.push(`## ${title}`)
    lines.push('')
    if (rows.length === 0) {
      lines.push('无。')
      lines.push('')
      return
    }
    lines.push(`| ${header.join(' | ')} |`)
    lines.push(`| ${header.map(() => '---').join(' | ')} |`)
    for (const row of rows) lines.push(`| ${format(row).join(' | ')} |`)
    lines.push('')
  }

  section('资产', assets, ['ID', '名称', '类型', '地址', '端口', '关键级别', '状态'], (a) => [
    cell(a.id), cell(a.name), cell(a.kind), cell(a.address), cell(a.port), cell(a.criticality), cell(a.status),
  ])
  section('告警', alerts, ['ID', '标题', '级别', '状态', '来源', '任务'], (a) => [
    cell(a.id), cell(a.title), cell(a.severity), cell(a.status), cell(a.source), cell(a.task_id),
  ])
  section('发现', findings, ['ID', '标题', '级别', '状态', '类别', '证据'], (f) => [
    cell(f.id), cell(f.title), cell(f.severity), cell(f.status), cell(f.category), cell(f.evidence),
  ])
  section('IOC', iocs, ['ID', '类型', '值', '置信度', '来源'], (i) => [
    cell(i.id), cell(i.type), cell(i.value), cell(i.confidence), cell(i.source),
  ])
  section('任务', tasks, ['ID', '角色', '标题', '优先级', '风险', '状态'], (t) => [
    cell(t.id), cell(t.role), cell(t.title), cell(t.priority), cell(t.risk_level), cell(t.status),
  ])
  section('案件', incidents, ['ID', '标题', '级别', '状态', '负责人'], (i) => [
    cell(i.id), cell(i.title), cell(i.severity), cell(i.status), cell(i.owner),
  ])

  lines.push('## 最近时间线')
  lines.push('')
  if (timeline.length === 0) {
    lines.push('无。')
  } else {
    for (const row of timeline) {
      lines.push(`- ${row.at} · ${cell(row.actor, 40)} · ${cell(row.action, 40)} · ${cell(row.target, 80)}`)
    }
  }
  lines.push('')
  lines.push('> 本报告由 3.0 M4.2 生成；原始证据以事实库/时间线为准，报告不替代原始证据。')
  return lines.join('\n')
}
