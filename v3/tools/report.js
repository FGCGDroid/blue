/** 工具组：报告（M4.2）。 */
import { defineTool, safe } from './define.js'
import { engagementOf } from './context.js'
import { buildReport } from '../app/reports/service.js'
import { BlueError } from '../domain/shared/errors.js'

export const group = 'report'

export function register(registerTool, env = {}) {
  const store = env.store

  registerTool(defineTool({
    name: 'blue_report',
    description: '生成本目标的蓝队防守报告（Markdown）：态势、资产、告警、发现、IOC、任务、案件、时间线。M4.2 只返回 Markdown，不写文件。',
    parameters: {
      engagement: { type: 'string', description: '（可选）防守目标 id 或名称；默认用当前会话绑定' },
      write: { type: 'boolean', description: 'M4.2 仅支持 false；写文件在 M4.4 接' },
    },
    execute: safe(async (args, exec) => {
      if (args.write === true) {
        throw new BlueError('NOT_IMPLEMENTED', 'M4.2 只返回 Markdown；写文件等 M4.4 证据组', {
          feature: 'report.write',
          milestone: 'M4.4',
        })
      }
      const engagement = engagementOf(store, exec, args.engagement)
      const markdown = buildReport(store, engagement.id)
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
