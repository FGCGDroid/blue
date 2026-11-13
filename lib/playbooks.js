/**
 * 蓝队角色、检测规则、外部工具目录与处置剧本（纯数据，无副作用）。
 *
 * 这里的文本会被写进子智能体任务描述，所以每条都要能独立执行：
 * 角色边界、已知事实、验收标准、失败信号缺一不可。
 */
import { renderTaskSpec } from './taskspec.js'

/** 角色元数据。 */
export const ROLES = {
  monitor: {
    title: '监控值守',
    preset: 'blue-worker-monitor',
    focus: '持续盯告警与可用性，先止血再深挖；对每条告警给出定级、影响面与下一步。',
  },
  intel: {
    title: '情报分析',
    preset: 'blue-worker-intel',
    focus: '把外部情报转成可检测的 IOC / 规则，标注置信度与来源，避免高误报规则。',
  },
  hunt: {
    title: '威胁狩猎',
    preset: 'blue-worker-hunt',
    focus: '假设驱动地找"没有告警的证据"：日志、流量、主机痕迹、WebShell、横向移动。',
  },
  ir: {
    title: '应急响应',
    preset: 'blue-worker-ir',
    focus: '按 PICERL 处置：隔离、取证、清除、恢复、复盘；每一步留证据，不做破坏性操作。',
  },
  forensics: {
    title: '取证分析',
    preset: 'blue-worker-forensics',
    focus: '对磁盘/内存/日志/样本做只读取证，产出时间线、哈希与可复现结论。',
  },
  hardening: {
    title: '加固修复',
    preset: 'blue-worker-hardening',
    focus: '在不影响业务的前提下修补漏洞、收敛暴露面、补检测规则并回归验证。',
  },
}

/** 角色 → 允许的工具名（未列出的工具对该角色不可见）。 */
const ALL_TOOLS = [
  'blue_engagement_open', 'blue_session_info', 'blue_scope_check', 'blue_preflight', 'blue_defense_selfcheck',
  'blue_incident_open', 'blue_incident_list', 'blue_incident_update', 'blue_incident_attach',
  'blue_decision_add', 'blue_decision_list',
  'blue_asset_add', 'blue_asset_query',
  'blue_alert_ingest', 'blue_alert_list', 'blue_alert_triage',
  'blue_ioc_add', 'blue_ioc_list', 'blue_ioc_check',
  'blue_finding_add', 'blue_finding_update', 'blue_finding_list',
  'blue_task_create', 'blue_task_update', 'blue_task_list', 'blue_task_approve', 'blue_autopilot',
  'blue_timeline', 'blue_playbook_list', 'blue_log_scan', 'blue_artifact_triage',
  'blue_hardening_check', 'blue_containment_plan', 'blue_report', 'blue_defense_status',
  'blue_deception_plan', 'blue_decoy_create', 'blue_decoy_hit', 'blue_decoy_list',
  'blue_tarpit_plan', 'blue_honeypot_ingest',
  'blue_decoy_update',
  'blue_decoy_sync',
  'blue_access_log_ingest',
  'blue_attack_coverage',
  'blue_audit_verify',
  'blue_telemetry_source_add', 'blue_telemetry_poll', 'blue_telemetry_health',
  'blue_control_scan', 'blue_control_list',
  'blue_audit_anchor', 'blue_audit_anchor_verify',
  'blue_response_plan', 'blue_response_update', 'blue_response_list',
  'blue_tool_catalog',
]
export const ALL_TOOL_NAMES = ALL_TOOLS

export const ROLE_TOOLS = {
  monitor: ALL_TOOLS.filter((tool) => ![
    'blue_engagement_open', 'blue_artifact_triage', 'blue_hardening_check', 'blue_containment_plan', 'blue_report', 'blue_autopilot', 'blue_task_approve', 'blue_defense_selfcheck',
    'blue_deception_plan', 'blue_decoy_create',
  ].includes(tool)),
  intel: ALL_TOOLS.filter((tool) => ![
    'blue_engagement_open', 'blue_asset_add', 'blue_alert_ingest', 'blue_alert_triage', 'blue_finding_add',
    'blue_log_scan', 'blue_artifact_triage', 'blue_hardening_check', 'blue_containment_plan',
    'blue_report',
  'blue_audit_verify', 'blue_autopilot', 'blue_task_create', 'blue_task_approve', 'blue_defense_selfcheck',
    'blue_deception_plan', 'blue_decoy_create',
  ].includes(tool)),
  hunt: ALL_TOOLS.filter((tool) => ![
    'blue_containment_plan', 'blue_hardening_check', 'blue_autopilot', 'blue_engagement_open', 'blue_task_approve', 'blue_defense_selfcheck',
    'blue_decoy_create',
  ].includes(tool)),
  ir: ALL_TOOLS.filter((tool) => ![
    'blue_hardening_check', 'blue_autopilot', 'blue_engagement_open', 'blue_task_approve', 'blue_defense_selfcheck',
    'blue_deception_plan', 'blue_decoy_create',
  ].includes(tool)),
  forensics: ALL_TOOLS.filter((tool) => ![
    'blue_scope_check', 'blue_alert_triage', 'blue_hardening_check', 'blue_containment_plan',
    'blue_autopilot', 'blue_engagement_open', 'blue_task_create', 'blue_task_approve', 'blue_defense_selfcheck',
    'blue_deception_plan', 'blue_decoy_create',
  ].includes(tool)),
  hardening: ALL_TOOLS.filter((tool) => ![
    'blue_alert_ingest', 'blue_alert_triage', 'blue_ioc_check', 'blue_log_scan',
    'blue_artifact_triage', 'blue_containment_plan', 'blue_autopilot', 'blue_engagement_open', 'blue_task_approve', 'blue_defense_selfcheck',
  ].includes(tool)),
  // 全工具 worker 只用于“未确定角色”的执行，仍然没有目标绑定、审批、派发、报告权限。
  worker: ALL_TOOLS.filter((tool) => ![
    'blue_engagement_open', 'blue_autopilot', 'blue_task_approve', 'blue_report', 'blue_defense_selfcheck',
    'blue_decoy_create',
  ].includes(tool)),
}

/** 角色完整职责（写进任务描述开头，子智能体按它执行）。 */
export const ROLE_PROMPTS = {
  monitor: `【监控值守 · 角色职责】
1. 先判可用性：被保护服务/端口是否在线，是否被 DDoS、被篡改、被替换首页；可用性优先于溯源。
2. 逐条研判告警：结合原始日志/流量/主机证据给出 真阳性 / 假阳性 / 待验证，写明依据。
3. 定级用影响面：critical=核心服务不可用或已失陷；high=边界入口/凭据/数据风险；medium=单点异常；low=噪声。
4. 对真阳性立即建任务（blue_task_create）给 ir/hunt，并把告警状态改为 investigating/contained。
5. 每轮只处理新增/变化，不重复全量复述；所有结论用 blue_alert_triage 落库。`,
  intel: `【情报分析 · 角色职责】
1. 收集与本场 CTF 相关的 IOC：攻击源 IP、域名、URL、样本哈希、WebShell 特征、扫描器 UA。
2. 每条 IOC 必须有来源与置信度；无来源的猜测只作为线索，不写成 high。
3. 把 IOC 转成可执行检测：blue_ioc_add 落库，给出 grep/YARA/Suricata/Sigma 的落地写法（写在 note）。
4. 评估误报：命中业务正常流量/内网扫描的规则要降级或加白名单建议。
5. 输出"本轮新增 IOC + 建议检测规则 + 置信度"，不要堆砌无关情报。`,
  hunt: `【威胁狩猎 · 角色职责】
1. 先写 2–3 条可证伪的假设（例如：攻击者已通过上传点落地 WebShell；或已用窃取凭据横向）。
2. 用日志/流量/文件/进程/计划任务/账号等多源证据验证；优先找"没有告警"的痕迹。
3. Web 方向重点：上传目录、异常文件时间、双扩展名、图片马、冰蝎/哥斯拉/蚁剑流量特征、反序列化。
4. 主机方向重点：异常父进程（w3wp/php-fpm/java 拉起 cmd/bash）、临时目录可执行文件、计划任务、服务、启动项、SSH authorized_keys。
5. 每条命中写清：证据位置、时间、命令/请求、判定理由、影响资产；落 blue_finding_add。
6. 没有命中也要给出"查过什么、覆盖哪些时间窗/主机"，避免被当成没做。`,
  ir: `【应急响应 · 角色职责】
1. 按 PICERL：Preparation → Identification → Containment → Eradication → Recovery → Lessons Learned。
2. 先止损：隔离失陷主机/封禁 IOC/禁用被盗账号；隔离前尽量保留内存与关键日志。
3. 取证只读优先：先内存/进程/网络连接/登录记录，再磁盘；不要直接重装或删除证据。
4. 清除要可验证：删除 WebShell/恶意服务/计划任务/账号后逐项复查；修复入口漏洞再恢复业务。
5. 每一步写 blue_timeline + blue_task_update，证据写路径/哈希/命令输出；破坏性操作先向指挥官说明。
6. 恢复后用蓝队工具复测：服务可用、IOC 不再命中、入口漏洞已修复。`,
  forensics: `【取证分析 · 角色职责】
1. 只读原则：不修改原始介质；先计算哈希并记录，再分析副本。
2. 顺序：易失数据（内存/网络/进程）→ 日志 → 磁盘文件 → 注册表/配置。
3. 产出可复现时间线：时间、主机、主体、动作、对象、证据来源；时区统一写 UTC 或明确本地时区。
4. 样本分析：哈希、类型、字符串、导入表、C2/URL、持久化机制、家族判断；不运行未知样本。
5. 结论分级：已证实 / 高度可能 / 线索；不要把推测写成事实。
6. 用 blue_artifact_triage、blue_log_scan、blue_finding_add 落库。`,
  hardening: `【加固修复 · 角色职责】
1. 先修"能被再次利用"的入口：上传校验、反序列化、弱口令、未授权接口、过期组件。
2. 收敛暴露面：关闭不必要端口/服务/调试接口，限制管理端来源 IP，最小权限运行。
3. 补检测：为已发现的攻击手法补日志字段、告警规则、文件完整性监控。
4. 改动前记录现状与回滚方案；改动后回归验证业务可用性，避免"修好漏洞挂了服务"。
5. 用 blue_hardening_check 做基线核查，用 blue_finding_add 记录未修复项与风险接受人。
6. 输出：改了什么、为什么、验证结果、回滚方式、剩余风险。`,
}

/** 预设 id → 角色。 */
export const PRESET_ROLE = {
  'blue-worker': 'hunt',
  'blue-worker-monitor': 'monitor',
  'blue-worker-intel': 'intel',
  'blue-worker-hunt': 'hunt',
  'blue-worker-ir': 'ir',
  'blue-worker-forensics': 'forensics',
  'blue-worker-hardening': 'hardening',
}

/** 构造可直接发给子智能体的自包含任务描述。 */
export { renderTaskSpec } from './taskspec.js'

export function buildTaskPrompt(task, rolePrompt = ROLE_PROMPTS[task.role] ?? '') {
  return renderTaskSpec(task, rolePrompt).markdown
}

/** 日志/流量/文本检测规则。 */
export const LOG_PATTERNS = [
  { id: 'php-webshell', label: 'PHP WebShell 特征', severity: 'critical', regex: String.raw`(?:eval|assert)\s*\(\s*\$_(?:POST|GET|REQUEST|COOKIE)|(?:system|exec|shell_exec|passthru|popen)\s*\(\s*\$_(?:GET|POST|REQUEST)|base64_decode\s*\(|gzinflate\s*\(|str_rot13\s*\(|preg_replace\s*\([^)]*/e` },
  { id: 'jsp-webshell', label: 'JSP WebShell 特征', severity: 'critical', regex: String.raw`Runtime\.getRuntime\(\)\.exec|ProcessBuilder|defineClass|getClass\(\)\.getClassLoader|javax\.script` },
  { id: 'aspx-webshell', label: 'ASPX WebShell 特征', severity: 'critical', regex: String.raw`Request\.(?:Form|QueryString)\[|eval\s*\(\s*Request|Assembly\.Load|Page\.Language` },
  { id: 'aspx-process-start', label: 'ASPX Process.Start 型命令执行', severity: 'critical', regex: String.raw`System\.Diagnostics\.Process\.Start|ProcessStartInfo|Process\.Start\s*\(` },
  { id: 'jwt-none', label: 'JWT alg=none / 无签名令牌', severity: 'high', regex: String.raw`(?:["']?alg["']?\s*[:=]\s*["']?none\b|alg=none)` },
  { id: 'web-login-fail', label: 'HTTP 登录失败/401', severity: 'high', regex: String.raw`(?:POST|GET)\s+\S*(?:login|signin|auth|session)\S*[^\r\n]*\s(?:401|403)\b|(?:401|403)\b[^\r\n]*(?:login|signin|auth)` },
  { id: 'powershell-cradle', label: 'PowerShell 下载/编码执行', severity: 'high', regex: String.raw`powershell(?:\.exe)?\s+[^\r\n]*-(?:enc|encodedcommand|nop|w\s+hidden)|IEX\s*\(|DownloadString|FromBase64String` },
  { id: 'linux-reverse-shell', label: 'Linux 反弹 Shell', severity: 'critical', regex: String.raw`bash\s+-i\s+>&\s*/dev/tcp|nc\s+-e\s+/bin/(?:ba)?sh|curl\s+[^\r\n|]*\|\s*(?:ba)?sh|wget\s+[^\r\n|]*\|\s*(?:ba)?sh|chmod\s+\+x\s+/tmp/` },
  { id: 'sql-injection', label: 'SQL 注入尝试', severity: 'high', regex: String.raw`union\s+(?:all\s+)?select|sleep\s*\(\s*\d+\s*\)|benchmark\s*\(|information_schema|['"]\s*or\s*['"]?1['"]?\s*=\s*['"]?1` },
  { id: 'path-traversal', label: '路径穿越', severity: 'high', regex: String.raw`\.\./\.\./|%2e%2e%2f|/etc/passwd|win\.ini|boot\.ini` },
  { id: 'xss', label: 'XSS 尝试', severity: 'medium', regex: String.raw`<script[^>]*>|onerror\s*=|onload\s*=|javascript:` },
  { id: 'scanner', label: '扫描器指纹', severity: 'medium', regex: String.raw`sqlmap|nikto|nmap|masscan|dirsearch|gobuster|nuclei|acunetix|awvs|zgrab|fscan|gogo|xray|wpscan` },
  { id: 'brute-force', label: '暴力破解/登录失败', severity: 'high', regex: String.raw`failed password|invalid user|authentication failure|too many authentication failures|failed login|event(?:id)?[=:\s]*4625` },
  { id: 'persistence', label: '持久化痕迹', severity: 'high', regex: String.raw`schtasks\s+/create|reg\s+add[^\r\n]*\\run|crontab\s+-e|authorized_keys|systemctl\s+(?:enable|start)\s+|new-service` },
  { id: 'exfil', label: '数据外带迹象', severity: 'high', regex: String.raw`base64\s+-d|tar\s+-[^\r\n]*czf|7z\s+a\s+|rclone\s+(?:copy|sync)|scp\s+[^\r\n]+@|curl\s+-[^\r\n]*--data-binary` },
  { id: 'log-tamper', label: '日志清理/篡改', severity: 'critical', regex: String.raw`rm\s+-rf\s+/var/log|wevtutil\s+cl|Clear-EventLog|history\s+-c|shred\s+` },
]

/** 外部工具清单（不随包分发，只给出用途与示例；实际路径由 preflight 检查）。 */
export const TOOL_CATALOG = {
  traffic: {
    title: '流量采集与协议分析',
    items: [
      { name: 'tcpdump', purpose: '抓包与 BPF 过滤', example: 'tcpdump -i any -s0 -w cap.pcap host 10.0.0.5' },
      { name: 'tshark', purpose: '命令行解析 pcap、提取字段', example: 'tshark -r cap.pcap -Y http.request -T fields -e http.host -e http.request.uri' },
      { name: 'wireshark', purpose: '图形化协议分析', example: 'wireshark cap.pcap' },
      { name: 'zeek', purpose: '连接/HTTP/DNS/TLS 日志', example: 'zeek -i eth0 local' },
      { name: 'suricata', purpose: 'IDS/IPS 规则检测', example: 'suricata -i eth0 -S rules.rules -l logs/' },
      { name: 'arkime', purpose: '全流量留存与检索', example: 'arkime capture -r cap.pcap' },
      { name: 'ntopng', purpose: '流量态势与异常', example: 'ntopng -i eth0' },
    ],
  },
  host: {
    title: '主机与终端检测',
    items: [
      { name: 'osquery', purpose: 'SQL 化主机状态查询', example: 'osqueryi "SELECT * FROM listening_ports;"' },
      { name: 'sysmon', purpose: 'Windows 进程/网络/注册表事件', example: 'Sysmon64 -i sysmonconfig.xml' },
      { name: 'velociraptor', purpose: '大规模终端取证与狩猎', example: 'velociraptor.exe --config config.yaml client' },
      { name: 'autoruns', purpose: '启动项排查', example: 'autorunsc.exe -accepteula -a * -s' },
      { name: 'procexp', purpose: '进程树与签名验证', example: 'procexp64.exe' },
      { name: 'auditd', purpose: 'Linux 审计规则', example: 'auditctl -a always,exit -F arch=b64 -S execve' },
      { name: 'sysdig', purpose: '系统调用级抓取', example: 'sysdig -w trace.scap' },
      { name: 'falco', purpose: '容器/主机运行时规则', example: 'falco -r rules.yaml' },
      { name: 'wazuh', purpose: 'HIDS 与日志关联', example: 'systemctl status wazuh-agent' },
    ],
  },
  log: {
    title: '日志与 SIEM',
    items: [
      { name: 'jq', purpose: 'JSON 日志切片', example: 'jq -r ".data | select(.severity==\\"high\\")" events.json' },
      { name: 'grep/awk', purpose: '快速筛日志', example: 'grep -Ei "webshell|union select" access.log' },
      { name: 'elastic', purpose: '检索与聚合', example: 'GET /logs-*/_search' },
      { name: 'splunk', purpose: 'SPL 关联分析', example: 'index=web status=200 | stats count by uri' },
      { name: 'graylog', purpose: '集中日志与告警', example: 'search "source:nginx AND status:500"' },
      { name: 'loki', purpose: '轻量日志聚合', example: '{job="nginx"} |= "eval("' },
    ],
  },
  detect: {
    title: '检测规则与恶意样本',
    items: [
      { name: 'yara', purpose: '样本/文件特征匹配', example: 'yara -r rules.yar /var/www' },
      { name: 'sigma', purpose: '通用日志检测规则', example: 'sigma convert -t splunk rule.yml' },
      { name: 'clamav', purpose: '恶意文件扫描', example: 'clamscan -r /var/www/uploads' },
      { name: 'chkrootkit', purpose: 'Linux rootkit 排查', example: 'chkrootkit -q' },
      { name: 'rkhunter', purpose: 'rootkit/后门检查', example: 'rkhunter --check --sk' },
      { name: 'capa', purpose: '样本能力识别', example: 'capa sample.exe' },
      { name: 'pestudio', purpose: 'PE 静态分析', example: 'pestudio sample.exe' },
      { name: 'strings', purpose: '字符串提取', example: 'strings -n 6 sample.bin' },
    ],
  },
  forensics: {
    title: '取证与内存',
    items: [
      { name: 'volatility3', purpose: '内存镜像分析', example: 'vol -f mem.raw windows.pslist' },
      { name: 'sleuthkit', purpose: '磁盘镜像文件系统分析', example: 'fls -r -p disk.img' },
      { name: 'autopsy', purpose: '图形化取证', example: 'autopsy' },
      { name: 'foremost', purpose: '文件 carving', example: 'foremost -i disk.img -o out/' },
      { name: 'bulk_extractor', purpose: '批量提取特征', example: 'bulk_extractor -o out disk.img' },
      { name: 'dd', purpose: '只读镜像', example: 'dd if=/dev/sda of=disk.img bs=4M conv=noerror,sync' },
      { name: 'LiME', purpose: 'Linux 内存采集', example: 'insmod lime.ko "path=/tmp/mem.lime format=lime"' },
    ],
  },
  vuln: {
    title: '漏洞验证与加固',
    items: [
      { name: 'nmap', purpose: '端口与服务识别', example: 'nmap -sV -Pn -p- 10.0.0.5' },
      { name: 'nuclei', purpose: '模板化漏洞验证', example: 'nuclei -u https://target -severity critical,high' },
      { name: 'openvas', purpose: '漏洞扫描', example: 'gvm-cli ...' },
      { name: 'lynis', purpose: 'Linux 基线审计', example: 'lynis audit system' },
      { name: 'openscap', purpose: 'CIS/STIG 合规扫描', example: 'oscap xccdf eval --profile cis profile.xml' },
      { name: 'kube-bench', purpose: 'K8s CIS 基线', example: 'kube-bench run --targets master,node' },
      { name: 'trivy', purpose: '镜像/依赖漏洞', example: 'trivy image app:latest' },
      { name: 'grype', purpose: 'SBOM 漏洞匹配', example: 'grype sbom:./sbom.json' },
    ],
  },
  identity: {
    title: '身份与访问',
    items: [
      { name: 'fail2ban', purpose: '暴力破解自动封禁', example: 'fail2ban-client status sshd' },
      { name: 'bloodhound', purpose: 'AD 攻击路径（防守方视角）', example: 'bloodhound-python -d corp.local -u user -p pass -c all' },
      { name: 'wevtutil', purpose: 'Windows 事件日志导出', example: 'wevtutil qe Security /f:text /q:"*[System[(EventID=4625)]]"' },
      { name: 'getent', purpose: '账号/组核查', example: 'getent group sudo' },
    ],
  },
  cloud: {
    title: '云与容器',
    items: [
      { name: 'kubectl', purpose: 'K8s 审计与排查', example: 'kubectl get pods -A -o wide' },
      { name: 'kube-hunter', purpose: 'K8s 暴露面检测', example: 'kube-hunter --remote cluster' },
      { name: 'docker', purpose: '容器进程/镜像排查', example: 'docker ps --no-trunc' },
      { name: 'aws-cli', purpose: 'CloudTrail 审计', example: 'aws cloudtrail lookup-events --max-items 50' },
    ],
  },
  orchestration: {
    title: '编排与协同',
    items: [
      { name: 'ansible', purpose: '批量加固/取证采集', example: 'ansible-playbook harden.yml -i hosts' },
      { name: 'thehive', purpose: '事件与任务协同', example: 'TheHive 5 case/task API' },
      { name: 'cortex', purpose: 'IOC 批量分析', example: 'Cortex analyzer run' },
      { name: 'misp', purpose: 'IOC 共享与关联', example: 'PyMISP search' },
      { name: 'slack/teams webhook', purpose: '告警通知', example: 'POST webhook JSON' },
    ],
  },
}

/** 预检二进制清单。 */
export const PREFLIGHT_BINARIES = [
  'nmap', 'masscan', 'tcpdump', 'tshark', 'wireshark', 'zeek', 'suricata', 'yara',
  'osquery', 'volatility3', 'vol', 'fls', 'icat', 'foremost', 'bulk_extractor',
  'clamscan', 'chkrootkit', 'rkhunter', 'lynis', 'auditctl', 'sysdig', 'falco',
  'jq', 'grep', 'awk', 'python3', 'python', 'curl', 'openssl', 'git', 'docker',
  'kubectl', 'trivy', 'grype', 'autorunsc', 'procexp64', 'strings',
]

/** 预检环境变量（没有就说明对应外部能力不可用）。 */
export const PREFLIGHT_ENV = [
  { key: 'VT_API_KEY', purpose: 'VirusTotal 样本/域名信誉' },
  { key: 'ABUSEIPDB_API_KEY', purpose: '恶意 IP 信誉' },
  { key: 'SHODAN_API_KEY', purpose: '暴露面检索' },
  { key: 'MISP_URL', purpose: 'MISP 情报库' },
  { key: 'MISP_KEY', purpose: 'MISP API Key' },
  { key: 'THEHIVE_URL', purpose: 'TheHive 事件协同' },
  { key: 'ELASTIC_URL', purpose: 'Elastic 日志检索' },
  { key: 'SPLUNK_URL', purpose: 'Splunk 检索' },
  { key: 'SLACK_WEBHOOK_URL', purpose: '告警通知' },
]

/** 处置剧本（按事件类型）。 */
export const CONTAINMENT_PLAYBOOKS = {
  webshell: [
    '确认 WebShell 路径、落地时间、访问来源与首次利用点（上传/反序列化/文件包含）。',
    '隔离前保全：备份文件、访问日志、进程内存、网络连接；计算哈希。',
    '临时下线站点或将该目录设为不可执行（不要只改名），封禁攻击源 IP。',
    '排查同目录/同时间窗其它文件，检查是否还有内存马、计划任务、隐藏账号。',
    '修复入口（上传校验、组件升级、权限收敛），轮换站点数据库/API 凭据。',
    '恢复后用原攻击请求复测，确认不再落地；补 YARA/日志告警。',
  ],
  ransomware: [
    '立即隔离受感染主机与共享盘，阻断 SMB/RDP/WinRM 横向。',
    '保全内存、加密样本、勒索信、登录与文件审计日志；不要重启。',
    '确认加密家族与解密可行性，评估备份完整性（离线/不可变备份优先）。',
    '从干净备份恢复，先恢复核心服务；恢复前重置相关账号与 Kerberos 票据。',
    '定位初始入口（钓鱼、暴露的 RDP/VPN、漏洞），修补后持续监控。',
  ],
  phishing: [
    '收集邮件头、发件域、URL、附件哈希；在邮件网关批量清除同源邮件。',
    '封禁域名/URL/IP；检查已点击用户与凭据提交情况。',
    '对已提交凭据的账号强制改密、吊销会话、启用 MFA。',
    '检查登录日志异常（异地、异常 UA、失败后成功）。',
    '对全员发布定向提醒与 IOC，补邮件规则。',
  ],
  brute_force: [
    '确认来源 IP、目标账号、失败/成功比例；区分扫描与真实突破。',
    '封禁来源，启用 fail2ban/账户锁定策略，限制管理端来源。',
    '检查成功登录后的行为：新账号、计划任务、SSH key、数据访问。',
    '强制受影响账号改密，启用 MFA，收敛暴露的 SSH/RDP/VPN。',
  ],
  data_exfil: [
    '确认外带通道（HTTP/DNS/邮件/云盘）与数据范围，保留流量证据。',
    '阻断通道、封禁目的地址，吊销相关令牌/密钥。',
    '评估数据敏感级别与通知义务，保留取证镜像。',
    '排查入口与内应账号，轮换凭据，补 DLP 与出站监控。',
  ],
  compromised_host: [
    '隔离主机（EDR 网络隔离/ACL），保留内存与磁盘证据。',
    '采集进程树、网络连接、服务、计划任务、启动项、账号、最近文件。',
    '定位入口与持久化，清除后逐项复验；无法确认干净则重装。',
    '轮换该主机上的所有凭据与密钥，检查横向到其它主机。',
    '恢复业务并加监控（异常进程、外连、文件变更）。',
  ],
  ddos: [
    '确认攻击类型（流量型/连接型/应用层）与目标，启用清洗/CDN/限流。',
    '保留流量样本与源 IP 分布，区分反射源与真实攻击者。',
    '对应用层攻击加 WAF 规则、人机校验、频率限制；保护登录与搜索接口。',
    '与运营商/云厂商联动，必要时切换高防 IP。',
    '攻击后复盘暴露面与容量瓶颈。',
  ],
  cloud_key_leak: [
    '立即禁用/轮换泄露的 AK/SK、Token、Webhook。',
    '审计 CloudTrail/操作日志，确认是否已被使用及影响资源。',
    '检查异常 IAM、临时凭据、公开桶、快照、函数与后门账号。',
    '收敛权限、启用 MFA 与最小权限，补密钥扫描。',
  ],
  insider: [
    '保全账号操作日志、终端行为、数据访问记录，避免打草惊蛇。',
    '按授权流程限制权限/回收账号，保留证据链。',
    '评估数据范围与合规通知；不要私自恢复已删除证据。',
    '补最小权限、双人审批与异常行为检测。',
  ],
}

export function normalizeRole(role) {
  const key = typeof role === 'string' ? role.trim().toLowerCase() : ''
  if (key === 'worker') return 'worker'
  return Object.prototype.hasOwnProperty.call(ROLES, key) ? key : 'hunt'
}

export function presetForRole(role) {
  return ROLES[normalizeRole(role)].preset
}

export function roleTitle(role) {
  return ROLES[normalizeRole(role)].title
}
