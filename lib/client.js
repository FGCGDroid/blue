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
			"tasks": "任务",
			"timeline": "时间线",
			"empty": "暂无记录",
			"noEngagement": "未绑定防守目标",
			"noEngagementHint": "新建目标，或绑定已存在的目标；也可以直接在会话里调用 blue_engagement_open。",
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
			"tasks": "Tasks",
			"timeline": "Timeline",
			"empty": "No records",
			"noEngagement": "No defended target",
			"noEngagementHint": "Create a target, bind an existing one, or run blue_engagement_open in the session.",
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
:root{--bt-dock-w:620px}
/* 独立右侧面板：和红队一样用 shell.overlay 常驻，而不是右侧栏里的文件 tab。
   原生右侧栏收起时给 frame 补右侧内边距，中栏主动收窄；原生右侧栏打开时面板让位。 */
.bt-dock{position:absolute;top:var(--dsh-frame-chrome-top,var(--dsh-frame-top-clearance,var(--dsh-windows-titlebar-height,0px)));
  right:0;bottom:0;z-index:20;display:flex;flex-direction:column;width:var(--bt-dock-w);
  background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1);
  box-shadow:-12px 0 32px rgba(0,0,0,.16);pointer-events:auto;overflow:hidden;
  transition:transform .18s ease,opacity .18s ease}
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
.bt-grip{position:absolute;left:-3px;top:0;bottom:0;width:6px;cursor:col-resize;background:transparent;z-index:3}
.bt-grip:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent)}
.bt-hbtn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);
  background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 82%,transparent);color:var(--dsw-alias-label-primary);
  border-radius:7px;padding:3px 8px;font-size:11px;font-weight:550;cursor:pointer;font-family:inherit;white-space:nowrap}
.bt-hbtn:hover{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1))}
.bt-hbtn.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);
  border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1))}
.bt-phases-card{padding:12px 14px;margin-bottom:10px}
.bt-phases-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
.bt-phases-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
.bt-phase{border:1px solid var(--bt-border);border-radius:9px;padding:8px 9px;background:color-mix(in srgb,var(--bt-layer2) 26%,transparent);
  min-width:0;position:relative;overflow:hidden}
.bt-phase.done{border-color:color-mix(in srgb,var(--bt-ok) 34%,var(--bt-border))}
.bt-phase.on{border-color:color-mix(in srgb,var(--bt-brand) 40%,var(--bt-border))}
.bt-phase-idx{font-size:9px;color:var(--bt-faint);font-weight:700;letter-spacing:.08em}
.bt-phase-name{font-size:11px;font-weight:650;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-phase-meta{font-size:9.5px;color:var(--bt-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-phase-line{height:3px;border-radius:99px;background:var(--bt-border);margin-top:6px;overflow:hidden}
.bt-phase-line>i{display:block;height:100%;border-radius:99px;background:var(--bt-brand)}
.bt-phase.done .bt-phase-line>i{background:var(--bt-ok)}
@media(max-width:620px){.bt-phases-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.bt-ov-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}
.bt-ov-heading{min-width:0;flex:1}
.bt-ov-title-row{display:flex;align-items:center;gap:8px;min-width:0;margin-top:3px}
.bt-ov-title{font-size:19px;font-weight:750;letter-spacing:-.03em;line-height:1.15;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.bt-stage-chip{font-size:10px;font-weight:600;border:1px solid var(--bt-border);border-radius:999px;
  padding:2px 8px;color:var(--bt-muted);white-space:nowrap;flex:none}
.bt-ov-hero{display:grid;grid-template-columns:220px minmax(0,1fr);gap:10px;margin-bottom:10px}
.bt-ov-score{position:relative;overflow:hidden;border:1px solid var(--bt-border);border-radius:14px;padding:14px 15px;
  display:flex;flex-direction:column;min-width:0;
  background:radial-gradient(300px 180px at 100% -20%,color-mix(in srgb,var(--bt-brand) 16%,transparent),transparent 72%),
    linear-gradient(180deg,color-mix(in srgb,var(--bt-layer2) 34%,var(--bt-layer)),var(--bt-layer))}
.bt-ov-score::after{content:"";position:absolute;right:-30px;bottom:-42px;width:130px;height:130px;border-radius:50%;
  background:radial-gradient(circle,color-mix(in srgb,var(--bt-brand) 13%,transparent),transparent 70%);pointer-events:none}
.bt-ov-score-label{font-size:10px;font-weight:650;letter-spacing:.06em;color:var(--bt-muted);text-transform:uppercase}
.bt-ov-score-num{font-size:44px;line-height:1.02;font-weight:750;letter-spacing:-1.6px;color:var(--bt-brand);
  font-variant-numeric:tabular-nums;margin:4px 0 2px}
.bt-ov-score-num small{font-size:12px;font-weight:500;margin-left:4px;letter-spacing:0;color:var(--bt-muted)}
.bt-ov-score-sub{font-size:10.5px;color:var(--bt-muted);line-height:1.5}
.bt-ov-score-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:10px}
.bt-ov-rail{border:1px solid var(--bt-border);border-radius:14px;padding:11px 12px;min-width:0;
  background:linear-gradient(180deg,color-mix(in srgb,var(--bt-layer) 96%,transparent),var(--bt-layer))}
.bt-ov-rail-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
.bt-ov-rail-title{font-size:11px;font-weight:650;color:var(--bt-muted);letter-spacing:.04em;text-transform:uppercase}
.bt-ov-stages{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.bt-stage{position:relative;min-width:0;padding:8px 8px 7px;border:1px solid var(--bt-border);
  border-top:3px solid var(--stage,var(--bt-border));border-radius:9px;
  background:color-mix(in srgb,var(--bt-layer2) 26%,transparent)}
.bt-stage.on{background:color-mix(in srgb,var(--bt-layer2) 62%,transparent);
  box-shadow:0 0 0 1px color-mix(in srgb,var(--stage,var(--bt-brand)) 35%,transparent)}
.bt-stage-node{width:21px;height:21px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:9.5px;font-weight:700;color:#fff;background:var(--stage,var(--bt-muted));opacity:.72;margin-bottom:6px}
.bt-stage.on .bt-stage-node{opacity:1;box-shadow:0 0 0 3px color-mix(in srgb,var(--stage,var(--bt-brand)) 20%,transparent)}
.bt-stage-name{font-size:11px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-stage-meta{font-size:9.5px;color:var(--bt-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-ov-autopilot{display:flex;align-items:center;gap:6px;margin-top:9px;padding-top:8px;border-top:1px solid var(--bt-border);flex-wrap:wrap}
.bt-ov-autopilot b{font-size:13px;font-variant-numeric:tabular-nums}
.bt-ov-metric-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.bt-ov-metric{border:1px solid var(--bt-border);border-radius:9px;padding:8px 9px;
  background:color-mix(in srgb,var(--bt-layer2) 28%,transparent);min-width:0}
.bt-ov-metric-value{font-size:19px;font-weight:750;line-height:1.1;font-variant-numeric:tabular-nums}
.bt-ov-metric-label{font-size:10px;color:var(--bt-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-ov-metric-sub{font-size:9.5px;color:var(--bt-faint);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-ov-tl{display:flex;flex-direction:column}
.bt-ov-tl-row{display:flex;gap:8px;align-items:flex-start;padding:7px 2px;border-top:1px solid color-mix(in srgb,var(--bt-border) 72%,transparent)}
.bt-ov-tl-row:first-child{border-top:0}
.bt-ov-tl-time{font-size:9.5px;color:var(--bt-faint);white-space:nowrap;padding-top:1px;min-width:64px}
.bt-ov-tl-main{min-width:0;flex:1}
.bt-ov-tl-title{font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-ov-tl-sub{font-size:10px;color:var(--bt-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:600px){
  .bt-ov-hero{grid-template-columns:1fr}
  .bt-ov-stages{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:430px){.bt-ov-metric-row{grid-template-columns:1fr}}
.bt-root{
  --bt-brand:var(--dsw-alias-brand-primary);
  --bt-text:var(--dsw-alias-label-primary);
  --bt-muted:var(--dsw-alias-label-secondary);
  --bt-faint:var(--dsw-alias-label-tertiary);
  --bt-bg:var(--dsw-alias-bg-base);
  --bt-layer:var(--dsw-alias-bg-layer-1);
  --bt-layer2:var(--dsw-alias-bg-layer-2);
  --bt-border:var(--dsw-alias-border-l1);
  --bt-danger:#ef4444;
  --bt-warn:#f59e0b;
  --bt-ok:#10b981;
  --bt-info:#6366f1;
  display:flex;flex-direction:column;height:100%;min-height:0;position:relative;overflow:hidden;
  color:var(--bt-text);font-size:12.5px;line-height:1.5;
  background:
    radial-gradient(720px 360px at 100% -10%,color-mix(in srgb,var(--bt-brand) 9%,transparent),transparent 62%),
    var(--bt-bg);
}
.bt-root *{box-sizing:border-box}
.bt-root button,.bt-root input,.bt-root textarea{font-family:inherit}
.bt-root *::-webkit-scrollbar{width:8px;height:8px}
.bt-root *::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--bt-muted) 34%,transparent);border-radius:99px;border:2px solid transparent;background-clip:padding-box}
.bt-root *::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--bt-muted) 52%,transparent);background-clip:padding-box}
.bt-root *::-webkit-scrollbar-track{background:transparent}
.bt-head{display:flex;align-items:center;gap:10px;padding:12px 14px;flex:none;z-index:2;
  border-bottom:1px solid var(--bt-border);
  background:color-mix(in srgb,var(--bt-layer) 86%,transparent);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.bt-brand{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
.bt-logo{width:32px;height:32px;border-radius:10px;flex:none;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,var(--bt-brand),color-mix(in srgb,var(--bt-brand) 58%,#0b2a66));
  box-shadow:0 6px 16px -8px color-mix(in srgb,var(--bt-brand) 70%,transparent)}
.bt-brand-copy{min-width:0;flex:1}
.bt-title{font-size:14px;font-weight:750;letter-spacing:-.01em;display:flex;align-items:center;gap:6px;min-width:0}
.bt-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-ver{font-size:9.5px;font-weight:600;color:var(--bt-muted);border:1px solid var(--bt-border);border-radius:999px;padding:1px 5px;background:color-mix(in srgb,var(--bt-layer2) 55%,transparent);flex:none}
.bt-sub{font-size:10.5px;color:var(--bt-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.bt-head-actions{display:flex;gap:6px;flex:none}
.bt-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--bt-border);cursor:pointer;
  background:color-mix(in srgb,var(--bt-layer2) 64%,transparent);color:var(--bt-text);border-radius:7px;
  padding:4px 9px;font-size:11.5px;font-weight:500;white-space:nowrap;line-height:18px;
  transition:background .15s,border-color .15s,color .15s,box-shadow .15s}
.bt-btn:hover{background:var(--bt-layer2);border-color:color-mix(in srgb,var(--bt-brand) 42%,var(--bt-border))}
.bt-btn:disabled{opacity:.5;cursor:default}
.bt-btn-primary{
  background:light-dark(var(--bt-brand),color-mix(in srgb,var(--bt-brand) 16%,var(--bt-layer2)));
  color:light-dark(var(--bt-bg),var(--bt-brand));
  border-color:light-dark(var(--bt-brand),color-mix(in srgb,var(--bt-brand) 42%,var(--bt-border)));
  box-shadow:0 2px 6px color-mix(in srgb,var(--bt-brand) 24%,transparent)}
.bt-btn-primary:hover{filter:brightness(1.05);background:light-dark(var(--bt-brand),color-mix(in srgb,var(--bt-brand) 22%,var(--bt-layer2)))}
.bt-btn-ghost{background:transparent}
.bt-btn-sm{padding:2px 7px;font-size:10.5px;border-radius:6px;line-height:16px}
.bt-btn-icon{display:inline-flex;align-items:center}
.bt-tabs{display:flex;align-items:center;gap:4px;padding:8px 12px;flex:none;overflow-x:auto;
  border-bottom:1px solid var(--bt-border);scrollbar-width:none;
  background:color-mix(in srgb,var(--bt-layer) 55%,transparent)}
.bt-tabs::-webkit-scrollbar{display:none}
.bt-tab{border:1px solid transparent;background:transparent;color:var(--bt-muted);border-radius:999px;
  padding:3px 10px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;
  transition:background .15s,color .15s,border-color .15s}
.bt-tab:hover{background:var(--bt-layer2);color:var(--bt-text)}
.bt-tab.on{
  background:light-dark(var(--bt-brand),color-mix(in srgb,var(--bt-brand) 16%,var(--bt-layer2)));
  color:light-dark(var(--bt-bg),var(--bt-brand));
  border-color:light-dark(var(--bt-brand),color-mix(in srgb,var(--bt-brand) 42%,var(--bt-border)));
  box-shadow:0 1px 4px color-mix(in srgb,var(--bt-brand) 26%,transparent)}
.bt-tab-count{display:inline-block;margin-left:4px;padding:0 4px;border-radius:999px;font-size:9px;
  background:color-mix(in srgb,currentColor 14%,transparent);vertical-align:1px}
.bt-body{flex:1;min-height:0;overflow:auto;padding:12px 14px 18px}
.bt-page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin:0 0 10px}
.bt-page-title{font-size:14px;font-weight:700;letter-spacing:-.015em}
.bt-page-sub{font-size:10.5px;color:var(--bt-muted);margin-top:1px}
.bt-page-actions{display:flex;gap:5px;flex:none}
.bt-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(170px,.6fr);gap:10px;margin-bottom:10px}
.bt-card{border:1px solid var(--bt-border);border-radius:12px;min-width:0;
  background:linear-gradient(180deg,color-mix(in srgb,var(--bt-layer) 97%,transparent),var(--bt-layer));
  box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 30px -26px rgba(0,0,0,.4)}
.bt-hero-main{position:relative;overflow:hidden;padding:15px 16px}
.bt-hero-main::after{content:"";position:absolute;right:-54px;top:-70px;width:200px;height:200px;border-radius:50%;
  background:radial-gradient(circle,color-mix(in srgb,var(--bt-brand) 13%,transparent),transparent 68%);pointer-events:none}
.bt-eyebrow{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--bt-muted)}
.bt-hero-title{font-size:22px;font-weight:750;letter-spacing:-.03em;line-height:1.15;margin:4px 0 3px;overflow-wrap:anywhere}
.bt-hero-scope{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:var(--bt-muted);overflow-wrap:anywhere}
.bt-hero-note{font-size:11px;color:var(--bt-muted);margin:7px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bt-hero-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}
.bt-status{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:650;
  border:1px solid color-mix(in srgb,var(--bt-ok) 35%,transparent);background:color-mix(in srgb,var(--bt-ok) 10%,transparent);color:var(--bt-ok)}
.bt-status i{width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 0 2px color-mix(in srgb,currentColor 18%,transparent)}
.bt-status.danger{border-color:color-mix(in srgb,var(--bt-danger) 35%,transparent);background:color-mix(in srgb,var(--bt-danger) 10%,transparent);color:var(--bt-danger)}
.bt-hero-side{padding:13px;display:flex;flex-direction:column;min-width:0}
.bt-slot-line{display:flex;align-items:baseline;gap:5px;margin-top:2px}
.bt-slot-value{font-size:30px;font-weight:750;letter-spacing:-.04em;line-height:1.05;font-variant-numeric:tabular-nums}
.bt-slot-unit{font-size:10px;color:var(--bt-muted);font-weight:600}
.bt-bar{height:5px;border-radius:99px;background:var(--bt-border);overflow:hidden;margin:9px 0 5px}
.bt-bar>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--bt-brand),color-mix(in srgb,var(--bt-brand) 60%,#22d3ee))}
.bt-slot-meta{font-size:10px;color:var(--bt-muted);display:flex;gap:9px;flex-wrap:wrap}
.bt-slot-form{display:flex;gap:5px;margin-top:auto;padding-top:9px}
.bt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}
.bt-stat{border:1px solid var(--bt-border);border-radius:10px;background:color-mix(in srgb,var(--bt-layer) 91%,transparent);
  padding:9px 10px;position:relative;overflow:hidden;min-width:0}
.bt-stat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:transparent}
.bt-stat-label{font-size:10px;color:var(--bt-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-stat-value{font-size:21px;font-weight:750;letter-spacing:-.03em;line-height:1.15;margin-top:2px;font-variant-numeric:tabular-nums}
.bt-stat-sub{font-size:9.5px;color:var(--bt-faint);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bt-stat.danger .bt-stat-value{color:var(--bt-danger)}
.bt-stat.danger::before{background:var(--bt-danger)}
.bt-stat.warn .bt-stat-value{color:var(--bt-warn)}
.bt-stat.warn::before{background:var(--bt-warn)}
.bt-stat.ok .bt-stat-value{color:var(--bt-ok)}
.bt-stat.ok::before{background:var(--bt-ok)}
.bt-columns{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:10px}
.bt-section{margin-bottom:10px;overflow:hidden}
.bt-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:10px 12px;
  border-bottom:1px solid var(--bt-border);background:color-mix(in srgb,var(--bt-layer2) 34%,transparent)}
.bt-section-title{font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:6px}
.bt-section-sub{font-size:10px;color:var(--bt-muted);margin-top:1px}
.bt-section-actions{display:flex;gap:5px;flex:none;align-items:center}
.bt-section-body{padding:8px 12px 10px}
.bt-list{display:flex;flex-direction:column;min-width:0}
.bt-item{display:flex;gap:8px;align-items:flex-start;padding:8px 4px;min-width:0;
  border-top:1px solid color-mix(in srgb,var(--bt-border) 72%,transparent)}
.bt-item:first-child{border-top:0}
.bt-item:hover{background:color-mix(in srgb,var(--bt-brand) 4%,transparent);border-radius:8px}
.bt-item-main{flex:1;min-width:0}
.bt-item-title{font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:6px;min-width:0}
.bt-item-title .txt{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;line-height:1.35}
.bt-item-meta{font-size:10px;color:var(--bt-muted);margin-top:2px;display:flex;gap:6px;flex-wrap:wrap}
.bt-item-actions{display:flex;gap:4px;flex:none;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.bt-dot{width:7px;height:7px;border-radius:50%;flex:none;margin-top:5px;background:var(--bt-muted);
  box-shadow:0 0 0 2px color-mix(in srgb,currentColor 16%,transparent)}
.bt-dot.critical{background:var(--bt-danger);box-shadow:0 0 0 2px color-mix(in srgb,var(--bt-danger) 18%,transparent)}
.bt-dot.high{background:var(--bt-warn);box-shadow:0 0 0 2px color-mix(in srgb,var(--bt-warn) 18%,transparent)}
.bt-dot.medium{background:#eab308}
.bt-dot.low{background:#64748b}
.bt-badge{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:1px 7px;font-size:9.5px;
  font-weight:650;border:1px solid transparent;white-space:nowrap;line-height:1.65}
.bt-badge-critical{color:#ef4444;background:#ef44441a;border-color:#ef444455}
.bt-badge-high{color:#f59e0b;background:#f59e0b1a;border-color:#f59e0b55}
.bt-badge-medium{color:#a16207;background:#eab3081a;border-color:#eab30855}
.bt-badge-low{color:#64748b;background:#64748b1a;border-color:#64748b55}
.bt-badge-info{color:#6366f1;background:#6366f11a;border-color:#6366f155}
.bt-badge-ok{color:#10b981;background:#10b9811a;border-color:#10b98155}
.bt-badge-warn{color:#f59e0b;background:#f59e0b1a;border-color:#f59e0b55}
.bt-badge-danger{color:#ef4444;background:#ef44441a;border-color:#ef444455}
.bt-badge-muted{color:var(--bt-muted);background:color-mix(in srgb,var(--bt-layer2) 60%,transparent);border-color:var(--bt-border)}
.bt-table-wrap{border:1px solid var(--bt-border);border-radius:10px;overflow:auto;
  background:color-mix(in srgb,var(--bt-layer) 72%,transparent)}
.bt-table{width:100%;min-width:520px;border-collapse:collapse;font-size:11px}
.bt-table th{position:sticky;top:0;z-index:1;text-align:left;padding:7px 9px;font-size:9.5px;
  letter-spacing:.04em;text-transform:uppercase;color:var(--bt-muted);font-weight:650;white-space:nowrap;
  background:color-mix(in srgb,var(--bt-layer2) 76%,var(--bt-layer));border-bottom:1px solid var(--bt-border)}
.bt-table td{padding:8px 9px;border-bottom:1px solid color-mix(in srgb,var(--bt-border) 72%,transparent);
  vertical-align:top;word-break:break-word}
.bt-table tr:last-child td{border-bottom:0}
.bt-table tbody tr:hover td{background:color-mix(in srgb,var(--bt-brand) 4%,transparent)}
.bt-cell-title{font-weight:600;font-size:11.5px;line-height:1.4}
.bt-cell-meta{font-size:10px;color:var(--bt-muted);margin-top:2px;display:flex;gap:6px;flex-wrap:wrap}
.bt-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px;
  border:1px dashed color-mix(in srgb,var(--bt-border) 82%,transparent);border-radius:10px;
  background:color-mix(in srgb,var(--bt-layer2) 28%,transparent);margin-bottom:10px}
.bt-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.bt-field-full{grid-column:1/-1}
.bt-label{font-size:9.5px;font-weight:650;color:var(--bt-muted);letter-spacing:.02em}
.bt-input{height:30px;border:1px solid var(--bt-border);border-radius:7px;background:color-mix(in srgb,var(--bt-bg) 66%,var(--bt-layer2));
  color:var(--bt-text);padding:0 8px;font-size:11px;outline:none;min-width:0;width:100%;
  transition:border-color .15s,box-shadow .15s}
.bt-input:focus{border-color:var(--bt-brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--bt-brand) 14%,transparent)}
.bt-textarea{height:auto;min-height:58px;padding:6px 8px;resize:vertical;line-height:1.5}
.bt-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:6px;margin-top:2px}
.bt-empty{margin:10px auto;padding:18px 14px;max-width:380px;text-align:center;color:var(--bt-muted);font-size:11px;
  border:1px dashed color-mix(in srgb,var(--bt-border) 82%,transparent);border-radius:12px;
  background:color-mix(in srgb,var(--bt-layer2) 26%,transparent)}
.bt-empty-icon{display:flex;justify-content:center;margin-bottom:5px;color:var(--bt-faint)}
.bt-empty-title{font-size:12px;font-weight:650;color:var(--bt-text);margin-bottom:2px}
.bt-alert{display:flex;gap:6px;align-items:flex-start;border:1px solid #ef444455;background:#ef44440f;
  color:var(--bt-danger);border-radius:9px;padding:7px 9px;font-size:10.5px;margin-bottom:8px;white-space:pre-wrap}
.bt-notice{border:1px solid #10b98155;background:#10b9810f;color:var(--bt-ok);border-radius:9px;
  padding:5px 8px;font-size:10.5px;margin-bottom:8px}
.bt-timeline{position:relative;padding:2px 0 2px 15px}
.bt-timeline::before{content:"";position:absolute;left:4px;top:5px;bottom:5px;width:1px;background:var(--bt-border)}
.bt-tl-item{position:relative;padding:0 0 13px 8px}
.bt-tl-item:last-child{padding-bottom:2px}
.bt-tl-dot{position:absolute;left:-15px;top:4px;width:7px;height:7px;border-radius:50%;background:var(--bt-brand);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--bt-brand) 16%,transparent)}
.bt-tl-time{font-size:9.5px;color:var(--bt-faint)}
.bt-tl-title{font-size:11.5px;font-weight:600;margin-top:1px}
.bt-tl-detail{font-size:10.5px;color:var(--bt-muted);margin-top:1px;overflow-wrap:anywhere}
.bt-report{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,Consolas,monospace;
  font-size:10.5px;line-height:1.65;background:color-mix(in srgb,var(--bt-layer) 82%,transparent);
  border:1px solid var(--bt-border);border-radius:10px;padding:12px;margin:0;color:var(--bt-text)}
.bt-foot{flex:none;display:flex;align-items:center;gap:10px;padding:6px 12px;border-top:1px solid var(--bt-border);
  background:color-mix(in srgb,var(--bt-layer) 82%,transparent);font-size:9.5px;color:var(--bt-faint);
  white-space:nowrap;overflow:hidden}
.bt-live{display:inline-flex;align-items:center;gap:4px;color:var(--bt-ok);font-weight:650}
.bt-live i{width:5px;height:5px;border-radius:50%;background:var(--bt-ok);box-shadow:0 0 0 2px #10b98133}
.bt-grow{flex:1}
.bt-onboard{max-width:500px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.bt-onboard-card{padding:18px 18px 16px}
.bt-onboard-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(135deg,var(--bt-brand),color-mix(in srgb,var(--bt-brand) 58%,#0b2a66));
  box-shadow:0 10px 24px -12px color-mix(in srgb,var(--bt-brand) 70%,transparent);margin-bottom:10px}
.bt-onboard-title{font-size:19px;font-weight:750;letter-spacing:-.03em;margin:3px 0}
.bt-onboard-text{font-size:11.5px;color:var(--bt-muted);margin:0 0 12px}
.bt-onboard .bt-form{margin-bottom:0}
.bt-seg{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--bt-border);border-radius:9px;
  background:color-mix(in srgb,var(--bt-layer2) 30%,transparent);margin-bottom:6px}
.bt-seg-main{flex:1;min-width:0}
.bt-seg-name{font-size:11.5px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-seg-meta{font-size:10px;color:var(--bt-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bt-mask{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;
  background:color-mix(in srgb,#000 46%,transparent);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.bt-modal{width:min(720px,100%);max-height:86vh;display:flex;flex-direction:column;overflow:hidden;
  background:var(--bt-bg);border:1px solid var(--bt-border);border-radius:14px;
  box-shadow:0 24px 64px -24px rgba(0,0,0,.62)}
.bt-modal-head{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:11px 13px;
  border-bottom:1px solid var(--bt-border);background:color-mix(in srgb,var(--bt-layer) 86%,transparent)}
.bt-modal-title{font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px}
.bt-modal-body{padding:12px;overflow:auto;min-height:0}
.bt-modal-foot{display:flex;justify-content:flex-end;gap:6px;padding:10px 12px;border-top:1px solid var(--bt-border)}
.bt-prompt{width:100%;min-height:300px;background:color-mix(in srgb,var(--bt-bg) 84%,var(--bt-layer2));
  border:1px solid var(--bt-border);border-radius:9px;padding:10px;color:var(--bt-text);
  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;line-height:1.55;resize:vertical;outline:none}
.bt-prompt:focus{border-color:var(--bt-brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--bt-brand) 14%,transparent)}
.bt-modal-hint{font-size:10.5px;color:var(--bt-muted);margin:0 0 8px}
.bt-preset{font-family:ui-monospace,Menlo,monospace;font-size:10px;border:1px solid var(--bt-border);border-radius:6px;
  padding:1px 6px;background:color-mix(in srgb,var(--bt-layer2) 55%,transparent);color:var(--bt-muted)}
@media(max-width:560px){
  .bt-hero{grid-template-columns:1fr}
  .bt-columns{grid-template-columns:1fr}
  .bt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .bt-head{flex-wrap:wrap}
  .bt-head-actions{width:100%;justify-content:flex-end}
}
@media(max-width:430px){
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
			const [report, setReport] = React.useState("");
			const [dialog, setDialog] = React.useState(null);
			const [slots, setSlots] = React.useState(3);
			const [onboard, setOnboard] = React.useState({ name: "", scope: "", note: "" });
			const [assetForm, setAssetForm] = React.useState({ name: "", address: "", kind: "host", criticality: "medium", service: "" });
			const [iocForm, setIocForm] = React.useState({ type: "ip", value: "", confidence: "medium", source: "console" });
			const [taskForm, setTaskForm] = React.useState({ title: "", role: "hunt", priority: "P2", brief: "" });
			const [alertFilter, setAlertFilter] = React.useState("all");

			const absorb = (result) => {
				if (result && result.snapshot) {
					setData(result.snapshot);
					if (result.snapshot.slots && result.snapshot.slots.max) setSlots(result.snapshot.slots.max);
				} else if (result && Object.prototype.hasOwnProperty.call(result, "engagement")) {
					setData(result);
					if (result.slots && result.slots.max) setSlots(result.slots.max);
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

			React.useEffect(() => {
				let alive = true;
				(async () => {
					setBusy(true);
					try {
						const result = await callApi(sessionId, "overview");
						if (!alive) return;
						setData(result);
						if (result.slots && result.slots.max) setSlots(result.slots.max);
					} catch (cause) {
						if (alive) setError(cause && cause.message ? cause.message : String(cause));
					} finally {
						if (alive) setBusy(false);
					}
				})();
				return () => { alive = false; };
			}, [sessionId]);

			/* 面板实时刷新：前台每 2 秒拉一次 overview；后台暂停，回来立即补一次。 */
			React.useEffect(() => {
				let alive = true;
				let timer = null;
				let inFlight = false;
				const tick = async () => {
					if (!alive || inFlight || document.visibilityState === "hidden") return;
					inFlight = true;
					try {
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
			const posture = stats.posture === "critical" || criticalCount > 0 ? "danger" : "";
			const statusText = stats.posture === "stable" && criticalCount === 0 ? t("postureOk") : t("postureAttention");

			const renderHead = () => h("header", { className: "bt-head" },
				h("div", { className: "bt-brand" },
					h("div", { className: "bt-logo" }, h(ShieldIcon, { size: 18 })),
					h("div", { className: "bt-brand-copy" },
						h("div", { className: "bt-title" },
							h("span", { className: "bt-title-text" }, full ? t("fullTitle") : t("type.label")),
							h("span", { className: "bt-ver" }, "v" + (data.version || "?")),
							hasTarget ? h("span", { className: "bt-status " + posture }, h("i"), statusText) : null),
						h("div", { className: "bt-sub" }, hasTarget ? engagement.name + " · " + scopeText : t("noEngagement")))),
				h("div", { className: "bt-head-actions" },
					hasTarget ? h(Btn, { kind: "primary", icon: h(SparkIcon), onClick: doPlan, disabled: busy }, t("plan")) : null,
					h(Btn, { icon: h(RefreshIcon), onClick: () => run("overview"), disabled: busy, title: t("refresh") }, hasTarget ? null : t("refresh")),
					full
						? h(Btn, { icon: h(MinimizeIcon), onClick: onToggleFull }, t("exitFull"))
						: h(Btn, { icon: h(FullscreenIcon), onClick: onToggleFull, title: t("full") }),
					h(Btn, { kind: "ghost", icon: h(CloseIcon), onClick: onClose, title: t("collapse") })));

			if (!hasTarget) {
				const onboardForm = h("div", { className: "bt-form" },
					h(Field, { label: t("name") }, h("input", { className: "bt-input", placeholder: t("namePlaceholder"), value: onboard.name, onChange: (e) => setOnboard(Object.assign({}, onboard, { name: e.target.value })) })),
					h(Field, { label: t("scope") }, h("input", { className: "bt-input", placeholder: t("scopePlaceholder"), value: onboard.scope, onChange: (e) => setOnboard(Object.assign({}, onboard, { scope: e.target.value })) })),
					h(Field, { label: t("note"), full: true }, h("input", { className: "bt-input", placeholder: t("notePlaceholder"), value: onboard.note, onChange: (e) => setOnboard(Object.assign({}, onboard, { note: e.target.value })) })),
					h("div", { className: "bt-form-actions" },
						h(Btn, { kind: "primary", disabled: busy || onboard.name.trim() === "", onClick: () => run("openEngagement", onboard) }, t("create"))));
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
								h("div", { className: "bt-onboard-title" }, t("onboardingTitle")),
								h("div", { className: "bt-onboard-text" }, t("noEngagementHint")),
								onboardForm),
							existing)));
			}

			const tabs = [
				["overview", t("overview"), 0],
				["incidents", t("incidents"), data.incidents ? data.incidents.length : 0],
				["alerts", t("alerts"), data.alerts ? data.alerts.length : 0],
				["assets", t("assets"), data.assets ? data.assets.length : 0],
				["findings", t("findings"), data.findings ? data.findings.length : 0],
				["tasks", t("tasks"), data.tasks ? data.tasks.length : 0],
				["iocs", t("iocs"), data.iocs ? data.iocs.length : 0],
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
				return h("div", null,
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
								h("input", { className: "bt-input", type: "number", min: 1, max: 8, value: slots, onChange: (e) => setSlots(Number(e.target.value) || 1), style: { width: 54, height: 26 } }),
								h(Btn, { sm: true, onClick: () => run("setSlots", { slots }), disabled: busy }, t("save"))))),
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
					h("div", null, h("div", { className: "bt-page-title" }, t("timeline")), h("div", { className: "bt-page-sub" }, t("events", { count: (data.timeline || []).length }))),
					h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
				(data.timeline || []).length === 0
					? h(Empty, { title: t("noTimeline"), icon: h(TaskIcon, { size: 20 }) })
					: h("div", { className: "bt-timeline" }, (data.timeline || []).map((item) => h("div", { key: item.id, className: "bt-tl-item" },
						h("span", { className: "bt-tl-dot" }),
						h("div", { className: "bt-tl-time" }, timeText(item.at)),
						h("div", { className: "bt-tl-title" }, item.action + " · " + (item.target || "—")),
						h("div", { className: "bt-tl-detail" }, item.actor + (item.detail ? " · " + item.detail : ""))))));

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
						h("div", { className: "bt-page-actions" }, h(Btn, { icon: h(RefreshIcon), sm: true, onClick: () => run("overview") }, t("refresh")))),
					statsRow,
					h(Section, { title: t("decoySources"), sub: t("decoySourceHint") }, sourceTable),
					decoys.length === 0
						? h(Empty, { title: t("noDecoys"), icon: h(ShieldIcon, { size: 20 }) })
						: h("div", { className: "bt-table-wrap" }, h("table", { className: "bt-table" },
							h("thead", null, h("tr", null, h("th", null, t("name")), h("th", null, t("kind")), h("th", null, t("target")), h("th", null, t("status")), h("th", null, t("expires")), h("th", null, t("hits")))),
							h("tbody", null, decoys.map((decoy) => h("tr", { key: decoy.id },
								h("td", null, h("div", { className: "bt-cell-title" }, decoy.name), h("div", { className: "bt-cell-meta" }, decoy.id)),
								h("td", null, decoy.kind),
								h("td", null, h("span", { style: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10.5 } }, decoy.target)),
								h("td", null, h(Badge, { tone: decoy.status === "active" ? "ok" : decoy.status === "retired" ? "muted" : "warn" }, decoy.status)),
								h("td", null, decoy.expires_at ? timeText(decoy.expires_at) : "—"),
								h("td", null, String(decoy.hit_count || 0), decoy.last_hit_at ? h("div", { className: "bt-cell-meta" }, timeText(decoy.last_hit_at)) : null)))))));
			};

			const renderReport = () => h("div", null,
				h("div", { className: "bt-page-head" },
					h("div", null, h("div", { className: "bt-page-title" }, t("report")), h("div", { className: "bt-page-sub" }, engagement.name + " · " + t("posture"))),
					h("div", { className: "bt-page-actions" }, h(Btn, { kind: "primary", icon: h(TaskIcon), sm: true, onClick: openReport, disabled: busy }, t("report")))),
				report ? h("pre", { className: "bt-report" }, report) : h(Empty, { title: t("reportEmpty"), icon: h(TaskIcon, { size: 20 }) }));

			let content = null;
			if (tab === "overview") content = renderOverviewV2();
			else if (tab === "incidents") content = renderIncidents();
			else if (tab === "alerts") content = renderAlerts();
			else if (tab === "assets") content = renderAssets();
			else if (tab === "findings") content = renderFindings();
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
