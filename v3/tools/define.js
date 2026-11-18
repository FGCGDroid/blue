/**
 * 3.0 工具定义助手。
 *
 * 只依赖 registry 的公开契约（name/description/parameters/output/execute），
 * 不 import @deepseek-ai/*；参数 DSL 与 2.0 保持一致，工具层不写 SQL。
 */
export const STRING_OUTPUT = Object.freeze({
  schema: { type: 'string' },
  render: (_args, value) => [{
    type: 'text',
    text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
  }],
})

export function json(value) {
  return JSON.stringify(value, null, 2)
}

export function defineTool(definition) {
  const spec = definition.parameters ?? {}
  const properties = {}
  const required = []
  for (const [key, value] of Object.entries(spec)) {
    const { required: isRequired, ...rest } = value
    properties[key] = rest
    if (isRequired === true) required.push(key)
  }
  return {
    ...definition,
    output: definition.output ?? STRING_OUTPUT,
    parameters: {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false,
    },
  }
}

export function safe(handler) {
  return async (args, exec) => {
    try {
      return json(await handler(args ?? {}, exec))
    } catch (error) {
      return json({
        ok: false,
        code: error?.code ?? 'TOOL_ERROR',
        error: error?.message ?? String(error),
        ...(error?.details ? { details: error.details } : {}),
      })
    }
  }
}
