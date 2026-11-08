---
name: cloud-k8s-defense
description: 【云】云与 K8s 防守：AK/SK 泄露、IAM 异常、公开桶、容器逃逸、K8s 审计与加固
whenToUse: 比赛涉及云资源/容器/K8s，或怀疑云凭据泄露、容器被控时
role: hardening
category: 云
tags: [cloud, k8s, container, iam]
enabled: true
---

# 云与 K8s 防守

## 云凭据泄露（最高优先）
1. 立即禁用/轮换 AK/SK、Token、Webhook、数据库密码。
2. 查 CloudTrail/操作审计：`AssumeRole`、`CreateUser`、`CreateAccessKey`、`PutBucketPolicy`、`RunInstances`。
3. 查异常资源：新 IAM 用户/密钥、公开桶、快照共享、Lambda/Function 后门、安全组放开。
4. 收敛权限：最小权限、MFA、禁止长期密钥、密钥扫描。

## 对象存储
- 检查 bucket ACL/Policy 是否 public；关闭静态网站托管（除非业务需要）。
- 敏感文件加密、版本控制、访问日志。
- 禁止 `*` Principal；限制 Referer/签名 URL 有效期。

## 容器
```bash
docker ps --no-trunc
docker inspect <id> | jq '.[0].Config'
docker exec <id> ps aux
```
关注：
- `--privileged`、`--pid=host`、`--net=host`、挂载 `/var/run/docker.sock`、`/`。
- 容器内 root、可写根文件系统、异常外连。
- 镜像来源与漏洞（trivy/grype）。

## K8s
```bash
kubectl get pods -A -o wide
kubectl get clusterrolebinding -o wide
kubectl auth can-i --list
kubectl get events -A --sort-by=.lastTimestamp | tail -50
```
关注：
- 匿名访问/弱 RBAC、`system:anonymous` 绑定。
- privileged pod、hostPath、hostNetwork、hostPID。
- Secret 明文、镜像拉取密钥、API Server 公网暴露。
- 审计日志：exec/attach/port-forward、create pod、patch rolebinding。

## 加固
- NetworkPolicy 默认拒绝；Pod Security Standards；非 root/只读根。
- API Server 不暴露公网；启用审计；限制 exec。
- 镜像签名/扫描；Secret 加密；定期轮换。

## 事件处置
隔离受影响 Pod/节点 → 吊销 ServiceAccount Token → 轮换云凭据 → 审计影响范围 → 修复 → 回归。
