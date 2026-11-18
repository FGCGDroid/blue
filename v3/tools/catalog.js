/**
 * 3.0 工具目录。
 *
 * 名称与分组；M4.0 已注册 session 6 / asset 2 / alert 3，其余在 M4.1+。
 * 现有 66 个 + 新增 7 个 = 73 个。
 */
export const TOOL_GROUPS = Object.freeze({
  session: Object.freeze([
    'blue_engagement_open', 'blue_session_info', 'blue_scope_check',
    'blue_preflight', 'blue_defense_selfcheck', 'blue_tool_catalog',
  ]),
  asset: Object.freeze(['blue_asset_add', 'blue_asset_query']),
  alert: Object.freeze(['blue_alert_ingest', 'blue_alert_list', 'blue_alert_triage']),
  finding: Object.freeze(['blue_finding_add', 'blue_finding_update', 'blue_finding_list']),
  ioc: Object.freeze(['blue_ioc_add', 'blue_ioc_list', 'blue_ioc_check']),
  task: Object.freeze([
    'blue_task_create', 'blue_task_update', 'blue_task_approve', 'blue_task_list', 'blue_autopilot',
  ]),
  incident: Object.freeze([
    'blue_incident_open', 'blue_incident_list', 'blue_incident_update', 'blue_incident_attach',
  ]),
  decision: Object.freeze(['blue_decision_add', 'blue_decision_list']),
  timeline: Object.freeze(['blue_timeline']),
  report: Object.freeze(['blue_report']),
  decoy: Object.freeze([
    'blue_deception_plan', 'blue_decoy_create', 'blue_decoy_hit', 'blue_decoy_list',
    'blue_decoy_update', 'blue_decoy_sync', 'blue_tarpit_plan',
    'blue_honeypot_ingest', 'blue_access_log_ingest',
  ]),
  detection: Object.freeze([
    'blue_detection_rule_add', 'blue_detection_rule_list', 'blue_detection_scan',
  ]),
  telemetry: Object.freeze([
    'blue_telemetry_source_add', 'blue_telemetry_poll', 'blue_telemetry_health',
  ]),
  control: Object.freeze(['blue_control_scan', 'blue_control_list']),
  cve: Object.freeze(['blue_cve_pack', 'blue_cve_scan', 'blue_cve_campaign']),
  risk: Object.freeze(['blue_attack_coverage', 'blue_risk_graph']),
  evidence: Object.freeze(['blue_evidence_export', 'blue_evidence_verify']),
  audit: Object.freeze([
    'blue_audit_verify', 'blue_audit_anchor', 'blue_audit_anchor_verify',
    'blue_defense_status', 'blue_anchor_push',
  ]),
  response: Object.freeze(['blue_response_plan', 'blue_response_update', 'blue_response_list']),
  'response-exec': Object.freeze(['blue_response_execute', 'blue_response_verify']),
  policy: Object.freeze(['blue_policy_validate', 'blue_policy_test', 'blue_policy_diff']),
  gateway: Object.freeze(['blue_gateway_status']),
  range: Object.freeze(['blue_range']),
  protect: Object.freeze(['blue_protect']),
  knowledge: Object.freeze(['blue_knowledge']),
  hunt: Object.freeze([
    'blue_log_scan', 'blue_artifact_triage', 'blue_hardening_check',
    'blue_containment_plan', 'blue_playbook_list',
  ]),
})

export const ALL_TOOL_NAMES = Object.freeze(Object.values(TOOL_GROUPS).flat())

export const NEW_TOOL_NAMES = Object.freeze([
  'blue_anchor_push',
  'blue_response_execute',
  'blue_response_verify',
  'blue_policy_validate',
  'blue_policy_test',
  'blue_policy_diff',
  'blue_gateway_status',
  'blue_range',
  'blue_protect',
  'blue_knowledge',
])

export const EXISTING_TOOL_NAMES = Object.freeze(
  ALL_TOOL_NAMES.filter((name) => !NEW_TOOL_NAMES.includes(name)),
)
