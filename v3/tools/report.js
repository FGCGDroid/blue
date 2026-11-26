/** 工具组：报告（M4.2/M5）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { buildReport } from '../app/reports/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'report'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_report',
    description: '生成当前目标的蓝队防守报告（Markdown）：态势、资产、告警、发现、IOC、任务、案件、时间线。可写数据根 reports/ 下。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      write: { type: 'boolean', description: '是否写 reports/ 下，默认 false' },
      path: { type: 'string', description: '（可选）reports/ 下的文件名' },
    },
    execute: safe(async (args, exec) => {
      const engagement = engagementOf(store, exec, args.engagement)
      const markdown = buildReport(store, engagement.id)
      if (args.write === true) {
        if (typeof env.writeReport !== 'function') throw new BlueError('REPORT_WRITER', '报告写入器未注入')
        const written = env.writeReport(markdown, args.path)
        return {
          ok: true,
          engagement: { id: engagement.id, name: engagement.name },
          bytes: written.bytes,
          write: true,
          file: written.file,
        }
      }
      return {
        ok: true,
        engagement: { id: engagement.id, name: engagement.name },
        bytes: Buffer.byteLength(markdown, 'utf8'),
        write: false,
        markdown,
      }
    }),
  }))
}
