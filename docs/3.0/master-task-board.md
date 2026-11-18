# 3.0 总任务板

> 快照：2026-11-19 01:10 +08:00
> 当前 beta：`3.0.0-beta.1` 已安装，待重启加载最新代码
> 代码状态：134 JS / 73 工具 / v3 全套通过
> 原则：不伪造 done、不把 blocked 写成完成、不为了覆盖率凑规则

## P0 — 当前必须做

| # | 任务 | 目标 | 状态 | 下一步 |
|---|---|---|---|---|
| 1 | 重启 DSH 并验收 | 全局 | 待重启 | 验聚合、close 解绑、blocked 状态机 |
| 2 | 处理 honeypot 告警/案件 | ENG-91A24788 | open | ALT-7F6345E2=open/low；FND-B43F3B09=open/medium；INC-0D6BC875=open，结案需 .env 移出 Web 根 + 归因维持疑似 |
| 3 | js-reverse 失守处置 | ENG-FFAB4D9C | 已收口 | 63400 已停；finding accepted；INC-09998935 closed |
| 4 | 52012 critical 资产身份 | ENG-50221978 | 已确认离线 | 2026-11-19 实测 52012 不监听；资产标 retired，finding fixed |
| 5 | BlueLab admin 弱口令 | ENG-354EC1D5 | 已完成但弱 | `qiuyanqi` 只限本机；暴露前换强口令 |

### 1. 重启后三条验收

```text
blue_telemetry_poll name=aggregate
  期望 hits=3 / alerts=1 / updated=2

blue_alert_triage ids=[...] status=false_positive
  期望 failed=0

blue_engagement_open action=close engagement=别的目标
  期望 still_bound 仍是当前目标
```

## P1 — 目标收口

| # | 任务 | 目标 | 状态 | 下一步 |
|---|---|---|---|---|
| 6 | 日志接入任务 | ENG-354 / TSK-00085FC3 | queued | 确认 ctf-lab-access 是否覆盖；done 或保留 |
| 7 | 主机基线缺口 | ENG-354 / FND-CCCC93B1 | accepted | 维护窗口另开，现在不动主机 |
| 8 | /admin 限速 | ENG-354 / FND-8944173C | accepted | 低危，不另开 P2 |
| 9 | 高危端口收敛 | ENG-6FE / TSK-3903E423 | blocked high | 保持 blocked，写清维护窗口，不 cancel |
| 10 | 路径枚举检测缺口 | ENG-6FE / FND-6CD197A1 | open medium | 补频率+路径规则，或 accepted |
| 11 | 平台缺陷 finding 回写 | ENG-50CCFFED | 7 open | 已修项标 fixed，526B 保留 open |
| 12 | 平台整改清单任务 | ENG-15 / TSK-6E9610A9 | dispatched | 标记 done 或重新分派 |
| 13 | 活跃目标清理 | 全部 | 未开始 | 只关 0 资产/0 open/0 未结；灰区单独看 |
| 14 | BlueLab 规划线 | ENG-803C99DF | 3 queued | 保留，不动 |
| 15 | jwt-none 冻结 | ENG-07E8C21D | contained | 不 reset；5 个 open finding 逐条 accepted/fixed |

### ENG-50CCFFED 回写建议

| finding | 结论 |
|---|---|
| FND-A085ACBD 子智能体空转 | fixed |
| FND-3406F394 SQLi 漏检 | fixed |
| FND-21297006 遥测路径 | fixed |
| FND-4150E66E CVE 误报 | fixed |
| FND-6D56B82E 覆盖率 | fixed（6/10，剩余缺口单列） |
| FND-C1A7BFF4 scope 子集 | fixed |
| FND-526B6925 无批量归档 | 保留 open，P2 |

## P2 — 能力补齐

| # | 任务 | 状态 | 说明 |
|---|---|---|---|
| 16 | gateway 启动 | 等待 | 8080 无上游；起了只有阻断+502 |
| 17 | T1071 C2 规则 | 暂缓 | 无真实样本，不造幽灵规则 |
| 18 | T1041 外带规则 | 暂缓 | 同上 |
| 19 | 路径枚举频率规则 | 待做 | `/.env`、`/.git`、404 频次 |
| 20 | 批量归档 | 待做 | FND-526B6925；当前只能逐条 close |
| 21 | 证据/报告落盘 | 已完成 | 路径 `evidence/`、`reports/` |
| 22 | 告警 60s 聚合 | 已完成 | 待重启验证 |

## 已完成 — 不再排

### 代码

```text
P0 1.1 alert_ingest 顶层字段优先
P0 2.1 decoy_create 必填 deployed
P0 3.1 preflight channels
P1 1.4 scope IPv6/CIDR/范围/子集
P1 4.1/4.2 内置规则 + 字段别名
P1 2.3 engagement close
P2 4.4 CVE weakHits
P2 5.2 attempts 不伪造
P2 6.1 错误 params
子智能体 parentSession 继承
第一次「防御自检」忽略 runtime-context
遥测读取根对齐 ctf-lab
覆盖 tags
批量研判
control 分数语义
report/evidence 落盘
blocked -> done/cancelled
close 非当前目标不解绑
60s 告警聚合
```

### BlueLab

```text
TSK-76F79F6D  done  口令/密钥轮换
TSK-29D5E2BB  done  v3 补丁部署
FND-E5A9F462  fixed
FND-CAEC591A  fixed
FND-12B6168E  fixed
FND-EC0B9691  fixed
FND-CCDE7C9F  fixed
```

### 证据/报告

```text
reports/ENG-15D4DBE6-defense-report.md
evidence/ENG-15D4DBE6-evidence.json
digest b0ba99db...
```

## 目标清单

| 目标 | 状态 | 处置 |
|---|---|---|
| ENG-15D4DBE6 | active | 保留，本场 |
| ENG-50CCFFED | active | 保留，finding 回写 |
| ENG-91A24788 | active | P0 研判 |
| ENG-FFAB4D9C | active | 实例已停，finding accepted，incident closed；可进清理候选 |
| ENG-50221978 | active | 资产离线，已 retired；finding fixed |
| ENG-354EC1D5 | active | 2 finding + 1 queued |
| ENG-6FE471DA | active | 1 blocked high |
| ENG-803C99DF | active | 3 queued，保留 |
| ENG-07E8C21D | active | contained 冻结 |
| ENG-2C716F16 | active | 0 open，清理候选 |
| ENG-E47B3BE0 | active | 0 open，清理候选 |
| ENG-19BC3AE1 | active | 体检目标，清理候选 |
| ENG-E3ACD278 | closed | 已关 |
| ENG-89EBB7D8 | closed | 已关 |
| ENG-6ED44C9B | closed | 已关 |
| ENG-B3349DA3 | closed | 已关 |
| ENG-1667BB88 | closed | 保留 5 IOC |

## 执行顺序

```text
1 重启 DSH
2 跑三条验收
3 ENG-91 告警/案件
4 ENG-354 两个 finding + 1 queued
5 ENG-50 finding 回写
6 ENG-6FE blocked 保持
7 清理 0/0/0 目标
8 最后才看 gateway / T1071 / T1041
```
