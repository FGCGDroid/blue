# 无人值守防御组

## 两种模式

```text
有人值守：只给 IP，人看着，审批后处置
无人值守：IP + SSH 私钥，部署 agent，本地 TTL 自动封禁
```

无人值守不是“没人审批”，而是：

```text
部署前一次人工审批
运行中在预设范围内自动处置
```

## 组成

```text
blue-agent.mjs
  tail 日志
  命中扫描器/敏感路径/集中登录失败
  nftables blue_guard 集合 TTL 600 秒
  事件推回 DSH /blue/collect

install-unattended.sh
  创建 nft table/set/chain
  安装 systemd
  写卸载脚本
```

## 安全边界

```text
默认 dry-run，只记录“会封谁”
显式 enforce 才真正 nft add element
只封 TCP 80/443 来源 IP
TTL 默认 600 秒，最大 3600 秒
私网/回环/白名单永不封
不碰 SSH
不接管 Nginx
不无限期封禁
```

## 部署流程

```text
blue_remote action=setup host=... user=root key_path=...
blue_remote action=prepare host=...
blue_task_approve task_id=...
blue_remote action=unattended task_id=... collector_url=http://DSH:端口 token=... engagement=ENG-... log=/www/wwwlogs/site.log allow_ips=办公IP,监控IP enforce=false
```

先 `enforce=false` 看 `/var/log/blue-agent.log`：

```text
would_block
```

确认没有误封后，再改：

```text
enforce=true
```

## 宝塔

```text
日志：/www/wwwlogs/站点.log
Node：/www/server/nodejs/*/bin/node
nftables 需要已安装
```

## 卸载

```bash
sudo bash /opt/blue-agent/uninstall.sh
```

只删除 `blue_guard` 表，不动其他 nftables 规则。

## 现状

```text
代码已加
没有真实服务器，未做真机验收
默认 dry-run，避免第一次就封错
```
