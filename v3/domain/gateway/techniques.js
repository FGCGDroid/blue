/**
 * 常见攻击打法覆盖表（对照 docs/3.0/attack-methods.md）。
 *
 * 这张表只描述“3.0 网关这一层怎么处理”，不声称站点绝对安全。
 * handling：
 *   block    网关直接拒绝，有 scripts/test-v3-attack-methods.mjs 覆盖
 *   reduce   降低可利用面（去指纹、去规则名、确定性），不等于不能打
 *   detect   采集器规则能发现，但要在链路上才看得到
 *   owner    需要站点自己改（字段白名单/配置暴露），我们只提示
 *   na       不经过网关（侦察、离线爆破、流程类），网关管不了
 */
export const TECHNIQUES = Object.freeze([
  { id: 'M01', name: '根路径指纹 / 双层代理识别', category: 'recon', handling: 'reduce', where: 'gateway', note: '响应头去掉 Server/X-Powered-By/Via，Date 只保留一层' },
  { id: 'M02', name: '定向路由枚举', category: 'recon', handling: 'detect', where: 'collector', note: '采集器 builtin-scanner 记录敏感路径探测；被网关拦的还会进网关阻断告警' },
  { id: 'M03', name: '诱饵端点识别', category: 'recon', handling: 'na', where: '-', note: '攻击者侧判断，不经过网关' },
  { id: 'M04', name: '请求是否到后端判别法', category: 'recon', handling: 'reduce', where: 'gateway', note: '上游头被剥离、Date 去重，减少层数信息' },
  { id: 'M05', name: 'JWT alg=none 不验签', category: 'auth', handling: 'block', where: 'gateway', note: 'alg 统一小写后比对 none/null/缺失' },
  { id: 'M06', name: '重复 Cookie 解析差异', category: 'auth', handling: 'block', where: 'gateway', note: '同名 token/session/jwt cookie 出现多次即拒，前后顺序无关' },
  { id: 'M07', name: '令牌通道枚举', category: 'auth', handling: 'na', where: '-', note: '攻击者侧试位置，本身不是请求' },
  { id: 'M08', name: '弱密钥离线对撞', category: 'auth', handling: 'na', where: '-', note: '离线计算，网关看不到' },
  { id: 'M09', name: '载荷篡改 + 旧签名', category: 'auth', handling: 'na', where: 'backend', note: '靠后端验签，网关只挡 alg=none' },
  { id: 'M10', name: '路径变体绕过鉴权', category: 'bypass', handling: 'block', where: 'gateway', note: '规范化后按段边界匹配，大小写/尾斜杠/分号都处理' },
  { id: 'M11', name: 'JSON \\uXXXX 转义绕过', category: 'bypass', handling: 'block', where: 'gateway', note: 'JSON.parse 完整解码后再判断字段名' },
  { id: 'M12', name: '路径规范化绕过敏感路径', category: 'bypass', handling: 'block', where: 'gateway', note: '百分号解码一次后拒绝点段/双编码，转发的是规范化路径' },
  { id: 'M13', name: '规则测绘（大小写/重复键/空白）', category: 'bypass', handling: 'block', where: 'gateway', note: '字段名大小写归一，危险键重复出现直接拒' },
  { id: 'M14', name: '状态化首次放行窗口', category: 'bypass', handling: 'block', where: 'gateway', note: '网关无状态，同请求重复发送结果一致' },
  { id: 'M15', name: '填充/深嵌套/multipart/chunked', category: 'bypass', handling: 'block', where: 'gateway', note: '体积上限、嵌套深度上限、multipart 里的 json 字段同样检查' },
  { id: 'M16', name: '规则名泄露利用', category: 'bypass', handling: 'reduce', where: 'gateway', note: '403 只回 request blocked，不带规则 id' },
  { id: 'M17', name: '原型链污染', category: 'bypass', handling: 'block', where: 'gateway', note: '__proto__/constructor/prototype 字面量与转义形式都拦' },
  { id: 'M18', name: 'Mass assignment 任意键写入', category: 'app', handling: 'owner', where: 'backend', note: '网关只挡特权键；任意键写入要后端加字段白名单' },
  { id: 'M19', name: '配置持久化判定', category: 'app', handling: 'na', where: '-', note: '攻击者侧判定流程' },
  { id: 'M20', name: 'SSTI 模板注入探测', category: 'app', handling: 'owner', where: 'backend', note: '网关不解析模板；模板引擎要禁用危险表达式' },
  { id: 'M21', name: '未授权配置接口泄露', category: 'app', handling: 'owner', where: 'backend', note: 'config.json/settings.json 这类先当提示，不默认拦（避免拦坏业务）' },
  { id: 'M22', name: '/api/<任意> 前缀漏判', category: 'app', handling: 'owner', where: 'backend', note: '后端要有精确路由和鉴权，不是靠前缀兜底' },
  { id: 'M23', name: '诱饵端点无功能验证', category: 'app', handling: 'na', where: '-', note: '攻击者侧验证动作' },
  { id: 'M24', name: '先查知识库再手搓', category: 'process', handling: 'na', where: '-', note: '攻击者流程' },
  { id: 'M25', name: '对照组反向验证', category: 'process', handling: 'reduce', where: 'selfcheck', note: '我们的自检也做对照：直连 vs 网关、明文 vs 变体' },
  { id: 'M26', name: 'OPSEC 限速/复位', category: 'process', handling: 'na', where: '-', note: '攻击者自律，防御侧看到的是请求量' },
  { id: 'M27', name: '自适应伪造 flag 识别', category: 'process', handling: 'reduce', where: 'selfcheck', note: '没有 artifact 证据的“发现”不算事实，避免把诱饵写进报告' },
  { id: 'M28', name: '检查归一化 / 转发原始', category: 'bypass', handling: 'block', where: 'gateway', note: '检查和转发用同一个规范化结果，不存在两套路径' },
  { id: 'M29', name: '蜜罐页面识别', category: 'recon', handling: 'na', where: '-', note: '攻击者侧判断' },
  { id: 'M30', name: '诱饵命中的反向情报', category: 'recon', handling: 'na', where: '-', note: '攻击者侧分析' },
  { id: 'M31', name: 'Date 计数法适用前提', category: 'process', handling: 'reduce', where: 'selfcheck', note: '自检先 GET / 校准层数，再判断响应是不是我们生成的' },
  { id: 'M32', name: '目录 403 后打子文件名', category: 'bypass', handling: 'block', where: 'gateway', note: '目录规则按段边界覆盖子资源：/backup 与 /backup/x 一起拦' },
])

export const TECHNIQUE_BY_ID = Object.freeze(
  Object.fromEntries(TECHNIQUES.map((item) => [item.id, item])),
)

const HANDLING_ORDER = ['block', 'reduce', 'detect', 'owner', 'na']

export function techniqueCoverage() {
  const counts = Object.fromEntries(HANDLING_ORDER.map((key) => [key, 0]))
  for (const item of TECHNIQUES) counts[item.handling] += 1
  return {
    total: TECHNIQUES.length,
    blocked: counts.block,
    reduced: counts.reduce,
    detected: counts.detect,
    owner: counts.owner,
    not_applicable: counts.na,
    techniques: TECHNIQUES.map((item) => ({ ...item })),
    note: '只表示网关这一层的处理方式；owner 项要站点自己改，na 项网关管不了。没有测试证明的不标 block。',
  }
}

export function techniquesForHandling(handling) {
  const key = String(handling || '').trim()
  if (!HANDLING_ORDER.includes(key)) return []
  return TECHNIQUES.filter((item) => item.handling === key).map((item) => ({ ...item }))
}
