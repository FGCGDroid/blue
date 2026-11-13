# 蓝队开源项目调研

这不是“GitHub 上所有蓝队仓库”的穷举，而是按 stars、主题和代表性做的抽样。

抽样方向：

- `topic:blue-team`
- blue team tools / incident response toolkit
- DFIR / threat hunting
- detection engineering / Sigma
- MITRE ATT&CK

## 看到的几类项目

| 项目 | 类型 | 值得借鉴 | 不照搬 |
| --- | --- | --- | --- |
| [AiSOC](https://github.com/beenuar/AiSOC) | AI SOC / 告警融合 | 告警归并、可审计的 agent 决策记录、人工批准后再响应 | 完整 SIEM、向量库、内置大模型栈 |
| [A-poc/BlueTeam-Tools](https://github.com/A-poc/BlueTeam-Tools) | 工具与技巧合集 | 按场景组织工具、先预检再使用 | 把几十个工具打包进插件 |
| [awesome-cybersecurity-blueteam](https://github.com/fabacab/awesome-cybersecurity-blueteam) | Awesome 列表 | 分类方式、覆盖范围 | 只做链接目录 |
| [fibratus](https://github.com/rabbitstack/fibratus) | Windows 传感器 | 行为检测、YARA、采集文件 | 内核传感器/EDR，不适合塞进 DSH 插件 |
| [Security Onion](https://github.com/Security-Onion-Solutions/securityonion) | 完整蓝队发行版 | 网络/主机/PCAP 一体化思路 | 整套 SIEM/IDS 发行版 |
| [SigmaHQ/sigma](https://github.com/SigmaHQ/sigma) | 检测规则标准 | 规则可移植、按 ATT&CK 组织 | 直接灌入几千条规则 |
| [APT-Hunter](https://github.com/ahmedkhlief/APT-Hunter) | Windows 日志狩猎 | 时间线输出、规则统计、Sigma 支持 | Python 引擎和 Windows 日志专用实现 |
| [RedEye](https://github.com/cisagov/RedEye) | C2 日志可视化 | 演示模式、把复杂数据讲给非技术人听 | 红队 C2 日志分析 |
| [UAC](https://github.com/tclahr/uac) | Unix 取证采集 | 证据清单、跨平台采集 | 采集器本身 |
| [VanGuard](https://github.com/ridgelinecyberdefence/vanguard) | DFIR 工具箱 | 证据哈希、chain of custody、ATT&CK 映射、按案件组织 | 单二进制、Velociraptor/KAPE 集成 |
| [DetectionLab](https://github.com/clong/DetectionLab) | 检测实验室 | 日志配置和检测验证思路 | 整套 VM 实验室 |
| [BlueTeamTools](https://github.com/abc123info/BlueTeamTools) | 中文蓝队分析工具箱 | 分析人员工作流、常用解码/流量分析入口 | 具体解密/漏洞利用功能 |

## 真正值得吸收的

### 1. 事实库 + 任务，而不是聊天记录

AiSOC、TheHive 类项目都把“发生了什么、谁在处理、证据是什么”分开存。  
我们的 `assets / alerts / findings / iocs / tasks / timeline` 已经是这个方向。

### 2. 人工批准的响应

AiSOC 的“AI 提议、人批准、再交给执行器”和我们的 `pending_approval` 一致。  
自动 root 封禁不是精华，是风险。

### 3. 可审计的决策记录

不是只记“任务完成”，还要记：为什么这么做、依据哪条告警、谁批的、结果如何。  
当前时间线 + 审批字段已经覆盖一部分，后续可以再加独立的 decision ledger。

### 4. ATT&CK 映射

APT-Hunter、VanGuard、Sigma 都把规则/事件映射到 ATT&CK。  
这次先做了**内置日志规则 → ATT&CK 技术**的静态覆盖表，见 `blue_attack_coverage`。

### 5. 证据完整性

VanGuard 的双哈希、chain of custody 值得借鉴。  
当前 `blue_artifact_triage` 已有 SHA-256/MD5，但还缺“多文件证据清单 + 导出”。

### 6. 报告说人话

RedEye 的演示模式、VanGuard 的 HTML 报告都强调“给非技术人看”。  
我们的报告已经加了执行摘要，但还可以继续压缩成 5 行老板版。

## 明确不吸收的

- 完整 SIEM/EDR/传感器：Security Onion、Fibratus 是另一个产品层级，不是 DSH 插件该做的事。
- 捆绑几十个外部工具：维护、许可、供应链都不可控；继续只做 preflight 和编排。
- 自动封禁/隔离：误封代价太高，继续人工审批。
- 批量导入几千条 Sigma：误报和规则维护会拖垮插件；先做映射，不搬运规则库。
- 真实凭据、Cookie、WebRTC/Canvas 指纹：不做。
- 实时 LLM 生成假漏洞页面：不可控，不做。
- 采集器/内核驱动/内核 eBPF：不进入 DSH 进程。
- 红队 C2、反弹 Shell、漏洞利用：不属于蓝队插件。

## 这次实际落地的

新增：

```text
blue_attack_coverage
```

它把内置 13 条日志规则映射到 ATT&CK 技术，输出：

- 覆盖了哪些技术
- 每个战术下有多少技术
- 哪些规则没映射
- 明确声明“不是全量覆盖”

没有新增任何外部依赖，也没有把 Sigma 规则库塞进包。

## 后续优先级

1. 证据清单 + SHA-256 清单导出
2. Sigma 规则导出（不是导入全库）
3. 告警归并成 incident
4. 决策 ledger
5. 老板版 5 行摘要

这些都比“再加一个自动封禁按钮”更有价值。
