export async function triage(cfg, context) {
  const ai = cfg.ai
  if (!ai || !ai.enabled || !ai.baseUrl) return ''
  try {
    const base = ai.baseUrl.replace(/\/$/, '')
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, ai.apiKey ? { authorization: 'Bearer ' + ai.apiKey } : {}),
      body: JSON.stringify({
        model: ai.model || 'local-model',
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: '你是防守方蓝队分析师。根据给定告警，用两句话判断是否真实威胁、可能原因、建议下一步。只输出结论，不要客套，不要重复数据。' },
          { role: 'user', content: JSON.stringify(context).slice(0, 3000) },
        ],
      }),
      signal: AbortSignal.timeout(ai.timeoutMs || 8000),
    })
    if (!res.ok) return ''
    const j = await res.json()
    const text = j.choices?.[0]?.message?.content || ''
    return String(text).replace(/\s+/g, ' ').trim().slice(0, 300)
  } catch {
    return ''
  }
}
