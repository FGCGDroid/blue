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
			"groupOperations": "处置",
			"groupDefense": "防护",
			"groupRecords": "记录",
			"subAlerts": "告警",
			"subFindings": "发现",
			"subIncidents": "案件",
			"subTasks": "任务",
			"subAssets": "资产",
			"subIocs": "IOC",
			"subGraph": "图谱",
			"subControls": "防线",
			"subKnowledge": "打法库",
			"subDecoys": "诱饵",
			"subTimeline": "时间线",
			"subReport": "报告",
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
			"groupOperations": "Ops",
			"groupDefense": "Defense",
			"groupRecords": "Records",
			"subAlerts": "Alerts",
			"subFindings": "Findings",
			"subIncidents": "Cases",
			"subTasks": "Tasks",
			"subAssets": "Assets",
			"subIocs": "IOC",
			"subGraph": "Graph",
			"subControls": "Controls",
			"subKnowledge": "Playbook",
			"subDecoys": "Decoys",
			"subTimeline": "Timeline",
			"subReport": "Report",
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

		const CONSOLE_CSS_HREF = "/blue/console.css";
let consoleCssLink = null;

// 样式由服务端 /blue/console.css 提供：改样式只要刷新 <link>，不用整页刷新。
function ensureConsoleCss(hash) {
  if (!hash || consoleCssLink === null) return;
  const next = CONSOLE_CSS_HREF + "?v=" + encodeURIComponent(String(hash));
  if (consoleCssLink.getAttribute("href") !== next) consoleCssLink.setAttribute("href", next);
}

function applyStyles() {
  if (typeof document === "undefined") return () => {};
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.plugin = "dsh-blue-team-mode";
  link.dataset.pluginCss = "console";
  link.href = CONSOLE_CSS_HREF;
  document.head.appendChild(link);
  consoleCssLink = link;
  return () => {
    try { link.remove(); } catch (_) { /* ignore */ }
    if (consoleCssLink === link) consoleCssLink = null;
  };
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


		function HomeIcon({ size = 16 }) {
			return h(Svg, { size },
				h("path", { d: "M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }));
		}
		function AssetIcon({ size = 16 }) {
			return h(Svg, { size },
				h("rect", { x: 3.5, y: 5, width: 17, height: 12, rx: 2, stroke: "currentColor", strokeWidth: 1.5 }),
				h("path", { d: "M8 21h8M12 17v4", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }));
		}
		function LockIcon({ size = 16 }) {
			return h(Svg, { size },
				h("rect", { x: 4.5, y: 10, width: 15, height: 10, rx: 2, stroke: "currentColor", strokeWidth: 1.5 }),
				h("path", { d: "M8 10V7.5a4 4 0 0 1 8 0V10", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }));
		}
		function RemoteIcon({ size = 16 }) {
			return h(Svg, { size },
				h("circle", { cx: 12, cy: 12, r: 2, fill: "currentColor" }),
				h("path", { d: "M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" }));
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
			const [subTab, setSubTab] = React.useState("");
			const [chartRange, setChartRange] = React.useState("12h");
			const [protocol, setProtocol] = React.useState(null);
			const [protoStep, setProtoStep] = React.useState(0);
			const [busy, setBusy] = React.useState(false);
			const [protectDone, setProtectDone] = React.useState(false);
			const [report, setReport] = React.useState("");
				const [collectorCmd, setCollectorCmd] = React.useState("");
				const [remoteForm, setRemoteForm] = React.useState({ host: "", name: "", user: "root", key_path: "", port: 22, cloud_url: "", cloud_token: "", log: "/www/wwwlogs/access.log", allow_ips: "", ttl_min: 30, collector_url: "" });
				const [remoteInfo, setRemoteInfo] = React.useState(null);
				const [remoteMode, setRemoteMode] = React.useState("attended");
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
				if (result && result.snapshot) {
					setData(result.snapshot);
					ensureConsoleCss(result.snapshot.ui_css_hash);
				} else if (result && Object.prototype.hasOwnProperty.call(result, "engagement")) {
					setData(result);
					ensureConsoleCss(result.ui_css_hash);
				}
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
						ensureConsoleCss(result && result.ui_css_hash);
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

			// 昆仑协议启动动画：逐行点亮，走到最后一行显示 ARMED。
			React.useEffect(() => {
				if (protocol === null) return undefined;
				if (protoStep >= protocol.lines.length) return undefined;
				const timer = setTimeout(() => setProtoStep(protoStep + 1), 220);
				return () => clearTimeout(timer);
			}, [protocol, protoStep]);

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

			const renderHead = () => h("header", { className: "bt-top" },
				h("div", { className: "bt-top-left" },
					h("div", { className: "bt-emblem" }, h(ShieldIcon, { size: 19 })),
					h("div", { className: "bt-top-copy" },
						h("div", { className: "bt-top-title" }, full ? t("fullTitle") : t("type.label")),
						h("div", { className: "bt-top-sub" }, hasTarget
							? h("select", {
								className: "bt-target-select",
								value: engagement.id,
								title: t("switchTarget"),
								onChange: (e) => { void switchEngagement(e.target.value); },
							}, (data.engagements || []).map((item) => h("option", { key: item.id, value: item.id },
								item.name + (item.status === "active" ? "" : " · " + item.status))))
							: h("span", null, t("noEngagement"))))),
				h("div", { className: "bt-top-right" },
					hasTarget ? h("span", { className: "bt-status " + posture }, h("i"), statusText) : null,
					h("span", { className: "bt-ver" }, "v" + (data.version || "?")),
					h("button", { type: "button", className: "bt-icon-btn", title: t("refresh"), onClick: () => run("overview"), disabled: busy }, h(RefreshIcon, { size: 15 })),
					hasTarget ? h("button", { type: "button", className: "bt-icon-btn", title: t("plan"), onClick: doPlan, disabled: busy }, h(SparkIcon, { size: 15 })) : null,
					h("button", { type: "button", className: "bt-icon-btn", title: full ? t("exitFull") : t("full"), onClick: onToggleFull }, full ? h(MinimizeIcon, { size: 15 }) : h(FullscreenIcon, { size: 15 })),
					h("button", { type: "button", className: "bt-icon-btn", title: t("collapse"), onClick: onClose }, h(CloseIcon, { size: 15 }))));

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
				["operations", t("groupOperations"), (data.alerts ? data.alerts.length : 0) + (data.findings ? data.findings.length : 0)],
				["assets", t("assets"), data.assets ? data.assets.length : 0],
				["defense", t("groupDefense"), data.controls && data.controls.failed ? data.controls.failed : 0],
				["remote", t("remote"), 0],
				["records", t("groupRecords"), 0]
			];

			const renderOverviewV2 = () => {
				const attention = [];
				for (const alert of data.alerts || []) {
					if (alert.status === "open" || alert.status === "investigating") attention.push({ kind: "alert", item: alert, severity: alert.severity, title: alert.title, meta: alert.source || "unknown", at: alert.created_at });
				}
				for (const finding of data.findings || []) {
					if (finding.status === "open") attention.push({ kind: "finding", item: finding, severity: finding.severity, title: finding.title, meta: finding.category || "other", at: finding.created_at });
				}
				const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
				attention.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));

				const blocked = (data.decisions || []).filter((row) => /block|deny|drop/i.test(String(row.action || ""))).length;
				const events = Number(stats.alerts || 0) + Number(stats.findings || 0) + Number((data.decisions || []).length);
				const kpis = [
					{ key: "events", label: "防守事件", value: events, icon: h(ShieldIcon, { size: 18 }), tone: "" },
					{ key: "alerts", label: "活跃告警", value: stats.alerts_open || 0, icon: h(AlertIcon, { size: 18 }), tone: (stats.alerts_critical || 0) > 0 ? "danger" : "warn" },
					{ key: "assets", label: "受保护资产", value: stats.assets || 0, icon: h(AssetIcon, { size: 18 }), tone: "ok" },
					{ key: "blocked", label: "阻断风险", value: blocked, icon: h(LockIcon, { size: 18 }), tone: "ok" },
				];

				const now = Date.now();
				const hour = 3600 * 1000;
				const feed = [];
				for (const item of data.timeline || []) feed.push(item.at);
				for (const alert of data.alerts || []) feed.push(alert.created_at);
				for (const finding of data.findings || []) feed.push(finding.created_at);
				const stamps = [];
				for (const ts of feed) {
					const at = Date.parse(ts);
					if (Number.isFinite(at)) stamps.push(at);
				}
				let series = [];
				let axisLabels = [];
				if (chartRange === "12h") {
					series = new Array(12).fill(0);
					for (const at of stamps) {
						const idx = 11 - Math.floor((now - at) / hour);
						if (idx >= 0 && idx < 12) series[idx] += 1;
					}
					axisLabels = series.map((v, i) => String(i + 1).padStart(2, "0") + "h");
				} else {
					const buckets = 14;
					const oldest = stamps.length > 0 ? Math.min(now, ...stamps) : now;
					const span = Math.max(now - oldest, hour);
					const step = span / buckets;
					series = new Array(buckets).fill(0);
					for (const at of stamps) {
						const idx = Math.min(buckets - 1, Math.max(0, Math.floor((at - oldest) / step)));
						series[idx] += 1;
					}
					axisLabels = series.map((v, i) => {
						const d = new Date(oldest + step * (i + 0.5));
						return String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
					});
				}
				const peak = Math.max(1, ...series);
				const W = 640;
				const H = 190;
				const pad = 6;
				const points = series.map((v, i) => [pad + i * ((W - pad * 2) / (series.length - 1)), H - pad - (v / peak) * (H - pad * 2)]);
				const line = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
				const areaPath = line + " L" + (W - pad) + " " + (H - pad) + " L" + pad + " " + (H - pad) + " Z";
				const chart = h("svg", { className: "bt-chart", viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none" },
					h("defs", null, h("linearGradient", { id: "bt-area", x1: "0", y1: "0", x2: "0", y2: "1" },
						h("stop", { offset: "0%", stopColor: "#22d3ee", stopOpacity: "0.42" }),
						h("stop", { offset: "100%", stopColor: "#22d3ee", stopOpacity: "0.02" }))),
					[0, 0.25, 0.5, 0.75, 1].map((f) => h("line", { key: f, x1: pad, x2: W - pad, y1: pad + f * (H - pad * 2), y2: pad + f * (H - pad * 2), className: "bt-chart-grid" })),
					h("path", { d: areaPath, fill: "url(#bt-area)" }),
					h("path", { d: line, className: "bt-chart-line" }),
					points.map((p, i) => h("circle", { key: i, cx: p[0], cy: p[1], r: i === points.length - 1 ? 4 : 2.2, className: "bt-chart-dot" })));

				const pct = Math.round(Number((data.controls && data.controls.score) || 0));
				const donutLen = 2 * Math.PI * 46;
				const donut = h("svg", { className: "bt-donut", viewBox: "0 0 120 120" },
					h("circle", { cx: 60, cy: 60, r: 46, className: "bt-donut-bg" }),
					h("circle", { cx: 60, cy: 60, r: 46, className: "bt-donut-fg", strokeDasharray: (pct / 100 * donutLen).toFixed(1) + " " + donutLen.toFixed(1), transform: "rotate(-90 60 60)" }),
					h("text", { x: 60, y: 58, className: "bt-donut-num" }, pct),
					h("text", { x: 60, y: 76, className: "bt-donut-cap" }, "健康度"));

				const logRows = (data.timeline || []).slice(0, 6);

				return h("div", { className: "bt-dash" },
					h("div", { className: "bt-kpis" }, kpis.map((kpi) => h("div", { key: kpi.key, className: "bt-kpi " + (kpi.tone || "") },
						h("div", { className: "bt-kpi-icon" }, kpi.icon),
						h("div", { className: "bt-kpi-copy" },
							h("div", { className: "bt-kpi-label" }, kpi.label),
							h("div", { className: "bt-kpi-value" }, kpi.value))))),
					h("section", { className: "bt-panel" },
						h("div", { className: "bt-panel-head" },
							h("div", { className: "bt-panel-title" }, h("i", null), "实时事件流"),
							h("div", { className: "bt-panel-tools" },
								h("button", { type: "button", className: cls("bt-chip", chartRange === "12h" && "on"), onClick: () => setChartRange("12h") }, "近 12 小时"),
								h("button", { type: "button", className: cls("bt-chip", chartRange === "all" && "on"), onClick: () => setChartRange("all") }, "全部"),
								h(Btn, { sm: true, icon: h(RefreshIcon), onClick: () => run("overview"), disabled: busy }, ""))),
						h("div", { className: "bt-chart-wrap" }, chart,
							h("div", { className: "bt-chart-axis" }, axisLabels.map((label, i) => h("span", { key: i }, label)))),
						h("div", { className: "bt-panel-legend" },
							h("span", null, (chartRange === "12h" ? "今日事件 " : "累计事件 ") + events),
							h("span", null, "峰值 " + peak),
							h("span", null, "告警 " + (stats.alerts_open || 0)),
							h("span", null, "任务 " + (stats.tasks_active || 0)))),
					h("div", { className: "bt-dash-grid" },
						h("section", { className: "bt-panel" },
							h("div", { className: "bt-panel-head" },
								h("div", { className: "bt-panel-title" }, h("i", null), "今日风险摘要"),
								h("div", { className: "bt-panel-tools" }, h(Btn, { sm: true, onClick: () => setTab("alerts") }, "全部"))),
							attention.length === 0
								? h("div", { className: "bt-risk-empty" }, "暂无未闭环风险")
								: h("div", { className: "bt-risk-list" }, attention.slice(0, 6).map((entry, index) => h("button", {
									key: entry.kind + entry.item.id,
									type: "button",
									className: "bt-risk-item",
									onClick: () => setTab(entry.kind === "alert" ? "alerts" : "findings"),
								},
									h("span", { className: "bt-risk-index" }, String(index + 1).padStart(2, "0")),
									h("span", { className: "bt-risk-main" }, entry.title, h("em", null, entry.meta + " · " + timeText(entry.at))),
									h("span", { className: "bt-risk-sev " + toneOfSeverity(entry.severity) }, severityLabel(t, entry.severity)),
									h("span", { className: "bt-risk-go" }, "›"))))),
						h("section", { className: "bt-panel bt-health" },
							h("div", { className: "bt-panel-head" }, h("div", { className: "bt-panel-title" }, h("i", null), "健康度")),
							donut,
							h("div", { className: "bt-health-legend" },
								h("span", null, h("i", { className: "ok" }), "通过 " + (data.controls ? data.controls.passed : 0)),
								h("span", null, h("i", { className: "warn" }), "待验证 " + (data.controls ? data.controls.unknown : 0)),
								h("span", null, h("i", { className: "bad" }), "未通过 " + (data.controls ? data.controls.failed : 0))))),
					h("section", { className: "bt-panel" },
						h("div", { className: "bt-panel-head" },
							h("div", { className: "bt-panel-title" }, h("i", null), "终端日志中心"),
							h("div", { className: "bt-panel-tools" },
								h(Btn, { sm: true, kind: "primary", icon: h(SparkIcon), onClick: doPlan, disabled: busy }, "规划任务"),
								h(Btn, { sm: true, icon: h(TaskIcon), onClick: openReport }, "报告"))),
						logRows.length === 0
							? h("div", { className: "bt-risk-empty" }, "暂无日志")
							: h("div", { className: "bt-log" }, logRows.map((row) => h("div", { key: row.id, className: "bt-log-row" },
								h("span", { className: "bt-log-time" }, timeText(row.at)),
								h("span", { className: "bt-log-tag" }, "[INFO]"),
								h("span", { className: "bt-log-main" }, row.action),
								h("span", { className: "bt-log-target" }, row.target || "—"),
								h("span", { className: "bt-log-status" }, "正常"))))),
					h("div", { className: "bt-quick" },
						h("span", { className: "bt-quick-label" }, "并发名额"),
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
						h(Btn, { sm: true, onClick: saveSlots, disabled: busy }, "保存"),
						slotsDirty ? h("span", { className: "bt-slot-unit" }, "未保存") : null,
						h("span", { className: "bt-quick-grow" }),
						data.protection ? h("span", { className: "bt-quick-status" }, data.protection.headline) : null,
						h(Btn, { sm: true, onClick: () => setTab("remote") }, "远程防御")));
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

			const readRemote = async () => {
				const info = await run("remoteInfo");
				if (!info) return;
				setRemoteInfo(info);
				if (info.ssh) {
					setRemoteForm(Object.assign({}, remoteForm, {
						host: info.ssh.host || remoteForm.host,
						user: info.ssh.user || remoteForm.user,
						key_path: info.ssh.key_path || "",
						port: info.ssh.port || 22,
					}));
				}
			};

			const startAttended = async () => {
				const target = remoteForm.host.trim();
				if (target === "") return;
				const result = await run("protectStart", { target, name: remoteForm.name.trim() || undefined });
				if (result) {
					setNotice("已登记人工值守目标：" + result.engagement.name);
					setTimeout(() => setNotice(""), 4000);
					setTab("overview");
				}
			};

			const startUnattended = async () => {
				const host = remoteForm.host.trim();
				const allow = remoteForm.allow_ips.trim();
				const collector = remoteForm.collector_url.trim();
				if (host === "" || remoteForm.user.trim() === "" || remoteForm.key_path.trim() === "") {
					setNotice("先填公网 IP、SSH 用户和私钥路径");
					setTimeout(() => setNotice(""), 3000);
					return;
				}
				if (allow === "") {
					setNotice("真实封禁必须填白名单 IP（你自己的出口 IP），否则可能把自己封掉");
					setTimeout(() => setNotice(""), 4000);
					return;
				}
				if (!/^https?:\/\//i.test(collector)) {
					setNotice("DSH 地址要填 http(s)://，例如 http://1.2.3.4:端口");
					setTimeout(() => setNotice(""), 4000);
					return;
				}
				const lines = [
					{ text: "> KUNLUN PROTOCOL v3.0 // 昆仑协议", tone: "dim" },
					{ text: "[01] 握手中继信道 · TLS 1.3 ................. OK", tone: "ok" },
					{ text: "[02] 验证操作员凭据 ......................... OK", tone: "ok" },
					{ text: "[03] 挂载远程遥测桥 ......................... OK", tone: "ok" },
					{ text: "[04] 载入防御组签名 32/32 ................... OK", tone: "ok" },
					{ text: "[05] 同步打法库签名 32/32 ................... OK", tone: "ok" },
					{ text: "[06] 写入 nftables 封禁集合 ................. ENFORCE", tone: "warn" },
					{ text: "[07] 值守节点进入武装态 ..................... ARMED", tone: "armed" },
				];
				setProtocol({ lines, result: null, ttl: Number(remoteForm.ttl_min) || 30 });
				const saved = await run("remoteSetup", remoteForm);
				if (!saved) {
					setProtocol(null);
					return;
				}
				const result = await run("remoteUnattended", {
					host,
					log: remoteForm.log.trim() || "/www/wwwlogs/access.log",
					allow_ips: allow,
					ttl: (Number(remoteForm.ttl_min) || 30) * 60,
					collector_url: collector,
				});
				setProtocol((current) => current === null ? current : Object.assign({}, current, {
					result: result ? { ok: true, step: result.step, mode: result.mode, ttl: result.ttl } : { ok: false, error: "部署失败，看顶部错误提示" },
				}));
			};

			const renderRemote = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null,
						h("div", { className: "bt-page-title" }, t("remoteTitle")),
						h("div", { className: "bt-page-sub" }, "人工值守只登记；无人值守走 SSH 全自动真实封禁（nftables，默认 30 分钟）。")),
					h("div", { className: "bt-page-actions" }, h(Btn, { sm: true, onClick: readRemote }, "读取配置"))),
				h("div", { className: "bt-mode" },
					h("button", { type: "button", className: remoteMode === "attended" ? "on" : "", onClick: () => setRemoteMode("attended") }, "人工值守"),
					h("button", { type: "button", className: remoteMode === "unattended" ? "on" : "", onClick: () => setRemoteMode("unattended") }, "无人值守")),
				remoteMode === "attended"
					? h(Section, { title: "人工值守：只登记，不碰服务器", sub: "有自己的运维、只想先接日志时选这个" },
						h("div", { className: "bt-form" },
							h(Field, { label: "公网 IP / 域名" }, h("input", {
								className: "bt-input",
								value: remoteForm.host,
								placeholder: "1.2.3.4 或 https://example.com",
								onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { host: e.target.value })),
							})),
							h(Field, { label: "名称（可选）" }, h("input", {
								className: "bt-input",
								value: remoteForm.name,
								placeholder: "例如：公司官网",
								onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { name: e.target.value })),
							})),
							h("div", { className: "bt-form-actions" },
								h(Btn, { kind: "primary", disabled: busy || remoteForm.host.trim() === "", onClick: startAttended }, "登记并开始监控"))),
						h("div", { style: { fontSize: 11, opacity: 0.75, marginTop: 8 } },
							"不会连服务器、不会改配置、不需要私钥；日志可以后面再接采集器，处置由人决定。"))
					: h(Section, { title: "无人值守：SSH + 真实封禁", sub: "命中上传/XSS/穿越/扫描器/敏感路径即封，自动解封" },
						h("div", { className: "bt-form" },
							h(Field, { label: "公网 IP" }, h("input", { className: "bt-input", value: remoteForm.host, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { host: e.target.value })) })),
							h(Field, { label: "SSH 用户" }, h("input", { className: "bt-input", value: remoteForm.user, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { user: e.target.value })) })),
							h(Field, { label: "私钥路径（本机）" }, h("input", { className: "bt-input", value: remoteForm.key_path, placeholder: "/home/me/.ssh/id_ed25519", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { key_path: e.target.value })) })),
							h(Field, { label: "SSH 端口" }, h("input", { className: "bt-input", value: remoteForm.port, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { port: Number(e.target.value) || 22 })) })),
							h(Field, { label: "日志路径" }, h("input", { className: "bt-input", value: remoteForm.log, placeholder: "/www/wwwlogs/access.log", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { log: e.target.value })) })),
							h(Field, { label: "白名单 IP（必填）" }, h("input", { className: "bt-input", value: remoteForm.allow_ips, placeholder: "你的出口 IP，逗号分隔", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { allow_ips: e.target.value })) })),
							h(Field, { label: "封禁时长（分钟）" }, h("input", { className: "bt-input", type: "number", min: 1, max: 120, value: remoteForm.ttl_min, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { ttl_min: Number(e.target.value) || 30 })) })),
							h(Field, { label: "DSH 地址（采集器回传）" }, h("input", { className: "bt-input", value: remoteForm.collector_url, placeholder: "http://1.2.3.4:端口", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { collector_url: e.target.value })) })),
							h(Field, { label: "云 Webhook（可选）" }, h("input", { className: "bt-input", value: remoteForm.cloud_url, placeholder: "https://...", onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { cloud_url: e.target.value })) })),
							h(Field, { label: "云 Token（可选）" }, h("input", { className: "bt-input", type: "password", value: remoteForm.cloud_token, onChange: (e) => setRemoteForm(Object.assign({}, remoteForm, { cloud_token: e.target.value })) })),
							h("div", { className: "bt-form-actions" },
								h(Btn, { kind: "primary", disabled: busy || !remoteForm.host || !remoteForm.user || !remoteForm.key_path, onClick: startUnattended }, "开启值守"),
								h(Btn, { disabled: busy || !remoteForm.host || !remoteForm.user || !remoteForm.key_path, onClick: async () => { const result = await run("remoteSetup", remoteForm); if (result) { setNotice("远程配置已保存"); setTimeout(() => setNotice(""), 3000); } } }, "保存配置"),
								h(Btn, { disabled: busy || !remoteForm.host, onClick: async () => { const result = await run("remoteTest", { host: remoteForm.host, user: remoteForm.user, key_path: remoteForm.key_path, port: remoteForm.port }); if (result) setNotice(result.ok ? "SSH 连通" : ("SSH 失败：" + (result.error || "未知"))); } }, "测试 SSH"),
								h(Btn, { disabled: busy || !remoteForm.host, onClick: async () => { const result = await run("remotePrepare", { host: remoteForm.host }); if (result && result.task) { setNotice("已生成审批任务：" + result.task.id); setTimeout(() => setNotice(""), 5000); } } }, "生成部署审批"))),
						h("div", { style: { marginTop: 10, fontSize: 11, opacity: 0.75 } },
							"白名单与内网永不封；封禁到期自动解封；卸载脚本会删除 blue_guard 表。下面的“生成部署审批”保留人工审批路径。",
							remoteInfo && remoteInfo.available ? " 服务已加载。" : " 服务未加载，先重启 DSH。")),
				h(Section, { title: "两种模式的区别" },
					h("div", { style: { fontSize: 12, lineHeight: 1.8, opacity: 0.85 } },
						"人工值守：只登记目标 + 接日志，人来决定处置；不需要 SSH。",
						h("br"),
						"无人值守：给 SSH 私钥路径，审批后自动部署采集器 / 防御组；默认 dry-run。",
						h("br"),
						"私钥只存路径，不上传内容；云 Webhook 必须 https。")));

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

			// 页面合并：4 个分组各自带子页签，避免 15 个一级页签挤在一起。
			const subGroups = {
				operations: [
					{ key: "alerts", label: t("subAlerts"), count: (data.alerts || []).length, render: renderAlerts },
					{ key: "findings", label: t("subFindings"), count: (data.findings || []).length, render: renderFindings },
					{ key: "incidents", label: t("subIncidents"), count: (data.incidents || []).length, render: renderIncidents },
					{ key: "tasks", label: t("subTasks"), count: (data.tasks || []).length, render: renderTasks },
				],
				assets: [
					{ key: "assets", label: t("subAssets"), count: (data.assets || []).length, render: renderAssets },
					{ key: "iocs", label: t("subIocs"), count: (data.iocs || []).length, render: renderIocs },
					{ key: "graph", label: t("subGraph"), count: 0, render: renderGraph },
				],
				defense: [
					{ key: "defense", label: t("subControls"), count: (data.controls && data.controls.failed) || 0, render: renderDefense },
					{ key: "knowledge", label: t("subKnowledge"), count: (data.knowledge || []).length, render: renderKnowledge },
					{ key: "decoys", label: t("subDecoys"), count: (data.decoys || []).length, render: renderDecoys },
				],
				records: [
					{ key: "timeline", label: t("subTimeline"), count: (data.timeline || []).length, render: renderTimeline },
					{ key: "report", label: t("subReport"), count: 0, render: renderReport },
				],
			};
			const currentGroup = subGroups[tab] || null;
			let content = null;
			if (tab === "overview") content = renderOverviewV2();
			else if (tab === "remote") content = renderRemote();
			else if (currentGroup !== null) {
				const active = currentGroup.find((item) => item.key === subTab) || currentGroup[0];
				content = h("div", null,
					h("div", { className: "bt-subtabs" }, currentGroup.map((item) => h("button", {
						key: item.key,
						type: "button",
						className: cls("bt-subtab", active.key === item.key && "on"),
						onClick: () => setSubTab(item.key),
					}, item.label, item.count > 0 ? h("span", { className: "bt-tab-count" }, item.count) : null))),
					active.render());
			} else content = renderOverviewV2();

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

						const tabIcon = (key) => key === "overview"
				? h(HomeIcon, { size: 17 })
				: key === "operations"
					? h(AlertIcon, { size: 17 })
					: key === "assets"
						? h(AssetIcon, { size: 17 })
						: key === "defense"
							? h(ShieldIcon, { size: 17 })
							: key === "remote"
								? h(RemoteIcon, { size: 17 })
								: h(TaskIcon, { size: 17 });

			const protoView = protocol === null ? null : h("div", { className: "bt-proto" },
				h("div", { className: "bt-proto-grid" }),
				h("div", { className: "bt-proto-scan" }),
				h("div", { className: "bt-proto-card" },
					h("div", { className: "bt-proto-brand" },
						h("span", { className: "bt-proto-mark" }, h(ShieldIcon, { size: 22 })),
						h("div", { className: "bt-proto-copy" },
							h("div", { className: "bt-proto-kicker" }, "UNATTENDED DEFENSE · 无人值守"),
							h("div", { className: "bt-proto-title" }, "昆 仑 协 议"),
							h("div", { className: "bt-proto-sub" }, "KUNLUN PROTOCOL // ORBITAL DEFENSE LINK"))),
					h("div", { className: "bt-proto-lines" },
						protocol.lines.slice(0, protoStep).map((line, index) => h("div", { key: index, className: "bt-proto-line " + (line.tone || "") }, line.text)),
						protoStep < protocol.lines.length ? h("div", { className: "bt-proto-line cursor" }, "▌") : null),
					h("div", { className: "bt-proto-bar" }, h("i", { style: { width: Math.round((protoStep / protocol.lines.length) * 100) + "%" } })),
					protoStep >= protocol.lines.length
						? h("div", { className: "bt-proto-done" },
							h("div", { className: "bt-proto-status " + (protocol.result && protocol.result.ok === false ? "bad" : "") },
								protocol.result && protocol.result.ok === false ? "DEPLOY FAILED · 部署失败" : "ARMED · 真实封禁已上线"),
							h("div", { className: "bt-proto-task" },
								protocol.result === null || protocol.result === undefined
									? "正在写入远程守则…"
									: protocol.result.ok
										? "nftables 已接管：上传 webshell / XSS / 目录穿越 / 扫描器 / 敏感路径命中即封禁，TTL " + (protocol.ttl || 30) + " 分钟；白名单与内网不封。"
										: protocol.result.error),
							h(Btn, { kind: "primary", onClick: () => setProtocol(null) }, "进入控制台"))
						: h("div", { className: "bt-proto-hint" }, "正在接入远程节点 · 请勿关闭"),
					h("div", { className: "bt-proto-corner tl" }),
					h("div", { className: "bt-proto-corner tr" }),
					h("div", { className: "bt-proto-corner bl" }),
					h("div", { className: "bt-proto-corner br" })));

			return h("div", { className: "bt-root" },
				renderHead(),
				h("div", { className: "bt-shell" },
					h("aside", { className: "bt-rail", "aria-label": t("type.label") },
						tabs.map(([key, label, count]) => h("button", {
							key,
							type: "button",
							"data-testid": "tab-" + key,
							className: cls("bt-rail-item", key === tab && "on"),
							onClick: () => {
								setTab(key);
								setSubTab("");
							},
						},
							h("span", { className: "bt-rail-icon" }, tabIcon(key)),
							h("span", { className: "bt-rail-label" }, label),
							count > 0 ? h("i", { className: "bt-rail-count" }, count) : null))),
					h("div", { className: "bt-main" },
						error ? h("div", { className: "bt-alert" }, h(AlertIcon), " " + error) : null,
						notice ? h("div", { className: "bt-notice" }, notice) : null,
						content)),
				footer,
				protoView,
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
