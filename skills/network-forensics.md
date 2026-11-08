---
name: network-forensics
description: 【流量】网络取证：抓包、pcap 分析、Zeek/Suricata、DNS/HTTP/TLS 与横向/外带识别
whenToUse: 需要从流量确认攻击、C2、横向、数据外带或 WebShell 通信时
role: hunt
category: 流量
tags: [pcap, tshark, zeek, suricata]
enabled: true
---

# 网络取证

## 抓包
```bash
tcpdump -i any -s0 -w cap.pcap host 10.0.0.5
tcpdump -i eth0 -nn -A 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'
```
- 先算容量与时长，避免抓满磁盘；用 BPF 缩小范围。
- 记录开始/结束时间、接口、过滤条件、文件哈希。

## 快速统计
```bash
tshark -r cap.pcap -q -z conv,tcp
tshark -r cap.pcap -q -z io,phs
tshark -r cap.pcap -Y http.request -T fields -e ip.src -e http.host -e http.request.uri | sort | uniq -c | sort -nr
tshark -r cap.pcap -Y dns.qry.name -T fields -e dns.qry.name | sort | uniq -c | sort -nr
```

## 重点
- HTTP：异常 UA、超长 URI、上传 multipart、200 响应体积异常、WebShell 加密 body。
- DNS：长随机子域（隧道）、高频 TXT/NULL、非常见解析器。
- TLS：自签名/JA3 异常、SNI 与目标不符、固定短连接心跳。
- 横向：SMB/RDP/WinRM/SSH 内网连接、PsExec 命名管道、WMI。
- 外带：大流量出站、云盘/邮件/ paste 站点、压缩后上传。

## Zeek
```bash
zeek -r cap.pcap local
cat conn.log | zeek-cut id.orig_h id.resp_h id.resp_p duration orig_bytes resp_bytes
cat http.log | zeek-cut host uri method status_code user_agent
cat dns.log | zeek-cut query qtype_name answers
```

## Suricata
```bash
suricata -r cap.pcap -S rules.rules -l out/
cat out/fast.log
```
规则命中要看流是否继续、是否成功利用，不只看告警条数。

## 产出
- 五元组、时间、协议、请求/响应摘要、判定。
- 提取的文件（HTTP 上传/下载）算哈希，交 `blue_artifact_triage`。
- IOC 落 `blue_ioc_add`；结论落 `blue_finding_add`。
