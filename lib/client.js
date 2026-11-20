window.__ModuleLoader__.load({
	id: "dsh-blue-team-mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const h = React.createElement;

		const NS = "blueTeam";
		const BLUE_ID = "dsh-blue-team-mode/console";
		const BLUE_KIND = "blue-console";

		const zh = {
			"type.label": "蓝队控制台",
			"guide.title": "蓝队控制台",
			"guide.description": "资产、告警、任务、取证与报告",
			"header": "蓝队",
			"open": "打开蓝队控制台",
			"loading": "正在读取防守态势…",
			"refresh": "刷新",
			"plan": "规划任务",
			"report": "报告",
			"overview": "态势",
			"incidents": "案件",
			"defense": "防线",
			"graph": "图谱",
			"graphNote": "风险分只用于排序；CVE 关联未验证版本，不代表已确认漏洞。",
			"exposed": "对外",
			"internal": "内部",
			"edges": "关联",
			"noAssets": "还没有资产。",
			"controlScore": "控制分",
			"controls": "控制",
			"rules": "检测规则",
			"cvePack": "CVE 防御包",
			"telemetry": "遥测",
			"responses": "响应",
			"noControls": "还没有验证过防线。",
			"verifyDefense": "验证防线",
			"pollTelemetry": "拉取遥测",
			"exportEvidence": "导出证据",
			"cveCampaign": "生成 CVE 任务",
			"lastPoll": "最近轮询",
			"health": "健康",
			"noIncidents": "暂无案件。用 blue_incident_open 创建。",
			"investigate": "调查",
			"contain": "控制",
			"closeCase": "关闭",
			"owner": "负责人",
			"summary": "摘要",
			"assets": "资产",
			"alerts": "告警",
			"findings": "发现",
			"iocs": "IOC",
			"decoys": "诱饵",
			"knowledge": "打法库",
			"knowledgeTitle": "攻击打法知识库",
			"knowledgeHint": "告警入库时自动记录攻击签名；需要时可生成防御任务，不自动改主机。",
			"remote": "远程防御",
			"remoteTitle": "远程接入",
			"remoteHint": "有人值守只填 IP；无人值守填 SSH 私钥路径，审批后自动部署防御组。",
			"defend": "生成防御任务",
			"syncDecoys": "同步事件",
			"syncMissing": "事件日志还没生成，已创建空文件，等诱饵产生事件后再同步。",
			"syncDone": "同步完成：新增 {count} 条",
			"activate": "标记运行",
			"tasks": "任务",
			"timeline": "时间线",
			"auditOk": "审计链完整（{count} 条）",
			"auditBroken": "审计链异常",
			"empty": "暂无记录",
			"noEngagement": "未绑定防守目标",
			"noEngagementHint": "新建目标，或绑定已存在的目标；也可以直接在会话里调用 blue_engagement_open。",
			"protect": "保护服务器",
			"protectTitle": "保护我的服务器",
			"protectHint": "填服务器公网 IP 或靶场网址，其他不用填。",
			"target": "服务器地址",
			"targetPlaceholder": "https://你的服务器.com 或 1.2.3.4",
			"protectStart": "开始保护",
			"protectDone": "已建立防护目标",
			"onboardingTitle": "建立本场防守目标",
			"namePlaceholder": "例如：example-ctf 靶场",
			"scopePlaceholder": "10.10.0.0/24, *.example.test",
			"notePlaceholder": "比赛规则、重点服务、联系人",
			"create": "创建",
			"bind": "绑定",
			"existing": "已存在的目标",
			"name": "名称",
			"scope": "防守范围",
			"note": "备注",
			"stats.assets": "资产",
			"stats.alerts": "未闭环告警",
			"stats.findings": "未闭环发现",
			"stats.iocs": "IOC",
			"stats.tasks": "进行中任务",
			"stats.done": "已完成",
			"severity": "级别",
			"urgency": "紧急度",
			"status": "状态",
			"title": "标题",
			"kind": "类型",
			"address": "地址",
			"criticality": "关键级别",
			"service": "服务",
			"role": "角色",
			"priority": "优先级",
			"actions": "操作",
			"confirm": "确认",
			"falsePositive": "误报",
			"followUp": "转任务",
			"fixed": "已修复",
			"accepted": "接受",
			"claim": "领取",
			"approve": "批准",
			"approveDone": "已放行：{title}",
			"pendingCount": "{count} 个待审批",
			"risk": "风险",
			"risk.low": "低风险",
			"risk.medium": "中风险",
			"risk.high": "高风险",
			"complete": "完成",
			"block": "阻塞",
			"review": "需要处理",
			"queue": "任务队列",
			"quick": "快速操作",
			"slots": "并发名额",
			"slotsSaved": "并发已设为 {count}：同时最多 {count} 个任务",
			"slotsDirty": "未保存",
			"save": "保存",
			"active": "运行",
			"queued": "排队",
			"running": "进行中",
			"addAsset": "新增资产",
			"addIoc": "新增 IOC",
			"createTask": "新建任务",
			"taskBrief": "任务说明（目标、已知事实、验收标准）",
			"value": "值",
			"confidence": "置信度",
			"source": "来源",
			"evidence": "证据",
			"recommendation": "建议",
			"category": "类别",
			"time": "时间",
			"actor": "主体",
			"action": "动作",
			"target": "对象",
			"switchTarget": "切换防守目标",
			"detail": "详情",
			"promptTitle": "派发任务书",
			"promptHint": "把下面的任务书原样交给指挥官，让它调用 subagent；控制台不能代替 Agent 发起委派。",
			"copy": "复制",
			"copied": "已复制",
			"close": "关闭",
			"resultTitle": "填写任务结论",
			"resultHint": "写清做了什么、证据与落库 id；保存后任务闭环。",
			"resultPlaceholder": "例如：已删除 /uploads/x.php，哈希 …；复测上传返回 403。",
			"blockTitle": "填写阻塞原因",
			"blockHint": "写清缺什么（权限/工具/业务窗口），指挥官据此换人或升级。",
			"blockPlaceholder": "例如：缺少数据库 root 权限，无法确认写入点。",
			"submit": "提交",
			"cancel": "取消",
			"reportEmpty": "还没有报告内容，点“生成报告”。",
			"version": "版本",
			"skills": "技能",
			"live": "实时",
			"posture": "防守态势",
			"autopilot": "自主派发",
			"postureOk": "态势可控",
			"postureAttention": "需立即处置",
			"postureHigh": "优先处理",
			"postureWatch": "跟进观察",
			"postureNote": "等待新的告警与任务回报",
			"planDone": "已生成 {count} 条任务",
			"noAlerts": "暂无告警",
			"noFindings": "暂无发现",
			"noTasks": "暂无任务",
			"noIocs": "暂无 IOC",
			"noDecoys": "暂无诱饵。用 blue_decoy_create 登记后再部署。",
			"hits": "命中",
			"expires": "到期",
			"decoyHitRate": "命中率 {rate}%",
			"decoySources": "来源分布",
			"decoySourceHint": "按命中记录的服务端来源聚合",
			"noDecoyHits": "暂无诱饵命中",
			"noTimeline": "暂无时间线",
			"all": "全部",
			"open": "待处理",
			"closed": "已关闭",
			"status.open": "待处理",
			"status.investigating": "研判中",
			"status.contained": "已遏制",
			"status.closed": "已关闭",
			"status.false_positive": "误报",
			"status.queued": "排队",
			"status.pending_approval": "待审批",
			"status.dispatched": "已派发",
			"status.running": "进行中",
			"status.done": "已完成",
			"status.blocked": "阻塞",
			"status.cancelled": "已取消",
			"status.fixed": "已修复",
			"status.accepted": "已接受",
			"severity.critical": "严重",
			"severity.high": "高危",
			"severity.medium": "中危",
			"severity.low": "低危",
			"severity.info": "信息",
			"role.monitor": "监控值守",
			"role.intel": "情报分析",
			"role.hunt": "威胁狩猎",
			"role.ir": "应急响应",
			"role.forensics": "取证分析",
			"role.hardening": "加固修复",
			"asset.in_scope": "在范围内",
			"asset.out_of_scope": "范围外",
			"asset.retired": "已下线",
			"asset.unknown": "未知",
			"criticalHigh": "严重/高危",
			"items": "{count} 项",
			"queuedCount": "{count} 个排队",
			"activeCount": "{count} 个运行",
			"totalCount": "{count} 条",
			"openCount": "{count} 个待处理",
			"recorded": "{count} 条记录",
			"indicators": "{count} 个指标",
			"events": "{count} 个事件",
			"full": "全面浏览",
			"fullTitle": "蓝队全面浏览",
			"exitFull": "退出全面浏览",
			"collapse": "收起",
			"defenseCycle": "防守阶段",
			"phase.monitor": "监控",
			"phase.triage": "研判",
			"phase.respond": "处置",
			"phase.review": "复盘",
			"openRisk": "未闭环风险",
			"unitItems": "项",
			"currentPhase": "当前",
			"assetExposure": "资产暴露面",
			"recentActivity": "最近活动"
		};
		const en = {
			"type.label": "Blue Console",
			"guide.title": "Blue Console",
			"guide.description": "Assets, alerts, tasks, forensics and reports",
			"header": "Blue",
			"open": "Open Blue Console",
			"loading": "Reading defense posture…",
			"refresh": "Refresh",
			"plan": "Plan tasks",
			"report": "Report",
			"overview": "Posture",
			"incidents": "Incidents",
			"defense": "Defense",
			"graph": "Graph",
			"graphNote": "Risk is a prioritization score; CVE links are version-unverified and do not prove exposure.",
			"exposed": "External",
			"internal": "Internal",
			"edges": "Edges",
			"noAssets": "No assets yet.",
			"controlScore": "Control score",
			"controls": "Controls",
			"rules": "Detection rules",
			"cvePack": "CVE pack",
			"telemetry": "Telemetry",
			"responses": "Responses",
			"noControls": "No control verification yet.",
			"verifyDefense": "Verify defense",
			"pollTelemetry": "Poll telemetry",
			"exportEvidence": "Export evidence",
			"cveCampaign": "Create CVE tasks",
			"lastPoll": "Last poll",
			"health": "Health",
			"noIncidents": "No incidents. Create one with blue_incident_open.",
			"investigate": "Investigate",
			"contain": "Contain",
			"closeCase": "Close",
			"owner": "Owner",
			"summary": "Summary",
			"assets": "Assets",
			"alerts": "Alerts",
			"findings": "Findings",
			"iocs": "IOC",
			"decoys": "Decoys",
			"knowledge": "Playbook",
			"knowledgeTitle": "Attack pattern knowledge base",
			"knowledgeHint": "Signatures are learned when alerts are ingested; defense tasks are opt-in, no host changes.",
			"remote": "Remote",
			"remoteTitle": "Remote access",
			"remoteHint": "Attended needs IP only; unattended needs an SSH key path and approval before deployment.",
			"defend": "Create defense task",
			"syncDecoys": "Sync events",
			"syncMissing": "Event log does not exist yet; created an empty file. Sync again after the decoy records an event.",
			"syncDone": "Sync complete: {count} new event(s)",
			"activate": "Mark running",
			"tasks": "Tasks",
			"timeline": "Timeline",
			"auditOk": "Audit chain intact ({count})",
			"auditBroken": "Audit chain broken",
			"empty": "No records",
			"noEngagement": "No defended target",
			"noEngagementHint": "Create a target, bind an existing one, or run blue_engagement_open in the session.",
			"protect": "Protect",
			"protectTitle": "Protect my server",
			"protectHint": "Enter a public IP or range URL. Nothing else required.",
			"target": "Server address",
			"targetPlaceholder": "https://your-server.com or 1.2.3.4",
			"protectStart": "Start protection",
			"protectDone": "Protection target created",
			"onboardingTitle": "Create a defended target",
			"namePlaceholder": "e.g. example-ctf",
			"scopePlaceholder": "10.10.0.0/24, *.example.test",
			"notePlaceholder": "Rules, critical services, contacts",
			"create": "Create",
			"bind": "Bind",
			"existing": "Existing targets",
			"name": "Name",
			"scope": "Scope",
			"note": "Note",
			"stats.assets": "Assets",
			"stats.alerts": "Open alerts",
			"stats.findings": "Open findings",
			"stats.iocs": "IOC",
			"stats.tasks": "Active tasks",
			"stats.done": "Done",
			"severity": "Severity",
			"urgency": "Urgency",
			"status": "Status",
			"title": "Title",
			"kind": "Kind",
			"address": "Address",
			"criticality": "Criticality",
			"service": "Service",
			"role": "Role",
			"priority": "Priority",
			"actions": "Actions",
			"confirm": "Confirm",
			"falsePositive": "False positive",
			"followUp": "Create task",
			"fixed": "Fixed",
			"accepted": "Accept",
			"claim": "Claim",
			"approve": "Approve",
			"approveDone": "Approved: {title}",
			"pendingCount": "{count} pending approval",
			"risk": "Risk",
			"risk.low": "Low risk",
			"risk.medium": "Medium risk",
			"risk.high": "High risk",
			"complete": "Complete",
			"block": "Block",
			"review": "Needs attention",
			"queue": "Task queue",
			"quick": "Quick actions",
			"slots": "Concurrency",
			"slotsSaved": "Concurrency set to {count}",
			"slotsDirty": "Unsaved",
			"save": "Save",
			"active": "active",
			"queued": "queued",
			"running": "running",
			"addAsset": "Add asset",
			"addIoc": "Add IOC",
			"createTask": "New task",
			"taskBrief": "Brief (target, known facts, acceptance)",
			"value": "Value",
			"confidence": "Confidence",
			"source": "Source",
			"evidence": "Evidence",
			"recommendation": "Recommendation",
			"category": "Category",
			"time": "Time",
			"actor": "Actor",
			"action": "Action",
			"target": "Target",
			"switchTarget": "Switch target",
			"detail": "Detail",
			"promptTitle": "Task brief",
			"promptHint": "Give this brief to the commander so it can call subagent; the console cannot delegate on the Agent's behalf.",
			"copy": "Copy",
			"copied": "Copied",
			"close": "Close",
			"resultTitle": "Task result",
			"resultHint": "Record what was done, the evidence, and the stored ids.",
			"resultPlaceholder": "e.g. removed /uploads/x.php (sha256 …); upload retest returns 403.",
			"blockTitle": "Blocking reason",
			"blockHint": "Say what is missing (access, tooling, window) so the commander can reroute.",
			"blockPlaceholder": "e.g. no database root access; write point unconfirmed.",
			"submit": "Submit",
			"cancel": "Cancel",
			"reportEmpty": "No report yet. Click Generate.",
			"version": "Version",
			"skills": "Skills",
			"live": "Live",
			"posture": "Defense posture",
			"autopilot": "Autopilot",
			"postureOk": "Under control",
			"postureAttention": "Action required",
			"postureHigh": "High priority",
			"postureWatch": "Monitoring",
			"postureNote": "Waiting for new alerts and task results",
			"planDone": "{count} task(s) created",
			"noAlerts": "No alerts",
			"noFindings": "No findings",
			"noTasks": "No tasks",
			"noIocs": "No IOC",
			"noDecoys": "No decoys. Register one with blue_decoy_create before deployment.",
			"hits": "Hits",
			"expires": "Expires",
			"decoyHitRate": "Hit rate {rate}%",
			"decoySources": "Source breakdown",
			"decoySourceHint": "Aggregated from server-side hit records",
			"noDecoyHits": "No decoy hits yet",
			"noTimeline": "No timeline",
			"all": "All",
			"open": "Open",
			"closed": "Closed",
			"status.open": "Open",
			"status.investigating": "Investigating",
			"status.contained": "Contained",
			"status.closed": "Closed",
			"status.false_positive": "False positive",
			"status.queued": "Queued",
			"status.pending_approval": "Pending approval",
			"status.dispatched": "Dispatched",
			"status.running": "Running",
			"status.done": "Done",
			"status.blocked": "Blocked",
			"status.cancelled": "Cancelled",
			"status.fixed": "Fixed",
			"status.accepted": "Accepted",
			"severity.critical": "Critical",
			"severity.high": "High",
			"severity.medium": "Medium",
			"severity.low": "Low",
			"severity.info": "Info",
			"role.monitor": "Monitor",
			"role.intel": "Intel",
			"role.hunt": "Hunt",
			"role.ir": "Incident response",
			"role.forensics": "Forensics",
			"role.hardening": "Hardening",
			"asset.in_scope": "In scope",
			"asset.out_of_scope": "Out of scope",
			"asset.retired": "Retired",
			"asset.unknown": "Unknown",
			"criticalHigh": "critical/high",
			"items": "{count} item(s)",
			"queuedCount": "{count} queued",
			"activeCount": "{count} active",
			"totalCount": "{count} total",
			"openCount": "{count} open",
			"recorded": "{count} recorded",
			"indicators": "{count} indicators",
			"events": "{count} events",
			"full": "Fullscreen",
			"fullTitle": "Blue Full View",
			"exitFull": "Exit full view",
			"collapse": "Collapse",
			"defenseCycle": "Defense cycle",
			"phase.monitor": "Monitor",
			"phase.triage": "Triage",
			"phase.respond": "Respond",
			"phase.review": "Review",
			"openRisk": "Open risk",
			"unitItems": "item(s)",
			"currentPhase": "Current",
			"assetExposure": "Asset exposure",
			"recentActivity": "Recent activity"
		};

		const CSS = `
:root{--bt-dock-w:600px;--bt-accent:#4f8cff;--bt-cyan:#22d3ee}
/* 独立右侧面板：shell.overlay 常驻。 */
.bt-dock{position:absolute;top:var(--dsh-frame-chrome-top,var(--dsh-frame-top-clearance,var(--dsh-windows-titlebar-height,0px)));
  right:0;bottom:0;z-index:20;display:flex;flex-direction:column;width:var(--bt-dock-w);
  background:var(--dsw-alias-bg-layer-1);border-left:1px solid rgba(90,140,255,.35);
  box-shadow:-24px 0 60px -40px rgba(0,0,0,.9),-1px 0 0 rgba(90,140,255,.25);
  pointer-events:auto;overflow:hidden;transition:transform .18s ease,opacity .18s ease}
.bt-dock[data-open="0"]{display:none}
.bt-dock .bt-root{height:100%;min-height:0}
.bt-full{position:fixed;inset:0;width:100%!important;height:100%;z-index:9999;border-left:0;box-shadow:none;
  background:var(--dsw-alias-bg-base)}
.bt-dock.bt-full{display:flex!important;transform:none!important;opacity:1!important;pointer-events:auto!important}
div:has(> [data-shell-overlay] .bt-dock[data-open="1"])[data-details-collapsed],
div:has(> [data-shell-overlay] .bt-dock[data-open="1"])[data-rightbar-collapsed]{padding-right:var(--bt-dock-w)}
div:has(> [data-shell-overlay] .bt-dock.bt-full){padding-right:0!important}
div:has(> [data-shell-overlay] .bt-dock[data-open="1"]):not([data-details-collapsed]):not([data-rightbar-collapsed]) .bt-dock,
div:has(> [data-shell-overlay] .bt-dock[data-open="1"])[data-rightbar-fullscreen] .bt-dock{
  transform:translateX(100%);opacity:0;pointer-events:none}
.bt-grip{position:absolute;left:-2px;top:0;bottom:0;width:4px;cursor:col-resize;background:transparent;z-index:3}
.bt-grip:hover{background:linear-gradient(180deg,transparent,rgba(79,140,255,.7),transparent)}
.bt-hbtn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);
  background:transparent;color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 8px;
  font-size:11px;font-weight:550;cursor:pointer;font-family:inherit;white-space:nowrap}
.bt-hbtn:hover{background:transparent;border-color:rgba(79,140,255,.6);box-shadow:0 0 0 3px rgba(79,140,255,.12)}
.bt-hbtn.on{background:transparent;border-color:rgba(79,140,255,.6)}

/* ================= 令牌 ================= */
.bt-root{
  color-scheme:light dark;
  --bt-accent:#4f8cff;--bt-accent:light-dark(#2f6feb,#4f8cff);
  --bt-cyan:#0891b2;--bt-cyan:light-dark(#0891b2,#22d3ee);
  --bt-violet:#7c3aed;--bt-violet:light-dark(#6d28d9,#a78bfa);
  --bt-brand:var(--dsw-alias-brand-primary,var(--bt-accent));
  --bt-text:#101a2c;--bt-text:light-dark(#101a2c,#e9f0ff);
  --bt-muted:#4a5b76;--bt-muted:light-dark(#4a5b76,#a4b6d4);
  --bt-faint:#6c7d99;--bt-faint:light-dark(#6c7d99,#7688a8);
  --bt-bg:#eaf0fa;--bt-bg:light-dark(#eaf0fa,#070b13);
  --bt-layer:rgba(255,255,255,.92);--bt-layer:light-dark(rgba(255,255,255,.92),rgba(13,20,34,.9));
  --bt-layer2:rgba(242,246,253,.94);--bt-layer2:light-dark(rgba(242,246,253,.94),rgba(22,32,52,.92));
  --bt-glass:rgba(255,255,255,.72);--bt-glass:light-dark(rgba(255,255,255,.72),rgba(9,15,26,.78));
  --bt-head-bg:rgba(255,255,255,.72);--bt-head-bg:light-dark(rgba(255,255,255,.74),rgba(24,40,70,.55));
  --bt-tabs-bg:rgba(245,248,255,.86);--bt-tabs-bg:light-dark(rgba(245,248,255,.86),rgba(16,26,44,.5));
  --bt-foot-bg:rgba(245,248,255,.86);--bt-foot-bg:light-dark(rgba(245,248,255,.86),rgba(9,15,26,.5));
  --bt-modal-bg:rgba(255,255,255,.98);--bt-modal-bg:light-dark(rgba(255,255,255,.98),rgba(12,19,32,.98));
  --bt-hair:rgba(79,140,255,.16);--bt-hair:light-dark(rgba(47,111,235,.16),rgba(90,150,255,.2));
  --bt-line:color-mix(in srgb,var(--bt-text) 12%,transparent);
  --bt-line-soft:color-mix(in srgb,var(--bt-text) 7%,transparent);
  --bt-line-strong:color-mix(in srgb,var(--bt-text) 20%,transparent);
  --bt-danger:#b42318;--bt-danger:light-dark(#b42318,#ff6b6b);
  --bt-warn:#b54708;--bt-warn:light-dark(#b54708,#ffb020);
  --bt-ok:#087443;--bt-ok:light-dark(#087443,#35e0a1);
  --bt-info:#3538cd;--bt-info:light-dark(#3538cd,#a78bfa);
  --bt-r:8px;
  --bt-mono:ui-monospace,"SFMono-Regular","JetBrains Mono","Cascadia Mono",Menlo,Consolas,monospace;
  --bt-sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",system-ui,sans-serif;
  display:flex;flex-direction:column;height:100%;min-height:0;position:relative;overflow:hidden;
  color:var(--bt-text);font:12.5px/1.55 var(--bt-sans);letter-spacing:0;
  background:
    radial-gradient(760px 420px at 88% -12%,rgba(79,140,255,.18),transparent 62%),
    radial-gradient(520px 360px at -10% 108%,rgba(34,211,238,.1),transparent 60%),
    var(--bt-bg);
}
body[data-ds-dark-theme] .bt-root{
  --bt-text:#e9f0ff;--bt-muted:#a4b6d4;--bt-faint:#7688a8;
  --bt-bg:#070b13;
  --bt-layer:rgba(13,20,34,.9);--bt-layer2:rgba(22,32,52,.92);--bt-glass:rgba(9,15,26,.78);
  --bt-head-bg:rgba(24,40,70,.55);--bt-tabs-bg:rgba(16,26,44,.5);
  --bt-foot-bg:rgba(9,15,26,.5);--bt-modal-bg:rgba(12,19,32,.98);
  --bt-hair:rgba(90,150,255,.2);
  --bt-accent:#4f8cff;--bt-cyan:#22d3ee;--bt-violet:#a78bfa;
  --bt-danger:#ff6b6b;--bt-warn:#ffb020;--bt-ok:#35e0a1;--bt-info:#a78bfa;
}
.bt-root *{box-sizing:border-box}
.bt-root button,.bt-root input,.bt-root textarea{font-family:inherit}
.bt-root b,.bt-root strong{font-weight:650}
.bt-root *::-webkit-scrollbar{width:9px;height:9px}
.bt-root *::-webkit-scrollbar-thumb{background:rgba(90,140,255,.32);border-radius:99px;border:3px solid transparent;background-clip:padding-box}
.bt-root *::-webkit-scrollbar-thumb:hover{background:rgba(120,170,255,.55);background-clip:padding-box}
.bt-root *::-webkit-scrollbar-track{background:transparent}

/* ================= 顶栏 ================= */
.bt-head{position:relative;display:flex;align-items:center;gap:12px;padding:12px 14px;flex:none;z-index:2;
  background:var(--bt-head-bg);
  backdrop-filter:blur(16px) saturate(130%);-webkit-backdrop-filter:blur(16px) saturate(130%);
  border-bottom:1px solid transparent}
.bt-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(79,140,255,.7),rgba(34,211,238,.45),transparent)}
.bt-brand{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.bt-logo{width:30px;height:30px;border-radius:8px;flex:none;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,#3f7dff,#1fc8e3);
  box-shadow:0 6px 18px -8px rgba(63,125,255,.9),inset 0 1px 0 rgba(255,255,255,.35)}
.bt-brand-copy{min-width:0;flex:1}
.bt-title{font:650 13.5px/1.25 var(--bt-sans);display:flex;align-items:center;gap:7px;min-width:0}
.bt-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--bt-text)}
.bt-ver{font:600 9px/1.7 var(--bt-mono);letter-spacing:.02em;color:var(--bt-accent);
  border:1px solid color-mix(in srgb,var(--bt-accent) 40%,transparent);border-radius:4px;padding:0 5px;
  background:color-mix(in srgb,var(--bt-accent) 12%,transparent);flex:none}
.bt-sub{font:400 10px/1.5 var(--bt-mono);color:var(--bt-faint);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;margin-top:2px;letter-spacing:.01em;display:flex;align-items:center;gap:4px;min-width:0}
.bt-target-select{appearance:none;-webkit-appearance:none;border:0;background:transparent;color:inherit;
  font:inherit;padding:0 12px 0 0;margin:0;max-width:190px;cursor:pointer;outline:none;
  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:right 3px top 58%,right 0 top 58%;background-size:4px 4px,4px 4px;background-repeat:no-repeat;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-target-select:hover{color:var(--bt-text)}
.bt-target-select:focus-visible{box-shadow:0 0 0 2px rgba(79,140,255,.25);border-radius:3px}
.bt-target-select option{background:var(--bt-bg);color:var(--bt-text)}
.bt-sub .bt-sub-scope{overflow:hidden;text-overflow:ellipsis;min-width:0}
.bt-head-actions{display:flex;gap:6px;flex:none}

/* ================= 按钮 ================= */
.bt-btn{display:inline-flex;align-items:center;gap:5px;cursor:pointer;
  border:1px solid rgba(120,165,255,.22);background:rgba(255,255,255,.04);color:var(--bt-text);
  border-radius:6px;padding:4px 10px;font-size:11.5px;font-weight:550;white-space:nowrap;line-height:18px;
  transition:background .14s,border-color .14s,color .14s,box-shadow .14s,transform .14s}
.bt-btn:hover{background:rgba(79,140,255,.12);border-color:rgba(79,140,255,.45);
  box-shadow:0 0 0 3px rgba(79,140,255,.1)}
.bt-btn:active{transform:translateY(1px)}
.bt-btn:disabled{opacity:.42;cursor:default;box-shadow:none;transform:none}
.bt-btn-primary{border-color:transparent;color:#fff;font-weight:650;
  background:linear-gradient(135deg,#3f7dff,#1fc8e3);
  box-shadow:0 8px 22px -12px rgba(63,125,255,.95),inset 0 1px 0 rgba(255,255,255,.28)}
.bt-btn-primary:hover{background:linear-gradient(135deg,#4f8cff,#2fd4e3);border-color:transparent;
  box-shadow:0 10px 26px -12px rgba(63,125,255,1)}
.bt-btn-ghost{background:transparent;border-color:transparent}
.bt-btn-ghost:hover{border-color:rgba(120,165,255,.3);background:transparent}
.bt-btn-sm{padding:2px 8px;font-size:10.5px;border-radius:5px;line-height:16px}
.bt-btn-icon{display:inline-flex;align-items:center}

/* ================= 页签 ================= */
.bt-tabs{display:flex;align-items:stretch;gap:2px;padding:0 10px;flex:none;overflow-x:auto;
  border-bottom:1px solid rgba(90,140,255,.18);scrollbar-width:none;
  background:var(--bt-tabs-bg);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.bt-tabs::-webkit-scrollbar{display:none}
.bt-tab{position:relative;border:0;background:transparent;color:var(--bt-muted);border-radius:6px 6px 0 0;
  padding:9px 10px 8px;font:550 10.5px/1 var(--bt-mono);letter-spacing:.03em;cursor:pointer;white-space:nowrap;
  transition:color .14s,background .14s}
.bt-tab:hover{color:var(--bt-text);background:rgba(79,140,255,.08)}
.bt-tab.on{color:var(--bt-text);background:linear-gradient(180deg,color-mix(in srgb,var(--bt-accent) 22%,transparent),color-mix(in srgb,var(--bt-accent) 3%,transparent));
  box-shadow:inset 0 -2px 0 var(--bt-accent),0 10px 24px -20px var(--bt-accent)}
.bt-tab-count{display:inline-block;margin-left:5px;padding:0 4px;border-radius:4px;font:600 9px/1.6 var(--bt-mono);
  color:var(--bt-faint);background:rgba(120,165,255,.12);vertical-align:1px}
.bt-tab.on .bt-tab-count{color:var(--bt-accent);background:color-mix(in srgb,var(--bt-accent) 28%,transparent)}

/* ================= 主体 ================= */
.bt-body{flex:1;min-height:0;overflow:auto;padding:14px 14px 22px;position:relative;
  background-image:
    linear-gradient(to right,rgba(90,140,255,.07) 1px,transparent 1px),
    linear-gradient(to bottom,rgba(90,140,255,.07) 1px,transparent 1px),
    radial-gradient(620px 260px at 100% 0%,rgba(79,140,255,.1),transparent 70%);
  background-size:48px 48px,48px 48px,100% 100%;background-position:-1px -1px,0 0,0 0}
.bt-page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin:0 0 12px;
  padding-bottom:10px;border-bottom:1px solid var(--bt-hair)}
.bt-page-title{font:650 13.5px/1.35 var(--bt-sans);letter-spacing:.01em;display:flex;align-items:center;gap:8px}
.bt-page-title::before{content:"";width:3px;height:14px;border-radius:2px;flex:none;
  background:linear-gradient(180deg,var(--bt-accent),var(--bt-cyan))}
.bt-page-sub{font-size:10.5px;color:var(--bt-muted);margin-top:3px;line-height:1.5;padding-left:11px}
.bt-page-actions{display:flex;gap:5px;flex:none}

/* ================= 卡片 ================= */
.bt-card,.bt-section,.bt-ov-score,.bt-ov-rail{position:relative;border:1px solid var(--bt-hair);
  border-radius:var(--bt-r);background:linear-gradient(180deg,var(--bt-layer),var(--bt-layer2));
  box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 16px 40px -32px rgba(0,0,0,.9);
  min-width:0}
.bt-card::before,.bt-section::before,.bt-ov-score::before{content:"";position:absolute;inset:0;border-radius:inherit;
  pointer-events:none;opacity:.55;
  background:
    linear-gradient(var(--bt-accent),var(--bt-accent)) left top/11px 1px no-repeat,
    linear-gradient(var(--bt-accent),var(--bt-accent)) left top/1px 11px no-repeat,
    linear-gradient(var(--bt-cyan),var(--bt-cyan)) right bottom/11px 1px no-repeat,
    linear-gradient(var(--bt-cyan),var(--bt-cyan)) right bottom/1px 11px no-repeat}
.bt-hero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(170px,.55fr);gap:10px;margin-bottom:10px}
.bt-hero-main{padding:14px 15px;overflow:hidden}
.bt-eyebrow{font:600 9px/1.6 var(--bt-mono);letter-spacing:.2em;text-transform:uppercase;
  color:var(--bt-cyan);opacity:.95}
.bt-hero-title{font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.2;margin:5px 0 3px;overflow-wrap:anywhere}
.bt-hero-scope{font:400 10.5px/1.6 var(--bt-mono);color:var(--bt-muted);overflow-wrap:anywhere}
.bt-hero-note{font-size:11px;color:var(--bt-muted);margin:7px 0 0;display:-webkit-box;-webkit-line-clamp:2;
  -webkit-box-orient:vertical;overflow:hidden;line-height:1.55}
.bt-hero-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
.bt-status{display:inline-flex;align-items:center;gap:5px;border-radius:4px;padding:1px 7px;
  font:600 9px/1.8 var(--bt-mono);letter-spacing:.05em;color:var(--bt-ok);
  border:1px solid rgba(53,224,161,.35);background:rgba(53,224,161,.1)}
.bt-status i{width:5px;height:5px;border-radius:50%;background:currentColor;
  box-shadow:0 0 8px currentColor}
.bt-status.danger{border-color:rgba(255,107,107,.4);background:rgba(255,107,107,.1);color:var(--bt-danger)}
.bt-status.warn{border-color:rgba(255,176,32,.4);background:rgba(255,176,32,.1);color:var(--bt-warn)}
.bt-hero-side{padding:12px 13px;display:flex;flex-direction:column;min-width:0}
.bt-slot-line{display:flex;align-items:baseline;gap:5px;margin-top:2px}
.bt-slot-value{font:700 30px/1.05 var(--bt-sans);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.bt-slot-unit{font-size:10px;color:var(--bt-muted);font-weight:600}
.bt-bar{height:5px;border-radius:99px;background:rgba(120,165,255,.14);overflow:hidden;margin:10px 0 6px}
.bt-bar>i{display:block;height:100%;border-radius:99px;
  background:linear-gradient(90deg,var(--bt-accent),var(--bt-cyan));
  box-shadow:0 0 12px rgba(79,140,255,.7)}
.bt-slot-meta{font:400 10px/1.5 var(--bt-mono);color:var(--bt-muted);display:flex;gap:10px;flex-wrap:wrap}
.bt-slot-form{display:flex;gap:5px;margin-top:auto;padding-top:10px}

/* ================= 指标 ================= */
.bt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
.bt-stat{border:1px solid var(--bt-hair);border-radius:8px;padding:10px 11px;position:relative;overflow:hidden;
  background:linear-gradient(180deg,var(--bt-layer),var(--bt-layer2));
  box-shadow:0 12px 30px -28px rgba(0,0,0,.9)}
.bt-stat::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;
  background:linear-gradient(90deg,var(--bt-accent),transparent 70%);opacity:.5}
.bt-stat-label{font:600 9px/1.6 var(--bt-mono);letter-spacing:.1em;text-transform:uppercase;
  color:var(--bt-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-stat-value{font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin-top:2px;
  font-variant-numeric:tabular-nums}
.bt-stat-sub{font-size:9.5px;color:var(--bt-faint);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-stat.danger .bt-stat-value{color:var(--bt-danger);text-shadow:0 0 18px rgba(255,107,107,.35)}
.bt-stat.danger::before{background:linear-gradient(90deg,var(--bt-danger),transparent 70%);opacity:.9}
.bt-stat.warn .bt-stat-value{color:var(--bt-warn);text-shadow:0 0 18px rgba(255,176,32,.3)}
.bt-stat.warn::before{background:linear-gradient(90deg,var(--bt-warn),transparent 70%);opacity:.9}
.bt-stat.ok .bt-stat-value{color:var(--bt-ok)}
.bt-stat.ok::before{background:linear-gradient(90deg,var(--bt-ok),transparent 70%);opacity:.9}

/* ================= 区块 ================= */
.bt-columns{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:10px}
.bt-section{margin-bottom:10px;overflow:hidden}
.bt-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:10px 12px;
  border-bottom:1px solid var(--bt-hair);
  background:linear-gradient(180deg,rgba(79,140,255,.1),rgba(79,140,255,.02))}
.bt-section-title{font:650 11.5px/1.4 var(--bt-sans);display:flex;align-items:center;gap:7px}
.bt-section-title::before{content:"";width:3px;height:12px;border-radius:2px;flex:none;
  background:linear-gradient(180deg,var(--bt-accent),var(--bt-cyan))}
.bt-section-sub{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:2px}
.bt-section-actions{display:flex;gap:5px;flex:none;align-items:center}
.bt-section-body{padding:6px 12px 10px}

/* ================= 列表 ================= */
.bt-list{display:flex;flex-direction:column;min-width:0}
.bt-item{display:flex;gap:8px;align-items:flex-start;padding:8px 5px;min-width:0;
  border-top:1px solid var(--bt-line-soft);transition:background .12s}
.bt-item:first-child{border-top:0}
.bt-item:hover{background:linear-gradient(90deg,rgba(79,140,255,.12),transparent);border-radius:6px}
.bt-item-main{flex:1;min-width:0}
.bt-item-title{font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:6px;min-width:0}
.bt-item-title .txt{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  white-space:normal;line-height:1.4}
.bt-item-meta{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:3px;display:flex;gap:7px;flex-wrap:wrap}
.bt-item-actions{display:flex;gap:4px;flex:none;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.bt-dot{width:6px;height:6px;border-radius:50%;flex:none;margin-top:6px;background:var(--bt-muted)}
.bt-dot.critical{background:var(--bt-danger);box-shadow:0 0 10px var(--bt-danger)}
.bt-dot.high{background:var(--bt-warn);box-shadow:0 0 10px var(--bt-warn)}
.bt-dot.medium{background:#eab308;box-shadow:0 0 10px #eab308}
.bt-dot.low{background:var(--bt-muted)}

/* ================= 徽标 ================= */
.bt-badge{display:inline-flex;align-items:center;gap:3px;border-radius:4px;padding:0 6px;
  font:600 9px/1.9 var(--bt-mono);letter-spacing:.04em;border:1px solid transparent;white-space:nowrap}
.bt-badge-critical{color:var(--bt-danger);background:rgba(255,107,107,.12);border-color:rgba(255,107,107,.4)}
.bt-badge-high{color:var(--bt-warn);background:rgba(255,176,32,.12);border-color:rgba(255,176,32,.4)}
.bt-badge-medium{color:#eab308;background:rgba(234,179,8,.12);border-color:rgba(234,179,8,.38)}
.bt-badge-low{color:var(--bt-muted);background:rgba(120,165,255,.1);border-color:var(--bt-hair)}
.bt-badge-info{color:var(--bt-info);background:rgba(167,139,250,.12);border-color:rgba(167,139,250,.38)}
.bt-badge-ok{color:var(--bt-ok);background:rgba(53,224,161,.12);border-color:rgba(53,224,161,.4)}
.bt-badge-warn{color:var(--bt-warn);background:rgba(255,176,32,.12);border-color:rgba(255,176,32,.4)}
.bt-badge-danger{color:var(--bt-danger);background:rgba(255,107,107,.12);border-color:rgba(255,107,107,.4)}
.bt-badge-muted{color:var(--bt-muted);background:transparent;border-color:var(--bt-line-strong)}

/* ================= 表格 ================= */
.bt-table-wrap{border:1px solid var(--bt-hair);border-radius:8px;overflow:auto;
  background:linear-gradient(180deg,var(--bt-layer),var(--bt-layer2))}
.bt-table{width:100%;min-width:520px;border-collapse:collapse;font-size:11px}
.bt-table th{position:sticky;top:0;z-index:1;text-align:left;padding:7px 9px;
  font:600 9px/1.6 var(--bt-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--bt-cyan);
  white-space:nowrap;background:rgba(79,140,255,.1);border-bottom:1px solid var(--bt-hair)}
.bt-table td{padding:8px 9px;border-bottom:1px solid var(--bt-line-soft);vertical-align:top;word-break:break-word}
.bt-table tr:last-child td{border-bottom:0}
.bt-table tbody tr:hover td{background:rgba(79,140,255,.08)}
.bt-cell-title{font-weight:600;font-size:11.5px;line-height:1.4}
.bt-cell-meta{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:2px;display:flex;gap:6px;flex-wrap:wrap}

/* ================= 表单 ================= */
.bt-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:12px;
  border:1px solid var(--bt-hair);border-radius:8px;
  background:linear-gradient(180deg,rgba(79,140,255,.06),rgba(79,140,255,.01));margin-bottom:10px}
.bt-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.bt-field-full{grid-column:1/-1}
.bt-label{font:600 9px/1.6 var(--bt-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--bt-faint)}
.bt-input{height:32px;border:1px solid var(--bt-hair);border-radius:6px;background:var(--bt-glass);
  color:var(--bt-text);padding:0 10px;font-size:11.5px;outline:none;min-width:0;width:100%;
  transition:border-color .14s,box-shadow .14s}
.bt-input:focus{border-color:var(--bt-accent);box-shadow:0 0 0 3px rgba(79,140,255,.18)}
.bt-textarea{height:auto;min-height:58px;padding:7px 9px;resize:vertical;line-height:1.5}
.bt-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:6px;margin-top:2px}

/* ================= 空态 / 提示 ================= */
.bt-empty{margin:12px auto;padding:22px 14px;max-width:390px;text-align:center;color:var(--bt-muted);font-size:11px;
  border:1px dashed var(--bt-hair);border-radius:8px;background:rgba(79,140,255,.03)}
.bt-empty-icon{display:flex;justify-content:center;margin-bottom:7px;color:var(--bt-accent);opacity:.75}
.bt-empty-title{font-size:11.5px;font-weight:650;color:var(--bt-text);margin-bottom:2px}
.bt-alert{display:flex;gap:6px;align-items:flex-start;border:1px solid rgba(255,107,107,.4);
  background:rgba(255,107,107,.09);color:var(--bt-danger);border-radius:6px;
  padding:7px 10px;font-size:10.5px;margin-bottom:8px;white-space:pre-wrap}
.bt-notice{border:1px solid rgba(53,224,161,.4);background:rgba(53,224,161,.09);color:var(--bt-ok);
  border-radius:6px;padding:5px 9px;font-size:10.5px;margin-bottom:8px}

/* ================= 时间线 ================= */
.bt-timeline{position:relative;padding:2px 0 2px 14px}
.bt-timeline::before{content:"";position:absolute;left:3px;top:5px;bottom:5px;width:1px;
  background:linear-gradient(180deg,rgba(79,140,255,.6),rgba(34,211,238,.25),transparent)}
.bt-tl-item{position:relative;padding:0 0 13px 8px}
.bt-tl-item:last-child{padding-bottom:2px}
.bt-tl-dot{position:absolute;left:-14px;top:5px;width:6px;height:6px;border-radius:50%;
  background:var(--bt-accent);box-shadow:0 0 10px var(--bt-accent)}
.bt-tl-time{font:400 9px/1.6 var(--bt-mono);color:var(--bt-faint)}
.bt-tl-title{font-size:11.5px;font-weight:600;margin-top:1px}
.bt-tl-detail{font-size:10.5px;color:var(--bt-muted);margin-top:1px;overflow-wrap:anywhere}

/* ================= 报告 / 页脚 ================= */
.bt-report{white-space:pre-wrap;word-break:break-word;font:400 10.5px/1.7 var(--bt-mono);
  background:var(--bt-glass);border:1px solid var(--bt-hair);border-radius:8px;
  padding:13px;margin:0;color:var(--bt-text)}
.bt-foot{flex:none;display:flex;align-items:center;gap:12px;padding:7px 12px;
  border-top:1px solid var(--bt-hair);background:var(--bt-foot-bg);
  font:400 9px/1.6 var(--bt-mono);letter-spacing:.05em;color:var(--bt-faint);
  white-space:nowrap;overflow:hidden}
.bt-live{display:inline-flex;align-items:center;gap:6px;color:var(--bt-ok);font-weight:600}
.bt-live i{width:6px;height:6px;border-radius:50%;background:var(--bt-ok);
  animation:bt-pulse 2.6s ease-out infinite}
@keyframes bt-pulse{
  0%{box-shadow:0 0 0 0 rgba(53,224,161,.55)}
  70%{box-shadow:0 0 0 5px rgba(53,224,161,0)}
  100%{box-shadow:0 0 0 0 rgba(53,224,161,0)}
}
.bt-grow{flex:1}

/* ================= 引导 ================= */
.bt-onboard{max-width:500px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.bt-onboard-card{padding:18px}
.bt-onboard-icon{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,#3f7dff,#1fc8e3);
  box-shadow:0 10px 26px -14px rgba(63,125,255,.9),inset 0 1px 0 rgba(255,255,255,.3);margin-bottom:11px}
.bt-onboard-title{font-size:18px;font-weight:700;letter-spacing:-.01em;margin:3px 0}
.bt-onboard-text{font-size:11.5px;color:var(--bt-muted);margin:0 0 12px;line-height:1.6}
.bt-onboard .bt-form{margin-bottom:0}
.bt-seg{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--bt-hair);
  border-radius:6px;background:rgba(79,140,255,.04);margin-bottom:6px}
.bt-seg-main{flex:1;min-width:0}
.bt-seg-name{font-size:11.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-seg-meta{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:1px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ================= 弹层 ================= */
.bt-mask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(3,7,14,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.bt-modal{width:min(720px,100%);max-height:86vh;display:flex;flex-direction:column;overflow:hidden;
  background:var(--bt-modal-bg);
  border:1px solid var(--bt-hair);border-radius:10px;
  box-shadow:0 30px 80px -30px rgba(0,0,0,.95),0 0 0 1px rgba(79,140,255,.12)}
.bt-modal-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:11px 14px;
  border-bottom:1px solid var(--bt-hair);background:rgba(79,140,255,.07)}
.bt-modal-title{font-size:12.5px;font-weight:650;display:flex;align-items:center;gap:6px}
.bt-modal-body{padding:13px;overflow:auto;min-height:0}
.bt-modal-foot{display:flex;justify-content:flex-end;gap:6px;padding:11px 13px;border-top:1px solid var(--bt-hair)}
.bt-prompt{width:100%;min-height:300px;background:var(--bt-glass);border:1px solid var(--bt-hair);
  border-radius:6px;padding:11px;color:var(--bt-text);font:400 10.5px/1.6 var(--bt-mono);resize:vertical;outline:none}
.bt-prompt:focus{border-color:var(--bt-accent);box-shadow:0 0 0 3px rgba(79,140,255,.18)}
.bt-modal-hint{font-size:10.5px;color:var(--bt-muted);margin:0 0 8px}
.bt-preset{font:400 9.5px/1.6 var(--bt-mono);border:1px solid var(--bt-hair);border-radius:4px;
  padding:1px 6px;background:rgba(79,140,255,.08);color:var(--bt-muted)}

/* ================= 态势页 ================= */
.bt-ov-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
.bt-ov-heading{min-width:0;flex:1}
.bt-ov-title-row{display:flex;align-items:center;gap:8px;min-width:0;margin-top:3px}
.bt-ov-title{font-size:19px;font-weight:700;letter-spacing:-.01em;line-height:1.2;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.bt-stage-chip{font:600 9px/1.9 var(--bt-mono);letter-spacing:.06em;
  border:1px solid color-mix(in srgb,var(--bt-accent) 35%,transparent);
  border-radius:4px;padding:0 7px;color:var(--bt-accent);
  background:color-mix(in srgb,var(--bt-accent) 12%,transparent);white-space:nowrap;flex:none}
.bt-ov-hero{display:grid;grid-template-columns:235px minmax(0,1fr);gap:10px;margin-bottom:10px}
.bt-protect-banner{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--bt-hair);
  border-radius:8px;padding:11px 13px;margin-bottom:10px;
  background:linear-gradient(90deg,rgba(79,140,255,.08),rgba(79,140,255,.01))}
.bt-protect-banner.risk{border-left:2px solid var(--bt-danger)}
.bt-protect-banner.watching{border-left:2px solid var(--bt-ok)}
.bt-protect-banner.setup{border-left:2px solid var(--bt-warn)}
.bt-protect-icon{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;flex:none;
  color:var(--bt-accent);background:rgba(79,140,255,.12);border:1px solid rgba(79,140,255,.35)}
.bt-protect-banner.risk .bt-protect-icon{color:var(--bt-danger);border-color:rgba(255,107,107,.4);background:rgba(255,107,107,.1)}
.bt-protect-banner.watching .bt-protect-icon{color:var(--bt-ok);border-color:rgba(53,224,161,.4);background:rgba(53,224,161,.1)}
.bt-protect-banner.setup .bt-protect-icon{color:var(--bt-warn);border-color:rgba(255,176,32,.4);background:rgba(255,176,32,.1)}
.bt-protect-copy{min-width:0;flex:1}
.bt-protect-headline{font-size:14px;font-weight:650;letter-spacing:-.01em}
.bt-protect-next{font-size:11px;color:var(--bt-muted);margin-top:3px;line-height:1.55}
.bt-ov-score{padding:14px;display:flex;flex-direction:column;min-width:0;overflow:hidden;
  background:
    radial-gradient(240px 160px at 100% 0%,rgba(34,211,238,.16),transparent 65%),
    linear-gradient(180deg,rgba(79,140,255,.16),rgba(79,140,255,.03)),var(--bt-layer)}
.bt-ov-score::after{content:"";position:absolute;right:-46px;top:-46px;width:172px;height:172px;border-radius:50%;
  pointer-events:none;opacity:.5;
  background:conic-gradient(from 210deg,rgba(79,140,255,.65),rgba(34,211,238,.35),transparent 62%);
  -webkit-mask:radial-gradient(circle,transparent 61%,#000 62%);
  mask:radial-gradient(circle,transparent 61%,#000 62%)}
.bt-ov-score-label{font:600 9px/1.6 var(--bt-mono);letter-spacing:.16em;color:var(--bt-cyan);text-transform:uppercase}
.bt-ov-score-num{font-size:44px;line-height:1.02;font-weight:750;letter-spacing:-1.4px;
  font-variant-numeric:tabular-nums;margin:6px 0 2px;color:var(--bt-accent)}
@supports ((-webkit-background-clip:text)){
  .bt-ov-score-num{background:linear-gradient(120deg,#8ab6ff,#22d3ee);
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
}
.bt-ov-score-num small{font:500 11px/1 var(--bt-mono);margin-left:5px;letter-spacing:0;
  -webkit-text-fill-color:var(--bt-faint);color:var(--bt-faint)}
.bt-ov-score-sub{font-size:10.5px;color:var(--bt-muted);line-height:1.55}
.bt-ov-score-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:11px}
.bt-ov-rail{padding:12px;min-width:0;display:flex;flex-direction:column}
.bt-ov-rail-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.bt-ov-rail-title{font:600 9px/1.6 var(--bt-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--bt-cyan)}
.bt-ov-stages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}
.bt-stage{min-width:0;padding:3px 0 0 11px;border-left:1px solid var(--bt-line);
  border-top:2px solid rgba(120,165,255,.18);margin-top:2px;position:relative}
.bt-stage:first-child{border-left:0;padding-left:0}
.bt-stage.on{border-top-color:var(--bt-accent);
  background:linear-gradient(180deg,rgba(79,140,255,.16),transparent);
  box-shadow:0 12px 30px -24px rgba(79,140,255,.9)}
.bt-stage-node{font:600 9px/1.6 var(--bt-mono);letter-spacing:.1em;color:var(--bt-faint);margin-bottom:3px}
.bt-stage.on .bt-stage-node{color:var(--bt-cyan)}
.bt-stage-name{font-size:11px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-stage-meta{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-ov-autopilot{display:flex;align-items:center;gap:7px;margin-top:auto;padding-top:10px;
  border-top:1px solid var(--bt-hair);flex-wrap:wrap}
.bt-ov-autopilot b{font:650 12px/1.4 var(--bt-mono);font-variant-numeric:tabular-nums;color:var(--bt-cyan)}
.bt-ov-metric-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.bt-ov-metric{border:1px solid var(--bt-hair);border-radius:7px;padding:8px 10px;min-width:0;
  background:rgba(79,140,255,.05)}
.bt-ov-metric-value{font-size:18px;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums}
.bt-ov-metric-label{font:600 9px/1.6 var(--bt-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--bt-faint);
  margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-ov-metric-sub{font:400 9px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-ov-tl{display:flex;flex-direction:column}
.bt-ov-tl-row{display:flex;gap:8px;align-items:flex-start;padding:7px 2px;border-top:1px solid var(--bt-line-soft)}
.bt-ov-tl-row:first-child{border-top:0}
.bt-ov-tl-time{font:400 9px/1.7 var(--bt-mono);color:var(--bt-faint);white-space:nowrap;padding-top:1px;min-width:62px}
.bt-ov-tl-main{min-width:0;flex:1}
.bt-ov-tl-title{font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-ov-tl-sub{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ================= 旧四阶段条（保留选择器） ================= */
.bt-phases-card{padding:12px 14px;margin-bottom:10px}
.bt-phases-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
.bt-phases-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.bt-phase{border:1px solid var(--bt-hair);border-radius:7px;padding:8px 9px;
  background:rgba(79,140,255,.04);min-width:0;position:relative;overflow:hidden}
.bt-phase.done{border-top:2px solid var(--bt-ok)}
.bt-phase.on{border-top:2px solid var(--bt-accent);background:rgba(79,140,255,.1)}
.bt-phase-idx{font:600 9px/1.6 var(--bt-mono);color:var(--bt-faint);letter-spacing:.1em}
.bt-phase-name{font-size:11px;font-weight:650;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-phase-meta{font:400 9.5px/1.5 var(--bt-mono);color:var(--bt-faint);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-phase-line{height:3px;border-radius:99px;background:rgba(120,165,255,.16);margin-top:6px;overflow:hidden}
.bt-phase-line>i{display:block;height:100%;border-radius:99px;
  background:linear-gradient(90deg,var(--bt-accent),var(--bt-cyan))}
.bt-phase.done .bt-phase-line>i{background:var(--bt-ok)}

@media(max-width:620px){
  .bt-phases-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bt-ov-hero{grid-template-columns:1fr}
  .bt-ov-stages{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:600px){
  .bt-hero{grid-template-columns:1fr}
  .bt-columns{grid-template-columns:1fr}
  .bt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bt-head{flex-wrap:wrap}
  .bt-head-actions{width:100%;justify-content:flex-end}
}
@media(max-width:430px){
  .bt-ov-metric-row{grid-template-columns:1fr}
  .bt-form{grid-template-columns:1fr}
  .bt-body{padding:10px}
}
`;

		function applyStyles() {
			if (typeof document === "undefined") return () => {};
			const style = document.createElement("style");
			style.dataset.plugin = "dsh-blue-team-mode";
			style.dataset.pluginCss = "console";
			style.textContent = CSS;
			document.head.appendChild(style);
			return () => { try { style.remove(); } catch (_) { /* ignore */ } };
		}

		function Svg({ size = 14, children }) {
			return h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" }, children);
		}
		function ShieldIcon({ size = 16 }) {
			return h(Svg, { size },
				h("path", { d: "M12 2.5 20.5 6v6c0 4.8-3.6 8.9-8.5 9.6C7.1 20.9 3.5 16.8 3.5 12V6L12 2.5Z", stroke: "currentColor", strokeWidth: 1.5 }),
				h("path", { d: "M12 8v4.2l3 2", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
				h("circle", { cx: 12, cy: 12, r: 1.25, fill: "currentColor" }));
		}
		function SparkIcon({ size = 14 }) {
			return h(Svg, { size },
				h("path", { d: "M12 2.8 13.7 9l6.2 1.7-6.2 1.7L12 18.6l-1.7-6.2L4.1 10.7 10.3 9 12 2.8Z", stroke: "currentColor", strokeWidth: 1.4, strokeLinejoin: "round" }),
				h("path", { d: "M18.5 16.5 19.2 19l2.5.7-2.5.7-.7 2.5-.7-2.5-2.5-.7 2.5-.7.7-2.5Z", fill: "currentColor" }));
		}
		function RefreshIcon({ size = 14 }) {
			return h(Svg, { size },
				h("path", { d: "M20 11a8 8 0 1 0-2.3 6.3", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
				h("path", { d: "M20 4v7h-7", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
		}
		function AlertIcon({ size = 14 }) {
			return h(Svg, { size },
				h("path", { d: "M12 3.5 21 20H3L12 3.5Z", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }),
				h("path", { d: "M12 9v5", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }),
				h("circle", { cx: 12, cy: 17, r: 1, fill: "currentColor" }));
		}
		function TaskIcon({ size = 14 }) {
			return h(Svg, { size },
				h("rect", { x: 4, y: 4.5, width: 16, height: 15, rx: 3, stroke: "currentColor", strokeWidth: 1.4 }),
				h("path", { d: "M8 9h8M8 13h5M8 17h7", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" }));
		}
		function CopyIcon({ size = 14 }) {
			return h(Svg, { size },
				h("rect", { x: 8, y: 8, width: 12, height: 12, rx: 2.5, stroke: "currentColor", strokeWidth: 1.4 }),
				h("path", { d: "M16 8V6.5A2.5 2.5 0 0 0 13.5 4H6.5A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8", stroke: "currentColor", strokeWidth: 1.4 }));
		}
		function CloseIcon({ size = 14 }) {
			return h(Svg, { size }, h("path", { d: "m6 6 12 12M18 6 6 18", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }));
		}
		function FullscreenIcon({ size = 14 }) {
			return h(Svg, { size },
				h("path", { d: "M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
		}
		function MinimizeIcon({ size = 14 }) {
			return h(Svg, { size },
				h("path", { d: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		function cls(...parts) { return parts.filter(Boolean).join(" "); }
		function toneOfSeverity(value) {
			return value === "critical" || value === "high" || value === "medium" || value === "low" || value === "info" ? value : "muted";
		}
		function toneOfStatus(value) {
			switch (value) {
				case "open": case "blocked": case "false_positive": case "pending_approval": return "danger";
				case "investigating": case "queued": case "dispatched": return "warn";
				case "contained": case "done": case "fixed": case "accepted": return "ok";
				default: return "muted";
			}
		}
		function riskLabel(t, value) {
			const key = "risk." + (value || "low");
			const label = t(key);
			return label === key ? (value || "low") : label;
		}
		function riskTone(value) {
			return value === "high" ? "danger" : value === "medium" ? "warn" : "muted";
		}
		function Badge({ tone, children }) {
			return h("span", { className: cls("bt-badge", "bt-badge-" + (tone || "muted")) }, children);
		}
		function Btn({ children, onClick, kind, icon, disabled, title, sm, testId }) {
			return h("button", {
				type: "button",
				"data-testid": testId,
				className: cls("bt-btn", kind === "primary" && "bt-btn-primary", kind === "ghost" && "bt-btn-ghost", sm && "bt-btn-sm"),
				onClick,
				disabled: !!disabled,
				title,
			}, icon ? h("span", { className: "bt-btn-icon" }, icon) : null, children ? h("span", null, children) : null);
		}
		function Field({ label, full, children }) {
			return h("label", { className: cls("bt-field", full && "bt-field-full") },
				h("span", { className: "bt-label" }, label),
				children);
		}
		function Section({ title, sub, actions, children, className }) {
			return h("section", { className: cls("bt-card", "bt-section", className) },
				(title || actions) ? h("div", { className: "bt-section-head" },
					h("div", null,
						title ? h("div", { className: "bt-section-title" }, title) : null,
						sub ? h("div", { className: "bt-section-sub" }, sub) : null),
					actions ? h("div", { className: "bt-section-actions" }, actions) : null) : null,
				h("div", { className: "bt-section-body" }, children));
		}
		function Empty({ title, text, icon }) {
			return h("div", { className: "bt-empty" },
				icon ? h("div", { className: "bt-empty-icon" }, icon) : null,
				title ? h("div", { className: "bt-empty-title" }, title) : null,
				text ? h("div", null, text) : null);
		}
		function Stat({ label, value, sub, tone }) {
			return h("div", { className: cls("bt-stat", tone) },
				h("div", { className: "bt-stat-label" }, label),
				h("div", { className: "bt-stat-value" }, value === undefined || value === null ? 0 : value),
				sub ? h("div", { className: "bt-stat-sub" }, sub) : null);
		}
		function statusLabel(t, status) {
			const key = "status." + status;
			const value = t(key);
			return value === key ? status : value;
		}
		function severityLabel(t, severity) {
			const key = "severity." + severity;
			const value = t(key);
			return value === key ? severity : value;
		}
		function roleLabel(t, role) {
			const key = "role." + role;
			const value = t(key);
			return value === key ? role : value;
		}
		function assetStatusLabel(t, status) {
			const key = "asset." + status;
			const value = t(key);
			return value === key ? status : value;
		}
		function timeText(value) {
			if (typeof value !== "string" || value === "") return "";
			try { return new Date(value).toLocaleString(); } catch { return value; }
		}
		function short(value, len) {
			const text = value === undefined || value === null ? "" : String(value);
			const max = len || 120;
			return text.length > max ? text.slice(0, max) + "…" : text;
		}
		async function callApi(sessionId, op, extra) {
			const response = await fetch("/blue/api", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(Object.assign({ op, session: sessionId }, extra || {})),
			});
			let data = null;
			try { data = await response.json(); } catch (_) { data = null; }
			if (!response.ok || data === null || data.ok === false) {
				throw new Error((data && data.error) || ("HTTP " + response.status));
			}
			return data;
		}

		/* 独立面板的模块级状态。shell.overlay 是根作用域，拿不到 sessionId；
		   由会话头部的 HeaderButton 把 sessionId 写进来，面板再按它读绑定。 */
		let ui = { open: true, full: false, sessionId: null };
		const uiSubs = new Set();
		function setUI(patch) {
			ui = Object.assign({}, ui, patch);
			for (const fn of Array.from(uiSubs)) {
				try { fn(); } catch (_) { /* ignore */ }
			}
		}
		function useUI() {
			const [, force] = React.useReducer((x) => x + 1, 0);
			React.useEffect(() => {
				const fn = () => force();
				uiSubs.add(fn);
				return () => { uiSubs.delete(fn); };
			}, []);
			return ui;
		}
		function sessionIdOf(props) {
			const raw = props && (props.sessionId || (props.session && (props.session.id || props.session.sessionId)));
			return typeof raw === "string" && raw.length > 0 ? raw : null;
		}

		/* 和红队一致：桌面壳用同窗全屏 overlay；普通 Web 优先开新窗口，
		   新窗口带 #blue-full，加载后直接进入全面浏览；弹窗被拦则回退同窗。 */
		function isDesktopShell() {
			try {
				const html = document.documentElement;
				return html.hasAttribute("data-windows-titlebar") || html.getAttribute("data-platform") === "darwin";
			} catch (_) {
				return false;
			}
		}
		function clearFullHash() {
			try {
				if (window.location.hash === "#blue-full") {
					window.history.replaceState(null, "", window.location.pathname + window.location.search);
				}
			} catch (_) { /* ignore */ }
		}
		function exitFullView() {
			setUI({ full: false, open: true });
			clearFullHash();
		}
		function openFullView() {
			if (typeof window === "undefined") {
				setUI({ open: true, full: true });
				return;
			}
			if (!isDesktopShell()) {
				try {
					const win = window.open(window.location.href.split("#")[0] + "#blue-full", "_blank");
					if (win) return;
				} catch (_) { /* popup blocked */ }
			}
			setUI({ open: true, full: true });
		}

		function Console({ sessionId, t, full, onToggleFull, onClose }) {
			const [data, setData] = React.useState(null);
			const [error, setError] = React.useState("");
			const [notice, setNotice] = React.useState("");
			const [tab, setTab] = React.useState("overview");
			const [busy, setBusy] = React.useState(false);
			const [protectDone, setProtectDone] = React.useState(false);
			const [report, setReport] = React.useState("");
				const [collectorCmd, setCollectorCmd] = React.useState("");
				const [remoteForm, setRemoteForm] = React.useState({ host: "", user: "root", key_path: "", port: 22, cloud_url: "", cloud_token: "" });
				const [remoteInfo, setRemoteInfo] = React.useState(null);
			const [dialog, setDialog] = React.useState(null);
			const [slots, setSlots] = React.useState(4);
			const [slotsDirty, setSlotsDirty] = React.useState(false);
			const [onboard, setOnboard] = React.useState({ target: "", name: "" });
			const [assetForm, setAssetForm] = React.useState({ name: "", address: "", kind: "host", criticality: "medium", service: "" });
			const [iocForm, setIocForm] = React.useState({ type: "ip", value: "", confidence: "medium", source: "console" });
			const [taskForm, setTaskForm] = React.useState({ title: "", role: "hunt", priority: "P2", brief: "" });
			const [alertFilter, setAlertFilter] = React.useState("all");

			const absorb = (result) => {
				// 只更新数据，不碰并发名额输入框；名额只在首次加载和保存时同步。
				if (result && result.snapshot) setData(result.snapshot);
				else if (result && Object.prototype.hasOwnProperty.call(result, "engagement")) setData(result);
			};

			const run = async (op, extra) => {
				setBusy(true);
				setError("");
				try {
					const result = await callApi(sessionId, op, extra);
					absorb(result);
					return result;
				} catch (cause) {
					setError(cause && cause.message ? cause.message : String(cause));
					return null;
				} finally {
					setBusy(false);
				}
			};

			// 向导完成后强制回到态势页：数据刷新和 tab 切换分开调度，避免异步 setData 把 tab 留在表单页。
			React.useEffect(() => {
				if (!protectDone) return;
				setTab("overview");
				setNotice(t("protectDone"));
				const timer = setTimeout(() => setNotice(""), 3500);
				setProtectDone(false);
				return () => clearTimeout(timer);
			}, [protectDone]);

			// 只在首次加载 / 切换防守目标时读并发名额；2 秒轮询不碰输入框，避免把正在输入的值顶回去。
			const slotsEngagementId = data && data.engagement ? data.engagement.id : null;
			React.useEffect(() => {
				let alive = true;
				(async () => {
					setBusy(true);
					try {
						const result = await callApi(sessionId, "overview");
						if (!alive) return;
						setData(result);
						if (result && result.slots && result.slots.max) setSlots(result.slots.max);
						setSlotsDirty(false);
					} catch (cause) {
						if (alive) setError(cause && cause.message ? cause.message : String(cause));
					} finally {
						if (alive) setBusy(false);
					}
				})();
				return () => { alive = false; };
			}, [sessionId, slotsEngagementId]);

			/* 面板实时刷新：前台每 2 秒拉一次 overview；后台暂停，回来立即补一次。 */
			React.useEffect(() => {
				let alive = true;
				let timer = null;
				let inFlight = false;
				let lastPull = 0;
				const tick = async () => {
					if (!alive || inFlight || document.visibilityState === "hidden") return;
					inFlight = true;
					try {
						// 每 5 秒把遥测/网关日志拉进告警，再刷新态势；不再依赖用户手动 poll。
						if (Date.now() - lastPull > 5000) {
							lastPull = Date.now();
							try { await callApi(sessionId, "telemetryPoll", { max_alerts: 100 }); } catch (_) { /* 无目标/无源时忽略 */ }
						}
						const result = await callApi(sessionId, "overview");
						if (alive && result) absorb(result);
					} catch (_) {
						/* 后台轮询失败不覆盖用户正在看的错误 */
					} finally {
						inFlight = false;
					}
				};
				const schedule = () => {
					if (!alive) return;
					timer = setTimeout(async () => {
						await tick();
						schedule();
					}, 2000);
				};
				const onVisibility = () => {
					if (document.visibilityState === "visible") void tick();
				};
				schedule();
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					alive = false;
					if (timer !== null) clearTimeout(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [sessionId]);

			// 切换防守目标：绑定写回服务端，并记住为下次启动的默认目标。
			const switchEngagement = async (engagementId) => {
				if (!engagementId) return;
				const result = await run("bindEngagement", { engagement: engagementId });
				if (result) {
					setSlotsDirty(false);
					setTab("overview");
				}
			};

			const openReport = async () => {
				setTab("report");
				setReport("");
				const result = await run("report");
				if (result) setReport(result.markdown || "");
			};

			const doPlan = async () => {
				const result = await run("plan");
				if (result) {
					setTab("tasks");
					setNotice(t("planDone", { count: result.created }));
					setTimeout(() => setNotice(""), 3500);
				}
			};

			// 并发名额：夹到 1–8，保存后以服务端返回值为准；轮询不会再把输入框顶回去。
			const saveSlots = async () => {
				const value = Math.min(Math.max(Number(slots) || 4, 1), 8);
				const result = await run("setSlots", { slots: value });
				if (!result) return;
				const max = result.slots && result.slots.max ? result.slots.max : value;
				setSlots(max);
				setSlotsDirty(false);
				setNotice(t("slotsSaved", { count: max }));
				setTimeout(() => setNotice(""), 3000);
			};

			const claimTask = async (task) => {
				const result = await run("claim", { task: task.id });
				if (result) setDialog({ kind: "claim", task: result.task, prompt: result.prompt, agent_preset: result.agent_preset });
			};

			const approveTask = async (task) => {
				const result = await run("approveTask", { task: task.id, actor: "console", note: "控制台人工放行" });
				if (result) {
					setNotice(t("approveDone", { title: task.title }));
					setTimeout(() => setNotice(""), 3500);
				}
			};

			const openTaskResult = (task, status) => {
				setDialog({ kind: "result", status, task, value: status === "done" ? (task.result || "") : (task.note || "") });
			};

			const submitResult = async () => {
				if (!dialog || dialog.kind !== "result") return;
				const result = await run("updateTask", {
					task: dialog.task.id,
					status: dialog.status,
					result: dialog.status === "done" ? dialog.value : dialog.task.result,
					note: dialog.status === "blocked" ? dialog.value : dialog.task.note,
				});
				if (result) setDialog(null);
			};

			const triage = async (alert, status, note) => {
				await run("triageAlert", { alert: alert.id, status, note: note || "" });
			};

			const makeTaskFromAlert = async (alert) => {
				await run("createTask", {
					role: alert.severity === "critical" ? "ir" : "hunt",
					priority: alert.severity === "critical" ? "P0" : "P1",
					title: "处置告警：" + alert.title,
					brief: "告警 " + alert.id + "（" + alert.severity + "）\n" + short(alert.raw, 1200),
					acceptance: "确认影响面、完成止损/清除并给出验证证据。",
				});
			};

			if (data === null) {
				return h("div", { className: "bt-root" },
					h("div", { style: { padding: 20, color: "var(--bt-muted)" } }, error ? error : t("loading")));
			}

			const engagement = data.engagement;
			const hasTarget = engagement !== null && engagement !== undefined;
			const stats = (hasTarget ? data.stats : null) || (engagement && engagement.stats) || {};
			const scopeText = engagement && Array.isArray(engagement.scope) && engagement.scope.length > 0 ? engagement.scope.join(" · ") : "—";
			const criticalCount = Number(stats.alerts_critical || 0) + Number(stats.findings_critical || 0);
			const highCount = Number(stats.alerts_high || 0) + Number(stats.findings_high || 0);
			const openCount = Number(stats.alerts_open || 0) + Number(stats.findings_open || 0);
			// 状态跟着严重度走：严重才叫「需立即处置」，只有高危是「优先处理」，其余是「跟进观察」。
			const posture = criticalCount > 0 ? "danger" : (highCount > 0 ? "warn" : "");
			const statusText = criticalCount > 0
				? t("postureAttention")
				: highCount > 0
					? t("postureHigh")
					: openCount > 0 ? t("postureWatch") : t("postureOk");

			const renderHead = () => h("header", { className: "bt-head" },
				h("div", { className: "bt-brand" },
					h("div", { className: "bt-logo" }, h(ShieldIcon, { size: 18 })),
					h("div", { className: "bt-brand-copy" },
						h("div", { className: "bt-title" },
							h("span", { className: "bt-title-text" }, full ? t("fullTitle") : t("type.label")),
							h("span", { className: "bt-ver" }, "v" + (data.version || "?")),
							hasTarget ? h("span", { className: "bt-status " + posture }, h("i"), statusText) : null),
						h("div", { className: "bt-sub" }, hasTarget
							? [
								h("select", {
									key: "target",
									className: "bt-target-select",
									value: engagement.id,
									title: t("switchTarget"),
									onChange: (e) => { void switchEngagement(e.target.value); },
								}, (data.engagements || []).map((item) => h("option", { key: item.id, value: item.id },
									item.name + (item.status === "active" ? "" : " · " + item.status)))),
								h("span", { key: "scope", className: "bt-sub-scope" }, " · " + scopeText),
							]
							: t("noEngagement")))),
				h("div", { className: "bt-head-actions" },
					hasTarget ? h(Btn, { kind: "primary", icon: h(SparkIcon), onClick: doPlan, disabled: busy }, t("plan")) : null,
					h(Btn, { icon: h(RefreshIcon), onClick: () => run("overview"), disabled: busy, title: t("refresh") }, hasTarget ? null : t("refresh")),
					full
						? h(Btn, { icon: h(MinimizeIcon), onClick: onToggleFull }, t("exitFull"))
						: h(Btn, { icon: h(FullscreenIcon), onClick: onToggleFull, title: t("full") }),
					h(Btn, { kind: "ghost", icon: h(CloseIcon), onClick: onClose, title: t("collapse") })));

			const protectForm = h("div", { className: "bt-form" },
				h(Field, { label: t("target"), full: true }, h("input", {
					className: "bt-input",
					placeholder: t("targetPlaceholder"),
					value: onboard.target,
					onChange: (e) => setOnboard(Object.assign({}, onboard, { target: e.target.value })),
				})),
				h(Field, { label: t("name") }, h("input", {
					className: "bt-input",
					placeholder: t("namePlaceholder"),
					value: onboard.name,
					onChange: (e) => setOnboard(Object.assign({}, onboard, { name: e.target.value })),
				})),
				h("div", { className: "bt-form-actions" },
					h(Btn, {
						kind: "primary",
						disabled: busy || onboard.target.trim() === "",
						onClick: async () => {
							const result = await run("protectStart", {
								target: onboard.target.trim(),
								name: onboard.name.trim() || undefined,
							});
							if (result) setProtectDone(true);
						},
					}, t("protectStart"))));

			const renderProtect = () => h("div", { className: "bt-onboard" },
				h("div", { className: "bt-card bt-onboard-card" },
					h("div", { className: "bt-onboard-icon" }, h(ShieldIcon, { size: 26 })),
					h("div", { className: "bt-eyebrow" }, "BLUE TEAM / PROTECT"),
					h("div", { className: "bt-onboard-title" }, t("protectTitle")),
					h("div", { className: "bt-onboard-text" }, t("protectHint")),
					protectForm));

			if (!hasTarget) {
				const existing = data.engagements && data.engagements.length > 0
					? h(Section, { title: t("existing") },
						data.engagements.map((item) => h("div", { key: item.id, className: "bt-seg" },
							h("div", { className: "bt-seg-main" },
								h("div", { className: "bt-seg-name" }, item.name),
								h("div", { className: "bt-seg-meta" }, item.id + " · " + ((item.scope && item.scope.join(", ")) || "—"))),
							h(Btn, { sm: true, onClick: () => run("bindEngagement", { engagement: item.id }) }, t("bind")))))
					: null;
				return h("div", { className: "bt-root" },
					renderHead(),
					h("div", { className: "bt-body" },
						error ? h("div", { className: "bt-alert" }, error) : null,
						h("div", { className: "bt-onboard" },
							h("div", { className: "bt-card bt-onboard-card" },
								h("div", { className: "bt-onboard-icon" }, h(ShieldIcon, { size: 26 })),
								h("div", { className: "bt-eyebrow" }, "BLUE TEAM / SETUP"),
								h("div", { className: "bt-onboard-title" }, t("protectTitle")),
								h("div", { className: "bt-onboard-text" }, t("protectHint")),
								protectForm),
							existing)));
			}

			const tabs = [
				["overview", t("overview"), 0],
				["protect", t("protect"), 0],
				["incidents", t("incidents"), data.incidents ? data.incidents.length : 0],
				["defense", t("defense"), data.controls && data.controls.failed ? data.controls.failed : 0],
				["graph", t("graph"), 0],
				["alerts", t("alerts"), data.alerts ? data.alerts.length : 0],
				["assets", t("assets"), data.assets ? data.assets.length : 0],
				["findings", t("findings"), data.findings ? data.findings.length : 0],
				["tasks", t("tasks"), data.tasks ? data.tasks.length : 0],
				["iocs", t("iocs"), data.iocs ? data.iocs.length : 0],
				["knowledge", t("knowledge"), data.knowledge ? data.knowledge.length : 0],
				["remote", t("remote"), 0],
				["decoys", t("decoys"), data.decoys ? data.decoys.length : 0],
				["timeline", t("timeline"), 0],
				["report", t("report"), 0]
			];

			const renderOverviewV2 = () => {
				const attention = [];
				for (const alert of data.alerts || []) {
					if (alert.status === "open" || alert.status === "investigating") attention.push({ kind: "alert", item: alert, severity: alert.severity, title: alert.title, meta: (alert.source || "unknown") + " · " + timeText(alert.created_at) });
				}
				for (const finding of data.findings || []) {
					if (finding.status === "open") attention.push({ kind: "finding", item: finding, severity: finding.severity, title: finding.title, meta: (finding.category || "other") + " · " + timeText(finding.created_at) });
				}
				const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
				attention.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
				const queue = (data.tasks || []).filter((task) => task.status !== "done" && task.status !== "cancelled").slice(0, 5);
				const triageCount = (stats.alerts_open || 0) + (stats.findings_open || 0);
				const risk = triageCount;
				const stages = [
					{ code: "monitor", name: t("phase.monitor"), color: "#5ea0ff", count: stats.assets || 0, meta: t("items", { count: stats.assets || 0 }) },
					{ code: "triage", name: t("phase.triage"), color: "#f59e0b", count: triageCount, meta: t("items", { count: triageCount }) },
					{ code: "respond", name: t("phase.respond"), color: "#ef4444", count: stats.tasks_active || 0, meta: t("activeCount", { count: stats.tasks_active || 0 }) },
					{ code: "review", name: t("phase.review"), color: "#10b981", count: stats.tasks_done || 0, meta: t("items", { count: stats.tasks_done || 0 }) }
				];
				let current = stages[0];
				if ((stats.tasks_active || 0) > 0) current = stages[2];
				else if (triageCount > 0) current = stages[1];
				else if ((stats.tasks_done || 0) > 0) current = stages[3];
				const metric = (label, value, sub) => h("div", { className: "bt-ov-metric" },
					h("div", { className: "bt-ov-metric-value" }, value),
					h("div", { className: "bt-ov-metric-label" }, label),
					sub ? h("div", { className: "bt-ov-metric-sub" }, sub) : null);
				const protection = data.protection || {
					headline: statusText,
					level: posture === "danger" ? "risk" : "setup",
					next_actions: [],
				};
				return h("div", null,
					h("div", { className: "bt-protect-banner " + (protection.level || "setup") },
						h("div", { className: "bt-protect-icon" }, h(ShieldIcon, { size: 16 })),
						h("div", { className: "bt-protect-copy" },
							h("div", { className: "bt-protect-headline" }, protection.headline),
							h("div", { className: "bt-protect-next" },
								(data.gateway && data.gateway.running)
									? "请访问防守入口：" + data.gateway.url
									: ((protection.next_actions && protection.next_actions[0]) || t("protectHint"))),
							h("div", { style: { display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" } },
								h(Btn, {
									sm: true,
									onClick: async () => {
										const info = await run("collectorInfo");
										if (info && info.command) setCollectorCmd(info.command);
									},
								}, "远程日志采集"),
								h("span", { style: { fontSize: 11, opacity: 0.7 } }, data.collector && data.collector.running
									? `后台采集器运行中 · 上次 ${data.collector.last_run ? timeText(data.collector.last_run) : "等待"} · 新告警 ${data.collector.last_alerts || 0}`
									: "后台采集器未运行")),
							collectorCmd ? h("pre", { style: { whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 10.5, marginTop: 8, padding: 8, borderRadius: 8, background: "rgba(0,0,0,.18)" } }, collectorCmd) : null)),
					h("div", { className: "bt-ov-hero" },
						h("div", { className: "bt-ov-score" },
							h("div", { className: "bt-ov-score-label" }, t("openRisk")),
							h("div", { className: "bt-ov-score-num" }, risk, h("small", null, t("unitItems"))),
							h("div", { className: "bt-ov-score-sub" },
								((stats.alerts_critical || 0) + (stats.findings_critical || 0)) + " " + t("criticalHigh") + " · " + ((stats.tasks_active || 0)) + " " + t("active")),
							h("div", { className: "bt-ov-score-actions" },
								h(Btn, { kind: "primary", icon: h(SparkIcon), onClick: doPlan, disabled: busy }, t("plan")),
								h(Btn, { icon: h(TaskIcon), onClick: openReport }, t("report")))),
						h("div", { className: "bt-ov-rail" },
							h("div", { className: "bt-ov-rail-head" },
								h("span", { className: "bt-ov-rail-title" }, t("defenseCycle")),
								h("span", { className: "bt-stage-chip" }, t("currentPhase") + " · " + current.name)),
							h("div", { className: "bt-ov-stages" }, stages.map((stage, index) => h("div", {
								key: stage.code,
								className: cls("bt-stage", current.code === stage.code && "on"),
								style: { "--stage": stage.color },
							},
								h("div", { className: "bt-stage-node" }, String(index + 1).padStart(2, "0")),
								h("div", { className: "bt-stage-name" }, stage.name),
								h("div", { className: "bt-stage-meta" }, stage.meta)))),
							h("div", { className: "bt-ov-autopilot" },
								h("span", { className: "bt-eyebrow" }, "AUTOPILOT"),
								h("b", null, slots),
								h("span", { className: "bt-slot-unit" }, t("slots")),
								h("input", {
									className: "bt-input",
									type: "number",
									min: 1,
									max: 8,
									value: slots,
									onChange: (e) => { setSlots(Number(e.target.value) || 1); setSlotsDirty(true); },
									onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); void saveSlots(); } },
									onBlur: () => { if (slotsDirty) void saveSlots(); },
									style: { width: 56, height: 26 },
								}),
								h(Btn, { sm: true, onClick: saveSlots, disabled: busy }, t("save")),
								slotsDirty ? h("span", { className: "bt-slot-unit", style: { color: "var(--bt-warn)" } }, t("slotsDirty")) : null))),
					h("div", { className: "bt-stats" },
						h(Stat, { label: t("stats.assets"), value: stats.assets || 0, sub: (stats.assets_critical || 0) + " " + t("criticalHigh") }),
						h(Stat, { label: t("stats.alerts"), value: stats.alerts_open || 0, tone: (stats.alerts_critical || 0) > 0 ? "danger" : "", sub: (stats.alerts_critical || 0) + " " + t("criticalHigh") }),
						h(Stat, { label: t("stats.findings"), value: stats.findings_open || 0, tone: (stats.findings_critical || 0) > 0 ? "warn" : "", sub: (stats.findings_critical || 0) + " " + t("criticalHigh") }),
						h(Stat, { label: t("stats.iocs"), value: stats.iocs || 0 }),
						h(Stat, { label: t("stats.tasks"), value: stats.tasks_active || 0, sub: (stats.tasks_pending_approval || 0) > 0 ? t("pendingCount", { count: stats.tasks_pending_approval }) : "" }),
						h(Stat, { label: t("stats.done"), value: stats.tasks_done || 0, tone: "ok" })),
					h("div", { className: "bt-columns" },
						h(Section, { title: t("review"), sub: t("items", { count: attention.length }), actions: h(Btn, { sm: true, onClick: () => setTab("alerts") }, t("all")) },
							attention.length === 0
								? h(Empty, { title: t("noAlerts"), icon: h(ShieldIcon, { size: 20 }) })
								: h("div", { className: "bt-list" }, attention.slice(0, 5).map((entry) => h("div", { key: entry.kind + entry.item.id, className: "bt-item" },
									h("span", { className: "bt-dot " + toneOfSeverity(entry.severity) }),
									h("div", { className: "bt-item-main" },
										h("div", { className: "bt-item-title" },
											h(Badge, { tone: toneOfSeverity(entry.severity) }, severityLabel(t, entry.severity)),
											h("span", { className: "txt" }, entry.title)),
										h("div", { className: "bt-item-meta" }, h("span", null, entry.meta))),
									h("div", { className: "bt-item-actions" },
										entry.kind === "alert"
											? h(Btn, { sm: true, onClick: () => triage(entry.item, "investigating", "控制台确认") }, t("confirm"))
											: h(Btn, { sm: true, onClick: () => run("updateFinding", { finding: entry.item.id, status: "fixed", evidence: "控制台标记已修复" }) }, t("fixed"))))))),
						h(Section, { title: t("queue"), sub: t("queuedCount", { count: stats.tasks_queued || 0 }) + ((stats.tasks_pending_approval || 0) > 0 ? " · " + t("pendingCount", { count: stats.tasks_pending_approval }) : ""), actions: h(Btn, { sm: true, onClick: () => setTab("tasks") }, t("all")) },
							queue.length === 0
								? h(Empty, { title: t("noTasks"), icon: h(TaskIcon, { size: 20 }) })
								: h("div", { className: "bt-list" }, queue.map((task) => h("div", { key: task.id, className: "bt-item" },
									h("span", { className: "bt-dot " + (task.priority === "P0" ? "critical" : task.priority === "P1" ? "high" : "medium") }),
									h("div", { className: "bt-item-main" },
										h("div", { className: "bt-item-title" },
											h(Badge, { tone: task.priority === "P0" ? "critical" : task.priority === "P1" ? "high" : "muted" }, task.priority),
											h(Badge, { tone: riskTone(task.risk_level) }, riskLabel(t, task.risk_level)),
											h("span", { className: "txt" }, task.title)),
										h("div", { className: "bt-item-meta" },
											h("span", null, roleLabel(t, task.role)),
											h("span", null, statusLabel(t, task.status)))),
									h("div", { className: "bt-item-actions" },
										task.status === "pending_approval"
											? h(Btn, { sm: true, kind: "primary", testId: "approve-" + task.id, onClick: () => approveTask(task) }, t("approve"))
											: h(Btn, { sm: true, onClick: () => claimTask(task) }, t("claim")))))))),
					h("div", { className: "bt-columns" },
						h(Section, { title: t("assetExposure"), actions: h(Btn, { sm: true, onClick: () => setTab("assets") }, t("all")) },
							h("div", { className: "bt-ov-metric-row" },
								metric(t("stats.assets"), stats.assets || 0, (stats.assets_critical || 0) + " " + t("criticalHigh")),
								metric(t("stats.findings"), stats.findings_open || 0, (stats.findings_critical || 0) + " " + t("criticalHigh")),
								metric(t("stats.iocs"), stats.iocs || 0, t("source")))),
						h(Section, { title: t("recentActivity"), actions: h(Btn, { sm: true, onClick: () => setTab("timeline") }, t("all")) },
							(data.timeline || []).length === 0
								? h(Empty, { title: t("noTimeline"), icon: h(TaskIcon, { size: 20 }) })
								: h("div", { className: "bt-ov-tl" }, (data.timeline || []).slice(0, 4).map((item) => h("div", { key: item.id, className: "bt-ov-tl-row" },
									h("span", { className: "bt-ov-tl-time" }, timeText(item.at)),
									h("div", { className: "bt-ov-tl-main" },
										h("div", { className: "bt-ov-tl-title" }, item.action + " · " + (item.target || "—")),
										h("div", { className: "bt-ov-tl-sub" }, item.actor + (item.detail ? " · " + short(item.detail, 80) : "")))))))));
			};

			const renderIncidents = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("incidents")), h("div", { className: "bt-page-sub" }, t("recorded", { count: (data.incidents || []).length }))),
					h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
				(data.incidents || []).length === 0
					? h(Empty, { title: t("noIncidents"), icon: h(ShieldIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("severity")), h("th", null, t("title")), h("th", null, t("status")), h("th", null, t("owner")), h("th", null, t("summary")), h("th", null, t("actions")))),
						h("tbody", null, (data.incidents || []).map((incident) => h("tr", { key: incident.id },
							h("td", null, h(Badge, { tone: toneOfSeverity(incident.severity) }, severityLabel(t, incident.severity))),
							h("td", null, h("div", { className: "bt-cell-title" }, incident.title), h("div", { className: "bt-cell-meta" }, incident.id)),
							h("td", null, h(Badge, { tone: toneOfStatus(incident.status) }, statusLabel(t, incident.status))),
							h("td", null, incident.owner || "—"),
							h("td", null, incident.summary || "—"),
							h("td", null,
								incident.status !== "investigating" && incident.status !== "closed"
									? h(Btn, { sm: true, onClick: () => run("updateIncident", { incident: incident.id, status: "investigating" }) }, t("investigate"))
									: null,
								incident.status !== "closed" ? " " : null,
								incident.status !== "closed"
									? h(Btn, { sm: true, onClick: () => run("updateIncident", { incident: incident.id, status: "contained" }) }, t("contain"))
									: null,
								incident.status !== "closed" ? " " : null,
								incident.status !== "closed"
									? h(Btn, { sm: true, kind: "primary", onClick: () => run("updateIncident", { incident: incident.id, status: "closed" }) }, t("closeCase"))
									: null)))))));

			const renderAlerts = () => {
				const all = data.alerts || [];
				const filtered = alertFilter === "all" ? all : alertFilter === "closed" ? all.filter((a) => a.status === "closed" || a.status === "false_positive") : all.filter((a) => a.status === "open" || a.status === "investigating");
				return h("div", null,
					h("div", { className: "bt-page-head" },
						h("div", null,
							h("div", { className: "bt-page-title" }, t("alerts")),
							h("div", { className: "bt-page-sub" }, t("totalCount", { count: all.length }) + " · " + t("openCount", { count: stats.alerts_open || 0 }))),
						h("div", { className: "bt-page-actions" },
							["all", "open", "closed"].map((key) => h(Btn, { key, sm: true, kind: alertFilter === key ? "primary" : "", onClick: () => setAlertFilter(key) }, t(key))))),
					filtered.length === 0
						? h(Empty, { title: t("noAlerts"), icon: h(AlertIcon, { size: 20 }) })
						: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
							h("thead", null, h("tr", null, h("th", null, t("severity")), h("th", null, t("title")), h("th", null, t("status")), h("th", null, t("actions")))),
							h("tbody", null, filtered.map((alert) => h("tr", { key: alert.id },
								h("td", null, h(Badge, { tone: toneOfSeverity(alert.severity) }, severityLabel(t, alert.severity))),
								h("td", null,
									h("div", { className: "bt-cell-title" }, alert.title),
									h("div", { className: "bt-cell-meta" }, h("span", null, alert.source || "unknown"), h("span", null, "conf " + (alert.confidence || "medium")), alert.task_id ? h("span", null, alert.task_id) : null, h("span", null, timeText(alert.created_at)))),
								h("td", null, h(Badge, { tone: toneOfStatus(alert.status) }, statusLabel(t, alert.status))),
								h("td", null,
									h(Btn, { sm: true, onClick: () => triage(alert, "investigating", "控制台确认") }, t("confirm")),
									" ",
									h(Btn, { sm: true, onClick: () => triage(alert, "false_positive", "控制台标记误报") }, t("falsePositive")),
									" ",
									h(Btn, { sm: true, onClick: () => makeTaskFromAlert(alert) }, t("followUp")))))))));
			};

			const renderAssets = () => {
				const head = h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("assets")), h("div", { className: "bt-page-sub" }, t("recorded", { count: (data.assets || []).length }))),
					h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh"))));
				const form = h(Section, { title: t("addAsset") },
					h("div", { className: "bt-form" },
						h(Field, { label: t("name") }, h("input", { className: "bt-input", value: assetForm.name, onChange: (e) => setAssetForm(Object.assign({}, assetForm, { name: e.target.value })) })),
						h(Field, { label: t("address") }, h("input", { className: "bt-input", value: assetForm.address, onChange: (e) => setAssetForm(Object.assign({}, assetForm, { address: e.target.value })) })),
						h(Field, { label: t("kind") }, h("input", { className: "bt-input", value: assetForm.kind, onChange: (e) => setAssetForm(Object.assign({}, assetForm, { kind: e.target.value })) })),
						h(Field, { label: t("criticality") }, h("input", { className: "bt-input", value: assetForm.criticality, onChange: (e) => setAssetForm(Object.assign({}, assetForm, { criticality: e.target.value })) })),
						h("div", { className: "bt-form-actions" },
							h(Btn, { kind: "primary", disabled: busy || assetForm.name.trim() === "", onClick: async () => { const result = await run("addAsset", assetForm); if (result) setAssetForm({ name: "", address: "", kind: "host", criticality: "medium", service: "" }); } }, t("create")))));
				const rows = (data.assets || []).length === 0
					? h(Empty, { title: t("empty"), icon: h(ShieldIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("name")), h("th", null, t("address")), h("th", null, t("kind")), h("th", null, t("criticality")), h("th", null, t("status")))),
						h("tbody", null, (data.assets || []).map((asset) => h("tr", { key: asset.id },
							h("td", null, h("div", { className: "bt-cell-title" }, asset.name)),
							h("td", null, h("span", { style: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5 } }, asset.address + (asset.port ? ":" + asset.port : ""))),
							h("td", null, asset.kind),
							h("td", null, h(Badge, { tone: toneOfSeverity(asset.criticality) }, severityLabel(t, asset.criticality))),
							h("td", null, assetStatusLabel(t, asset.status)))))));
				return h("div", null, head, form, rows);
			};

			const renderFindings = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("findings")), h("div", { className: "bt-page-sub" }, t("recorded", { count: (data.findings || []).length }))),
					h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
				(data.findings || []).length === 0
					? h(Empty, { title: t("noFindings"), icon: h(AlertIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("severity")), h("th", null, t("title")), h("th", null, t("status")), h("th", null, t("actions")))),
						h("tbody", null, (data.findings || []).map((finding) => h("tr", { key: finding.id },
							h("td", null, h(Badge, { tone: toneOfSeverity(finding.severity) }, severityLabel(t, finding.severity))),
							h("td", null,
								h("div", { className: "bt-cell-title" }, finding.title),
								h("div", { className: "bt-cell-meta" }, h("span", null, finding.category || "other"), h("span", null, "conf " + (finding.confidence || "medium")), finding.source ? h("span", null, finding.source) : null, finding.task_id ? h("span", null, finding.task_id) : null, h("span", null, timeText(finding.created_at)))),
							h("td", null, h(Badge, { tone: toneOfStatus(finding.status) }, statusLabel(t, finding.status))),
							h("td", null,
								h(Btn, { sm: true, onClick: () => run("updateFinding", { finding: finding.id, status: "fixed", evidence: "控制台标记已修复" }) }, t("fixed")),
								" ",
								h(Btn, { sm: true, onClick: () => run("updateFinding", { finding: finding.id, status: "accepted" }) }, t("accepted")))))))));

			const renderTasks = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("tasks")), h("div", { className: "bt-page-sub" }, t("activeCount", { count: stats.tasks_active || 0 }) + " · " + t("queuedCount", { count: stats.tasks_queued || 0 }) + ((stats.tasks_pending_approval || 0) > 0 ? " · " + t("pendingCount", { count: stats.tasks_pending_approval }) : ""))),
					h("div", { className: "bt-page-actions" }, h(Btn, { kind: "primary", icon: h(SparkIcon), sm: true, onClick: doPlan, disabled: busy }, t("plan")))),
				h(Section, { title: t("createTask") },
					h("div", { className: "bt-form" },
						h(Field, { label: t("title"), full: true }, h("input", { className: "bt-input", value: taskForm.title, onChange: (e) => setTaskForm(Object.assign({}, taskForm, { title: e.target.value })) })),
						h(Field, { label: t("role") }, h("input", { className: "bt-input", value: taskForm.role, onChange: (e) => setTaskForm(Object.assign({}, taskForm, { role: e.target.value })) })),
						h(Field, { label: t("priority") }, h("input", { className: "bt-input", value: taskForm.priority, onChange: (e) => setTaskForm(Object.assign({}, taskForm, { priority: e.target.value })) })),
						h(Field, { label: t("taskBrief"), full: true }, h("textarea", { className: "bt-input bt-textarea", value: taskForm.brief, onChange: (e) => setTaskForm(Object.assign({}, taskForm, { brief: e.target.value })) })),
						h("div", { className: "bt-form-actions" },
							h(Btn, { kind: "primary", disabled: busy || taskForm.title.trim() === "", onClick: async () => { const result = await run("createTask", taskForm); if (result) setTaskForm({ title: "", role: "hunt", priority: "P2", brief: "" }); } }, t("create"))))),
				(data.tasks || []).length === 0
					? h(Empty, { title: t("noTasks"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("priority")), h("th", null, t("title")), h("th", null, t("role")), h("th", null, t("status")), h("th", null, t("actions")))),
						h("tbody", null, (data.tasks || []).map((task) => h("tr", { key: task.id, "data-testid": "task-row-" + task.id },
							h("td", null,
								h(Badge, { tone: task.priority === "P0" ? "critical" : task.priority === "P1" ? "high" : "muted" }, task.priority),
								" ",
								h(Badge, { tone: riskTone(task.risk_level) }, riskLabel(t, task.risk_level))),
							h("td", null,
								h("div", { className: "bt-cell-title" }, task.title),
								h("div", { className: "bt-cell-meta" }, h("span", null, short(task.brief, 90)), task.approved_by ? h("span", null, "✓ " + task.approved_by + " · " + timeText(task.approved_at)) : null)),
							h("td", null, roleLabel(t, task.role)),
							h("td", null, h(Badge, { tone: toneOfStatus(task.status) }, statusLabel(t, task.status))),
							h("td", null,
								task.status === "pending_approval"
									? h(Btn, { sm: true, kind: "primary", testId: "approve-" + task.id, onClick: () => approveTask(task) }, t("approve"))
									: h(Btn, { sm: true, onClick: () => claimTask(task) }, t("claim")),
								" ",
								task.status === "pending_approval"
									? h(Btn, { sm: true, testId: "cancel-" + task.id, onClick: () => run("updateTask", { task: task.id, status: "cancelled", note: "控制台取消高风险任务" }) }, t("cancel"))
									: h(Btn, { sm: true, onClick: () => openTaskResult(task, "done") }, t("complete")),
								task.status === "pending_approval" ? null : " ",
								task.status === "pending_approval" ? null : h(Btn, { sm: true, onClick: () => openTaskResult(task, "blocked") }, t("block")))))))));

			const renderKnowledge = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("knowledgeTitle")), h("div", { className: "bt-page-sub" }, t("knowledgeHint"))),
					h("div", { className: "bt-page-actions" }, h(Btn, { sm: true, onClick: async () => { const seeded = await run("knowledgeSeed"); if (seeded) { await run("overview"); setNotice("已导入内置打法：" + seeded.total + " 条"); setTimeout(() => setNotice(""), 3000); } } }, "导入内置打法"), h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
				(data.knowledge || []).length === 0
					? h(Empty, { title: "还没有记录打法；告警入库后会自动学习，也可以点“导入内置打法”。", icon: h(ShieldIcon, { size: 20 }) })
					: h("div", { className: "bt-list" }, (data.knowledge || []).map((entry) => h("div", { key: entry.id, className: "bt-item" },
						h("div", { className: "bt-seg-main" },
							h("div", { className: "bt-seg-name" }, entry.title || entry.signature),
							h("div", { className: "bt-seg-meta" }, entry.signature + " · " + (entry.defense && entry.defense.summary ? entry.defense.summary : "—") + " · " + entry.hits + " 次")),
						h(Btn, {
							sm: true,
							onClick: async () => {
								const result = await run("knowledgeDefend", { entry: entry.id });
								if (result) {
									if (result.task) setNotice("已生成防御任务"); else setNotice(result.note || "这条不需要生成任务");
									setTimeout(() => setNotice(""), 3000);
								}
							},
						}, t("defend"))))));

			const renderRemote = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("remoteTitle")), h("div", { className: "bt-page-sub" }, t("remoteHint"))),
					h("div", { className: "bt-page-actions" },
						h(Btn, { sm: true, onClick: async () => { const info = await run("remoteInfo"); if (info) { setRemoteInfo(info); if (info.ssh) setRemoteForm(Object.assign({}, remoteForm, { host: info.ssh.host, user: info.ssh.user, key_path: info.ssh.key_path, port: info.ssh.port })); } } }, "读取配置"))),
				h(Section, { title: "SSH / 云 API" },
					h("div", { className: "bt-form" },
						h(Field, { label: "公网 IP" }, h("input", { className: "bt-input", value: remoteForm.host, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { host: e.target.value })) })),
						h(Field, { label: "SSH 用户" }, h("input", { className: "bt-input", value: remoteForm.user, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { user: e.target.value })) })),
						h(Field, { label: "私钥路径（本机）" }, h("input", { className: "bt-input", value: remoteForm.key_path, placeholder: "C:\\Users\\me\\.ssh\\id_ed25519", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { key_path: e.target.value })) })),
						h(Field, { label: "SSH 端口" }, h("input", { className: "bt-input", value: remoteForm.port, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { port: Number(e.target.value) || 22 })) })),
						h(Field, { label: "云 Webhook（可选）" }, h("input", { className: "bt-input", value: remoteForm.cloud_url, placeholder: "https://...", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { cloud_url: e.target.value })) })),
						h(Field, { label: "云 Token（可选）" }, h("input", { className: "bt-input", type: "password", value: remoteForm.cloud_token, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { cloud_token: e.target.value })) })),
						h("div", { className: "bt-form-actions" },
							h(Btn, { kind: "primary", disabled: busy || !remoteForm.host || !remoteForm.user || !remoteForm.key_path, onClick: async () => { const result = await run("remoteSetup", remoteForm); if (result) { setNotice("远程配置已保存"); setTimeout(() => setNotice(""), 3000); } } }, "保存配置"),
							h(Btn, { disabled: busy || !remoteForm.host, onClick: async () => { const result = await run("remoteTest", { host: remoteForm.host, user: remoteForm.user, key_path: remoteForm.key_path, port: remoteForm.port }); if (result) setNotice(result.ok ? "SSH 连通" : ("SSH 失败：" + (result.error || "未知"))); } }, "测试 SSH"),
							h(Btn, { disabled: busy || !remoteForm.host, onClick: async () => { const result = await run("remotePrepare", { host: remoteForm.host }); if (result && result.task) { setNotice("已生成审批任务：" + result.task.id); setTimeout(() => setNotice(""), 5000); } } }, "生成部署审批"))),
					h("div", { style: { marginTop: 10, fontSize: 11, opacity: 0.75 } },
						"无人值守部署必须先在这里生成 high 审批任务，再到任务页批准。",
						remoteInfo && remoteInfo.available ? " 服务已加载。" : " 服务未加载，先重启 DSH。")),
				h(Section, { title: "说明" },
					h("div", { style: { fontSize: 12, lineHeight: 1.8, opacity: 0.85 } },
						"有人值守：只填公网 IP，接日志和告警，人来决定处置。",
						h("br"),
						"无人值守：填 SSH 私钥路径，审批后自动部署采集器 / 防御组；默认 dry-run。",
						h("br"),
						"私钥只存路径，不上传内容；云 Webhook 必须 https。")))
			;

			const renderIocs = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("iocs")), h("div", { className: "bt-page-sub" }, t("indicators", { count: (data.iocs || []).length }))),
					h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
				h(Section, { title: t("addIoc") },
					h("div", { className: "bt-form" },
						h(Field, { label: t("kind") }, h("input", { className: "bt-input", value: iocForm.type, onChange: (e) => setIocForm(Object.assign({}, iocForm, { type: e.target.value })) })),
						h(Field, { label: t("value") }, h("input", { className: "bt-input", value: iocForm.value, onChange: (e) => setIocForm(Object.assign({}, iocForm, { value: e.target.value })) })),
						h(Field, { label: t("confidence") }, h("input", { className: "bt-input", value: iocForm.confidence, onChange: (e) => setIocForm(Object.assign({}, iocForm, { confidence: e.target.value })) })),
						h(Field, { label: t("source") }, h("input", { className: "bt-input", value: iocForm.source, onChange: (e) => setIocForm(Object.assign({}, iocForm, { source: e.target.value })) })),
						h("div", { className: "bt-form-actions" },
							h(Btn, { kind: "primary", disabled: busy || iocForm.value.trim() === "", onClick: async () => { const result = await run("addIoc", iocForm); if (result) setIocForm({ type: "ip", value: "", confidence: "medium", source: "console" }); } }, t("create"))))),
				(data.iocs || []).length === 0
					? h(Empty, { title: t("noIocs"), icon: h(ShieldIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("kind")), h("th", null, t("value")), h("th", null, t("confidence")), h("th", null, t("source")))),
						h("tbody", null, (data.iocs || []).map((ioc) => h("tr", { key: ioc.id },
							h("td", null, h(Badge, { tone: "info" }, ioc.type)),
							h("td", null, h("span", { style: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5 } }, ioc.value)),
							h("td", null, ioc.confidence),
							h("td", null, ioc.source)))))));

			const renderTimeline = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("timeline")), h("div", { className: "bt-page-sub" }, t("events", { count: (data.timeline || []).length }), data.audit ? (data.audit.ok ? " · " + t("auditOk", { count: data.audit.checked }) : " · " + t("auditBroken")) : "")),
					h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
				(data.timeline || []).length === 0
					? h(Empty, { title: t("noTimeline"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-timeline" }, (data.timeline || []).map((item) => h("div", { key: item.id, className: "bt-tl-item" },
						h("span", { className: "bt-tl-dot" }),
						h("div", { className: "bt-tl-time" }, timeText(item.at)),
						h("div", { className: "bt-tl-title" }, item.action + " · " + (item.target || "—")),
						h("div", { className: "bt-tl-detail" }, item.actor + (item.detail ? " · " + item.detail : ""))))));

			const renderDefense = () => {
				const controls = data.controls || { rows: [], total: 0, passed: 0, failed: 0, unknown: 0, score: 0 };
				const sources = data.telemetry || [];
				const responses = data.responses || [];
				const rules = data.detection_rules || [];
				const cves = (data.cve && data.cve.items) || [];
				const statsRow = h("div", { className: "bt-stats" },
					h(Stat, { label: t("controlScore"), value: controls.score + "%", sub: t("controls"), tone: controls.failed > 0 ? "warn" : "ok" }),
					h(Stat, { label: t("controls"), value: controls.total || 0, sub: `${controls.passed}/${controls.total || 0} pass` }),
					h(Stat, { label: t("telemetry"), value: sources.length, sub: t("health") }),
					h(Stat, { label: t("responses"), value: responses.length, sub: t("status") }));
				const controlTable = controls.rows.length === 0
					? h(Empty, { title: t("noControls"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("controls")), h("th", null, t("status")), h("th", null, t("summary")))),
						h("tbody", null, controls.rows.map((row) => h("tr", { key: row.id },
							h("td", null, h("div", { className: "bt-cell-title" }, row.name), h("div", { className: "bt-cell-meta" }, row.control_key + " · " + row.category)),
							h("td", null, h(Badge, { tone: row.status === "pass" ? "ok" : row.status === "fail" ? "danger" : "muted" }, row.status)),
							h("td", null, row.evidence || "—"))))));
				const ruleTable = rules.length === 0
					? h(Empty, { title: t("empty"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("rules")), h("th", null, t("severity")), h("th", null, t("status")))),
						h("tbody", null, rules.map((rule) => h("tr", { key: rule.id },
							h("td", null, h("div", { className: "bt-cell-title" }, rule.title), h("div", { className: "bt-cell-meta" }, rule.rule_key + " · " + (rule.tags || []).join(", "))),
							h("td", null, h(Badge, { tone: toneOfSeverity(rule.severity) }, rule.severity)),
							h("td", null, rule.enabled ? "enabled" : "disabled"))))));
				const cveTable = cves.length === 0
					? h(Empty, { title: t("empty"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, "CVE"), h("th", null, t("title")), h("th", null, t("severity")), h("th", null, t("urgency")))),
						h("tbody", null, cves.map((item) => h("tr", { key: item.id },
							h("td", null, item.id),
							h("td", null, h("div", { className: "bt-cell-title" }, item.title), h("div", { className: "bt-cell-meta" }, item.product)),
							h("td", null, h(Badge, { tone: toneOfSeverity(item.severity) }, item.severity)),
							h("td", null, item.urgency))))));
				const sourceTable = sources.length === 0
					? h(Empty, { title: t("empty"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("telemetry")), h("th", null, t("status")), h("th", null, t("lastPoll")), h("th", null, t("events")))),
						h("tbody", null, sources.map((source) => h("tr", { key: source.id },
							h("td", null, h("div", { className: "bt-cell-title" }, source.name), h("div", { className: "bt-cell-meta" }, source.path)),
							h("td", null, h(Badge, { tone: source.last_error ? "danger" : "ok" }, source.last_error ? "error" : source.status)),
							h("td", null, source.last_poll_at ? timeText(source.last_poll_at) : "—"),
							h("td", null, `${source.events_total || 0} / ${source.alerts_total || 0}`))))));
				const responseTable = responses.length === 0
					? h(Empty, { title: t("empty"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("actions")), h("th", null, t("status")), h("th", null, t("summary")))),
						h("tbody", null, responses.map((item) => h("tr", { key: item.id },
							h("td", null, h("div", { className: "bt-cell-title" }, item.action), h("div", { className: "bt-cell-meta" }, item.target)),
							h("td", null, h(Badge, { tone: item.status === "rolled_back" ? "muted" : item.status === "applied" ? "ok" : "warn" }, item.status)),
							h("td", null, item.evidence || item.rollback || "—"))))));
				return h("div", null,
					h("div", { className: "bt-page-head" },
						h("div", null, h("div", { className: "bt-page-title" }, t("defense")), h("div", { className: "bt-page-sub" }, t("controlScore") + " " + controls.score + "%")),
						h("div", { className: "bt-page-actions" },
							h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")), " ",
							h(Btn, { sm: true, kind: "primary", disabled: busy, onClick: () => run("controlScan") }, t("verifyDefense")), " ",
							h(Btn, { sm: true, disabled: busy, onClick: () => run("telemetryPoll") }, t("pollTelemetry")),
							h(Btn, { sm: true, disabled: busy, onClick: () => run("exportEvidence") }, t("exportEvidence")),
							h(Btn, { sm: true, disabled: busy, onClick: () => run("cveCampaign") }, t("cveCampaign")))),
					statsRow,
					h(Section, { title: t("controls") }, controlTable),
					h(Section, { title: t("rules") }, ruleTable),
					h(Section, { title: t("cvePack") }, cveTable),
					h(Section, { title: t("telemetry") }, sourceTable),
					h(Section, { title: t("responses") }, responseTable));
			};

			const renderGraph = () => {
				const graph = data.graph || { summary: {}, assets: [], cves: [] };
				const summary = graph.summary || {};
				const assets = graph.assets || [];
				const cves = graph.cves || [];
				const riskTone = (value) => value === "critical" ? "danger" : value === "high" ? "warn" : value === "medium" ? "warn" : "ok";
				const summaryRow = h("div", { className: "bt-stats" },
					h(Stat, { label: t("assets"), value: summary.assets || 0, sub: (summary.high_risk_assets || 0) + " high risk" }),
					h(Stat, { label: t("exposed"), value: summary.exposed_assets || 0, sub: t("graph") }),
					h(Stat, { label: "CVE", value: summary.cve_matches || 0, sub: "version unverified" }),
					h(Stat, { label: t("edges"), value: summary.edges || 0, sub: t("graph") }));
				const assetCards = assets.length === 0
					? h(Empty, { title: t("noAssets"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", null, assets.slice(0, 10).map((asset) => h("div", {
						key: asset.id,
						style: { border: "1px solid rgba(127,127,127,.25)", borderRadius: 8, padding: 10, marginBottom: 8 },
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" } },
							h("div", null,
								h("div", { className: "bt-cell-title" }, asset.name),
								h("div", { className: "bt-cell-meta" }, (asset.kind || "other") + " · " + (asset.address || "—") + " · " + (asset.exposure ? t("exposed") : t("internal")))),
							h(Badge, { tone: riskTone(asset.risk_label) }, String(asset.risk))),
						h("div", { style: { height: 6, borderRadius: 3, background: "rgba(127,127,127,.18)", marginTop: 8 } },
							h("div", { style: { height: 6, borderRadius: 3, width: Math.min(asset.risk, 100) + "%", background: asset.risk >= 70 ? "#ef4444" : asset.risk >= 45 ? "#f59e0b" : "#10b981" } })),
						h("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 } },
							(asset.cve_ids || []).slice(0, 6).map((id) => h("span", { key: id, className: "bt-cell-meta" }, id)),
							(asset.cve_ids || []).length === 0 ? h("span", { className: "bt-cell-meta" }, "no CVE match") : null))));
				const cveCards = cves.length === 0
					? h(Empty, { title: t("empty"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", null, cves.slice(0, 10).map((cve) => h("div", {
						key: cve.id,
						style: { border: "1px solid rgba(127,127,127,.25)", borderRadius: 8, padding: 10, marginBottom: 8 },
					},
						h("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" } },
							h("div", null,
								h("div", { className: "bt-cell-title" }, cve.id),
								h("div", { className: "bt-cell-meta" }, cve.title + " · " + cve.product)),
							h(Badge, { tone: toneOfSeverity(cve.severity) }, cve.severity)),
						h("div", { className: "bt-cell-meta", style: { marginTop: 6 } }, (cve.asset_ids || []).length + " asset(s) · " + cve.urgency))));
				return h("div", null,
					h("div", { className: "bt-page-head" },
						h("div", null, h("div", { className: "bt-page-title" }, t("graph")), h("div", { className: "bt-page-sub" }, t("graphNote"))),
						h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
					summaryRow,
					h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 } },
						h(Section, { title: t("assets") + " → CVE" }, assetCards),
						h(Section, { title: "CVE → " + t("assets") }, cveCards)));
			};

			const renderDecoys = () => {
				const decoys = data.decoys || [];
				const hits = data.decoy_hits || [];
				const active = decoys.filter((decoy) => decoy.status === "active").length;
				const hitDecoys = decoys.filter((decoy) => (decoy.hit_count || 0) > 0).length;
				const hitRate = decoys.length === 0 ? 0 : Math.round((hitDecoys / decoys.length) * 100);
				const sources = new Map();
				for (const hit of hits) {
					const source = hit.source || "unknown";
					sources.set(source, (sources.get(source) || 0) + 1);
				}
				const sourceRows = Array.from(sources, ([source, count]) => ({ source, count }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 8);
				const statsRow = h("div", { className: "bt-stats" },
					h(Stat, { label: t("decoys"), value: decoys.length, sub: t("activeCount", { count: active }) }),
					h(Stat, { label: t("hits"), value: hits.length, sub: t("decoyHitRate", { rate: hitRate }) }),
					h(Stat, { label: t("decoySources"), value: sources.size, sub: t("decoySourceHint") }));
				const sourceTable = hits.length === 0
					? h(Empty, { title: t("noDecoyHits"), icon: h(ShieldIcon, { size: 20 }) })
					: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
						h("thead", null, h("tr", null, h("th", null, t("source")), h("th", null, t("hits")))),
						h("tbody", null, sourceRows.map((row) => h("tr", { key: row.source },
							h("td", null, row.source),
							h("td", null, String(row.count)))))));
				return h("div", null,
					h("div", { className: "bt-page-head" },
						h("div", null, h("div", { className: "bt-page-title" }, t("decoys")), h("div", { className: "bt-page-sub" }, t("recorded", { count: decoys.length }))),
						h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")), " ", h(Btn, {
							sm: true,
							kind: "primary",
							disabled: busy,
							onClick: async () => {
								const result = await run("syncDecoys", { authorized: true });
								if (result) {
									setNotice(result.missing ? t("syncMissing") : t("syncDone", { count: result.inserted || 0 }));
									setTimeout(() => setNotice(""), 4500);
								}
							},
						}, t("syncDecoys")))),
					statsRow,
					h(Section, { title: t("decoySources"), sub: t("decoySourceHint") }, sourceTable),
					decoys.length === 0
						? h(Empty, { title: t("noDecoys"), icon: h(ShieldIcon, { size: 20 }) })
						: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
							h("thead", null, h("tr", null, h("th", null, t("name")), h("th", null, t("kind")), h("th", null, t("target")), h("th", null, t("status")), h("th", null, t("expires")), h("th", null, t("hits")), h("th", null, t("actions")))),
							h("tbody", null, decoys.map((decoy) => h("tr", { key: decoy.id },
								h("td", null, h("div", { className: "bt-cell-title" }, decoy.name), h("div", { className: "bt-cell-meta" }, decoy.id)),
								h("td", null, decoy.kind),
								h("td", null, h("span", { style: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5 } }, decoy.target)),
								h("td", null, h(Badge, { tone: decoy.status === "active" ? "ok" : decoy.status === "retired" ? "muted" : "warn" }, decoy.status)),
								h("td", null, decoy.expires_at ? timeText(decoy.expires_at) : "—"),
								h("td", null, String(decoy.hit_count || 0), decoy.last_hit_at ? h("div", { className: "bt-cell-meta" }, timeText(decoy.last_hit_at)) : null),
								h("td", null, decoy.status === "planned" ? h(Btn, { sm: true, disabled: busy, onClick: async () => { const result = await run("updateDecoy", { decoy: decoy.id, status: "active", note: "控制台确认真实部署" }); if (result) { setNotice(t("activate") + " ✓"); setTimeout(() => setNotice(""), 2500); } } }, t("activate")) : "—")))))));
			};

			const renderReport = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("report")), h("div", { className: "bt-page-sub" }, engagement.name + " · " + t("posture"))),
					h("div", { className: "bt-page-actions" }, h(Btn, { kind: "primary", icon: h(TaskIcon), sm: true, onClick: openReport, disabled: busy }, t("report")))),
				report ? h("pre", { className: "bt-report" }, report) : h(Empty, { title: t("reportEmpty"), icon: h(TaskIcon, { size: 20 }) }));

			let content = null;
			if (tab === "overview") content = renderOverviewV2();
			else if (tab === "protect") content = renderProtect();
			else if (tab === "incidents") content = renderIncidents();
			else if (tab === "defense") content = renderDefense();
			else if (tab === "graph") content = renderGraph();
			else if (tab === "alerts") content = renderAlerts();
			else if (tab === "assets") content = renderAssets();
			else if (tab === "findings") content = renderFindings();
			else if (tab === "knowledge") content = renderKnowledge();
			else if (tab === "remote") content = renderRemote();
			else if (tab === "tasks") content = renderTasks();
			else if (tab === "iocs") content = renderIocs();
			else if (tab === "decoys") content = renderDecoys();
			else if (tab === "timeline") content = renderTimeline();
			else content = renderReport();

			const footer = h("footer", { className: "bt-foot" },
				h("span", { className: "bt-live" }, h("i"), t("live")),
				h("span", null, "SQLite"),
				h("span", null, "v" + (data.version || "?")),
				h("span", null, (data.skills || 0) + " " + t("skills")),
				data.gateway && data.gateway.running ? h("span", null, "GW " + (data.gateway.url || data.gateway.port || "on")) : null,
				data.collector && data.collector.running ? h("span", null, "COL " + Math.round((data.collector.interval_ms || 0) / 1000) + "s") : null,
				h("span", { className: "bt-grow" }),
				h("span", null, t("slots") + " " + slots));

			const dialogView = dialog ? h("div", { className: "bt-mask", onClick: (e) => { if (e.target === e.currentTarget) setDialog(null); } },
				h("div", { className: "bt-modal" },
					h("div", { className: "bt-modal-head" },
						h("div", { className: "bt-modal-title" },
							h(dialog.kind === "claim" ? TaskIcon : AlertIcon),
							dialog.kind === "claim" ? t("promptTitle") : (dialog.status === "blocked" ? t("blockTitle") : t("resultTitle"))),
						h(Btn, { sm: true, kind: "ghost", icon: h(CloseIcon), onClick: () => setDialog(null), title: t("close") })),
					h("div", { className: "bt-modal-body" },
						dialog.kind === "claim"
							? h("div", null,
								h("div", { className: "bt-modal-hint" }, t("promptHint")),
								h("div", { style: { marginBottom: 8 } }, h("span", { className: "bt-preset" }, "agent_preset: " + dialog.agent_preset)),
								h("textarea", { readOnly: true, className: "bt-prompt", value: dialog.prompt }))
							: h("div", null,
								h("div", { className: "bt-modal-hint" }, dialog.status === "blocked" ? t("blockHint") : t("resultHint")),
								h("textarea", {
									className: "bt-prompt",
									value: dialog.value,
									placeholder: dialog.status === "blocked" ? t("blockPlaceholder") : t("resultPlaceholder"),
									onChange: (e) => setDialog(Object.assign({}, dialog, { value: e.target.value })),
								}))),
					h("div", { className: "bt-modal-foot" },
						dialog.kind === "claim"
							? h(Btn, { kind: "primary", icon: h(CopyIcon), onClick: async () => { try { await navigator.clipboard.writeText(dialog.prompt); setNotice(t("copied")); setTimeout(() => setNotice(""), 2500); } catch (_) { setError("clipboard unavailable"); } } }, t("copy"))
							: h(Btn, { kind: "primary", onClick: submitResult, disabled: busy }, t("submit")),
						h(Btn, { kind: "ghost", onClick: () => setDialog(null) }, t("close")))))
				: null;

			return h("div", { className: "bt-root" },
				renderHead(),
				h("nav", { className: "bt-tabs", "aria-label": t("type.label") },
					tabs.map(([key, label, count]) => h("button", {
						key,
						type: "button",
						"aria-label": label,
						"data-testid": "tab-" + key,
						className: cls("bt-tab", key === tab && "on"),
						onClick: () => {
							setTab(key);
							if (key === "report" && report === "") openReport();
						},
					}, label, count > 0 ? h("span", { className: "bt-tab-count" }, count) : null))),
				h("div", { className: "bt-body" },
					error ? h("div", { className: "bt-alert" }, h(AlertIcon), " " + error) : null,
					notice ? h("div", { className: "bt-notice" }, notice) : null,
					content),
				footer,
				dialogView);
		}

		/* 独立面板：shell.overlay 根作用域，自带标题栏、页签、全屏与拖拽宽度。 */
		function Dock({ t }) {
			const state = useUI();
			const [width, setWidth] = React.useState(() => {
				try {
					const saved = Number(window.localStorage.getItem("bt-dock-width"));
					if (Number.isFinite(saved) && saved >= 420 && saved <= 960) return saved;
				} catch (_) { /* ignore */ }
				return 620;
			});

			React.useEffect(() => {
				try {
					document.documentElement.style.setProperty("--bt-dock-w", width + "px");
					window.localStorage.setItem("bt-dock-width", String(width));
				} catch (_) { /* ignore */ }
			}, [width]);

			React.useEffect(() => {
				if (!state.full) return undefined;
				const onKey = (event) => { if (event.key === "Escape") exitFullView(); };
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [state.full]);

			if (!state.open && !state.full) return null;

			const startResize = (event) => {
				event.preventDefault();
				const startX = event.clientX;
				const startWidth = width;
				const move = (ev) => setWidth(Math.max(420, Math.min(960, startWidth + (startX - ev.clientX))));
				const stop = () => {
					window.removeEventListener("mousemove", move);
					window.removeEventListener("mouseup", stop);
				};
				window.addEventListener("mousemove", move);
				window.addEventListener("mouseup", stop);
			};

			const visible = state.open || state.full;
			return h("div", {
				className: cls("bt-dock", state.full && "bt-full"),
				"data-open": visible ? "1" : "0",
				style: state.full ? undefined : { width: width + "px" },
			},
				!state.full ? h("div", { className: "bt-grip", onMouseDown: startResize, title: t("collapse") }) : null,
				h(Console, {
					t,
					sessionId: state.sessionId,
					full: state.full,
					onToggleFull: () => { if (state.full) exitFullView(); else openFullView(); },
					onClose: () => setUI({ open: false, full: false }),
				}));
		}

		function HeaderButton(props) {
			const t = props.t;
			const state = useUI();
			const sid = sessionIdOf(props);
			React.useEffect(() => {
				if (sid !== null && sid !== ui.sessionId) setUI({ sessionId: sid });
			}, [sid]);
			const toggle = () => {
				if (state.open && !state.full) setUI({ open: false, full: false });
				else setUI({ open: true, full: false });
			};
			return h("button", {
				type: "button",
				className: cls("bt-hbtn", state.open && !state.full && "on"),
				title: t("open"),
				"aria-label": t("open"),
				onClick: toggle,
			}, h(ShieldIcon, { size: 14 }), h("span", null, t("header")));
		}

		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			if (typeof window !== "undefined" && window.location && window.location.hash === "#blue-full") setUI({ open: true, full: true });
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "blue-team: client dictionaries");
			ctx.effect(() => applyStyles(), "blue-team: console styles");
			ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "blue-console",
				order: 50,
			}, () => h(Dock, { t }))), "blue-team: console dock");
			ctx.effect(() => ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "blue-console",
				order: 20,
				locale: NS,
			}, (props) => h(HeaderButton, Object.assign({}, props, { t })))), "blue-team: header action");
		}

		const inject = ["slots", "locale"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
